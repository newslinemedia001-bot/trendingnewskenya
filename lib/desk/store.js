/**
 * Server-side data access for the newsroom — Supabase Postgres.
 *
 * Every page, route handler and the wire sync read and write through the four
 * functions at the bottom of this file, so the storage engine is a detail of
 * this module alone. Documents are plain JSON rows: dates are ISO-8601 strings
 * and `tags` is a text array, matching the shapes the rest of the app expects.
 *
 * Tables live in the `public` schema with a `tnk_` prefix (see scripts/supabase-schema.sql):
 *   tnk_articles        published, draft and wire stories
 *   tnk_authors         public bylines, keyed by slug
 *   tnk_users           desk accounts, including scrypt password hashes
 *   tnk_newsletter_signups  email opt-ins
 *
 * Access is service-role only, from the server. No key reaches the browser.
 */
import { describeError, supabaseAdmin, supabaseConfigured } from '@/lib/supabase'

const TABLES = new Set(['articles', 'authors', 'users', 'newsletter_signups'])

/** PostgREST caps a response at 1000 rows by default, so read in pages. */
const PAGE_SIZE = 1000

function table(name) {
  if (!TABLES.has(name)) throw new Error(`Unknown collection: ${name}`)
  return `tnk_${name}`
}

function client() {
  const db = supabaseAdmin()
  if (!db) {
    throw new Error(
      'No database credentials: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.'
    )
  }
  return db
}

/** Where the credentials come from, for setup hints. Never the key itself. */
export function credentialPath() {
  return supabaseConfigured() ? 'SUPABASE_SERVICE_ROLE_KEY' : null
}

/** True when the server holds a working service-role key. */
export function hasAdminCredentials() {
  return supabaseConfigured()
}

/** Kept for callers that only want to know whether writes are possible. */
export function storeMode() {
  return supabaseConfigured() ? 'admin' : 'read-only'
}

export function canWrite() {
  return supabaseConfigured()
}

/** True when the desk has no database credentials yet. */
export function deskBlocked() {
  return !canWrite()
}

const OPERATORS = {
  '==': 'eq',
  '!=': 'neq',
  '<': 'lt',
  '<=': 'lte',
  '>': 'gt',
  '>=': 'gte',
  in: 'in',
  'not-in': 'not.in',
}

function applyWhere(query, where) {
  const method = OPERATORS[where.op || '==']
  if (!method) throw new Error(`Unsupported filter operator: ${where.op}`)
  return query[method](where.field, where.value)
}

/** Every row in a collection, optionally filtered by one clause. */
export async function readCollection(name, where = null) {
  const db = client()
  const rows = []

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = db.from(table(name)).select('*')
    if (where) query = applyWhere(query, where)
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${name}: ${describeError(error)}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }

  return rows
}

/** One row by id, or null when it does not exist. */
export async function readDoc(name, id) {
  if (!id) return null
  const db = client()
  const { data, error } = await db.from(table(name)).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`${name}/${id}: ${describeError(error)}`)
  return data || null
}

/**
 * Insert or update one row.
 *
 * `merge: true` (the default) updates only the columns given, leaving the rest
 * of the row alone; `merge: false` is used when a caller writes a whole record
 * (a new story or account) and behaves the same way for a first insert.
 */
export async function writeDoc(name, id, data, { merge = true } = {}) {
  if (!hasAdminCredentials()) {
    throw new Error(
      'No database credentials: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.'
    )
  }
  if (!id) throw new Error(`writeDoc(${name}) needs an id`)

  const payload = { id }
  for (const [key, value] of Object.entries(data || {})) {
    if (key === 'id' || value === undefined) continue
    payload[key] = value
  }

  const db = client()
  const { error } = await db
    .from(table(name))
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
  if (error) throw new Error(`${name}/${id}: ${describeError(error)}`)

  void merge
  return id
}

/** Delete one row; deleting something already gone is not an error. */
export async function deleteDoc(name, id) {
  if (!hasAdminCredentials()) {
    throw new Error(
      'No database credentials: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.'
    )
  }
  const db = client()
  const { error } = await db.from(table(name)).delete().eq('id', id)
  if (error) throw new Error(`${name}/${id}: ${describeError(error)}`)
  return true
}
