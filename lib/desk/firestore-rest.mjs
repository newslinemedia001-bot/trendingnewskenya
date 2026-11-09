/**
 * Firestore over its REST API — no `firebase-admin`, no `@google-cloud/*`, no
 * gRPC. The only things it needs are Node's built-in `crypto` (to sign the
 * service-account JWT) and `fetch` (to exchange it for an access token and to
 * call the Firestore v1 API).
 *
 * Credentials, in order:
 *   FIREBASE_SERVICE_ACCOUNT=./secrets/serviceAccount.json   (path or inline JSON)
 *   GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json
 *   secrets/serviceAccount.json, then serviceAccount.json
 *
 * Documents are plain JSON: dates are ISO-8601 strings, never Firestore
 * Timestamps, so nothing in the app has to know about the transport.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { createSign } from 'node:crypto'

const SCOPE = 'https://www.googleapis.com/auth/datastore'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_KEY_PATHS = ['secrets/serviceAccount.json', 'serviceAccount.json']
const PAGE_SIZE = 300

/** Where the service-account key lives, or null when none is configured. */
export function credentialPath() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (raw) return raw
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (fromEnv) return fromEnv
  for (const candidate of DEFAULT_KEY_PATHS) {
    if (existsSync(path.join(process.cwd(), candidate))) return candidate
  }
  return null
}

export function hasAdminCredentials() {
  return Boolean(credentialPath())
}

/** The parsed service account, or null when no key is configured. */
export function serviceAccount() {
  const raw = credentialPath()
  if (!raw) return null
  const value = raw.trim()
  if (value.startsWith('{')) {
    try {
      return JSON.parse(value)
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.')
    }
  }
  const file = path.isAbsolute(value) ? value : path.join(process.cwd(), value)
  if (!existsSync(file)) {
    throw new Error(
      `The service-account key was not found at ${file}. Download one from Firebase console → Project settings → Service accounts.`
    )
  }
  return JSON.parse(readFileSync(file, 'utf8'))
}

function projectId(account) {
  return (
    account?.project_id ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    null
  )
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Service-account JWTs are stamped with the machine clock, and Google rejects
 * anything more than a few minutes out of step. Ask Google for the time once
 * per process so a laptop with a drifting clock can still use the desk.
 */
async function serverTime() {
  const local = Math.floor(Date.now() / 1000)
  if (globalThis.__tnkClockOffset !== undefined) return local + globalThis.__tnkClockOffset
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    const header = response.headers.get('date')
    const remote = header ? Math.floor(new Date(header).getTime() / 1000) : NaN
    const offset = Number.isFinite(remote) ? remote - local : 0

    globalThis.__tnkClockOffset = Math.abs(offset) > 120 ? offset : 0
  } catch {
    globalThis.__tnkClockOffset = 0
  }
  return local + globalThis.__tnkClockOffset
}

/**
 * fetch with a couple of retries for the kind of network wobble that is
 * common on slow connections: connect/reset errors and 5xx responses.
 */
async function fetchWithRetry(url, init, attempts = 3) {
  let lastError = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, init)
      if (response.status >= 500 && attempt < attempts - 1) {
        lastError = new Error(`Firestore responded ${response.status}`)
        await sleep(400 * 2 ** attempt)
        continue
      }
      return response
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) await sleep(400 * 2 ** attempt)
    }
  }
  throw lastError
}

async function accessToken(account) {
  const cache = (globalThis.__tnkTokenCache ||= {})
  const now = await serverTime()
  const key = account.client_email || account.private_key_id || 'default'
  const cached = cache[key]
  if (cached && cached.expiresAt > now + 60) return cached.token

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  signer.end()
  const signature = signer
    .sign(String(account.private_key).replace(/\\n/g, '\n'))
    .toString('base64url')

  const response = await fetchWithRetry(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body.error_description || body.error || response.statusText
    throw new Error(`Google token exchange failed (${response.status}): ${detail}`)
  }
  cache[key] = { token: body.access_token, expiresAt: now + (body.expires_in || 3600) }
  return body.access_token
}

/** Absolute URL for a collection path, e.g. 'articles' or 'articles/abc'. */
async function documentsUrl(suffix = '') {
  const account = serviceAccount()
  if (!account) {
    throw new Error(
      'No Firestore credentials: add a service-account key to FIREBASE_SERVICE_ACCOUNT in .env.local and restart the server.'
    )
  }
  const project = projectId(account)
  if (!project) throw new Error('The service-account key has no project_id.')
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    project
  )}/databases/(default)/documents`
  // A suffix starting with ':' is a collection-group method on the parent
  // (documents:runQuery), so it must not get an extra slash.
  const separator = suffix.startsWith(':') ? '' : '/'
  return { url: suffix ? `${root}${separator}${suffix}` : root, account }
}

async function request(urlBuilder, init = {}, { allowMissing = false } = {}) {
  const send = async (token) => {
    const { url } = await documentsUrl(urlBuilder)
    return fetchWithRetry(url, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
      cache: 'no-store',
    })
  }

  let { account } = await documentsUrl(urlBuilder)
  let response = await send(await accessToken(account))

  if (response.status === 401) {
    // A cached token can be revoked or expire early; sign a fresh one once.
    delete (globalThis.__tnkTokenCache ||= {})[account.client_email]
    response = await send(await accessToken(account))
  }

  if (allowMissing && response.status === 404) return null
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Firestore ${init.method || 'GET'} ${urlBuilder} failed (${response.status}): ${body}`)
  }
  const text = await response.text().catch(() => '')
  return text ? JSON.parse(text) : {}
}

/* ---------- value encoding ---------- */

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } }
  return { nullValue: null }
}

function encodeFields(data) {
  const fields = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined) continue
    fields[key] = encodeValue(value)
  }
  return fields
}

function decodeValue(value) {
  if (!value || typeof value !== 'object') return null
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {})
  if ('referenceValue' in value) return value.referenceValue
  if ('geoPointValue' in value) return value.geoPointValue
  if ('bytesValue' in value) return value.bytesValue
  return null
}

function decodeFields(fields) {
  const data = {}
  for (const [key, value] of Object.entries(fields || {})) data[key] = decodeValue(value)
  return data
}

function decodeDocument(document) {
  if (!document?.name) return null
  const id = String(document.name).split('/').pop()
  return { id, ...decodeFields(document.fields) }
}

const OPERATORS = {
  '==': 'EQUAL',
  '!=': 'NOT_EQUAL',
  '<': 'LESS_THAN',
  '<=': 'LESS_THAN_OR_EQUAL',
  '>': 'GREATER_THAN',
  '>=': 'GREATER_THAN_OR_EQUAL',
  in: 'IN',
  'not-in': 'NOT_IN',
  'array-contains': 'ARRAY_CONTAINS',
  'array-contains-any': 'ARRAY_CONTAINS_ANY',
}

/* ---------- public API ---------- */

/** Every document in a collection, optionally filtered by one equality-style clause. */
export async function readCollection(name, where = null) {
  if (where) {
    const operator = OPERATORS[where.op || '==']
    if (!operator) throw new Error(`Unsupported Firestore operator: ${where.op}`)
    const entries = await request(':runQuery', {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: name }],
          where: {
            fieldFilter: {
              field: { fieldPath: where.field },
              op: operator,
              value: encodeValue(where.value),
            },
          },
          limit: where.limit || 500,
        },
      }),
    })
    return (entries || [])
      .map((entry) => decodeDocument(entry.document))
      .filter(Boolean)
  }

  const documents = []
  let pageToken = null
  do {
    const query = new URLSearchParams({ pageSize: String(PAGE_SIZE) })
    if (pageToken) query.set('pageToken', pageToken)
    const page = await request(`${encodeURIComponent(name)}?${query}`, {}, { allowMissing: true })
    if (!page) break
    for (const document of page.documents || []) {
      const decoded = decodeDocument(document)
      if (decoded) documents.push(decoded)
    }
    pageToken = page.nextPageToken || null
  } while (pageToken)

  return documents
}

/** One document, or null when it does not exist. */
export async function readDoc(name, id) {
  if (!id) return null
  const document = await request(
    `${encodeURIComponent(name)}/${encodeURIComponent(id)}`,
    {},
    { allowMissing: true }
  )
  return decodeDocument(document)
}

/**
 * Write a document. `merge: true` (the default) updates the given fields and
 * leaves the rest alone; `merge: false` replaces the document outright.
 */
export async function writeDoc(name, id, data, { merge = true } = {}) {
  if (!hasAdminCredentials()) {
    throw new Error(
      'No Firestore credentials: add a service-account key to FIREBASE_SERVICE_ACCOUNT in .env.local and restart the server.'
    )
  }
  const query = new URLSearchParams()
  if (merge) {
    for (const field of Object.keys(data || {})) {
      if (data[field] === undefined) continue
      query.append('updateMask.fieldPaths', field)
    }
  }
  const suffix = `${encodeURIComponent(name)}/${encodeURIComponent(id)}${
    query.toString() ? `?${query}` : ''
  }`
  await request(
    suffix,
    { method: 'PATCH', body: JSON.stringify({ fields: encodeFields(data) }) },
    { allowMissing: false }
  )
  return id
}

/** Delete a document; deleting something already gone is not an error. */
export async function deleteDoc(name, id) {
  if (!hasAdminCredentials()) {
    throw new Error(
      'No Firestore credentials: add a service-account key to FIREBASE_SERVICE_ACCOUNT in .env.local and restart the server.'
    )
  }
  await request(
    `${encodeURIComponent(name)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    { allowMissing: true }
  )
  return true
}
