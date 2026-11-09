/**
 * Editorial session cookie.
 *
 * The token is a signed, self-contained value (account id, role and expiry),
 * so a restarted dev server or a second instance never loses a signed-in
 * editor. It carries no password material.
 *
 * The role inside the token is a convenience for rendering only: every page
 * and route that matters re-reads the account from the store, so a role change
 * or a deactivation takes effect on the next request.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'tnk_editor'
export const SESSION_MAX_AGE = 60 * 60 * 8 // a working day, in seconds

function secret() {
  const value = process.env.LOGIN_SECRET
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(
      'LOGIN_SECRET must be set in production: it signs every editorial session cookie.'
    )
  }
  return value || 'trending-news-kenya-local-editor-secret'
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionToken({ uid, role }) {
  const payload = Buffer.from(
    JSON.stringify({ uid, role, exp: Date.now() + SESSION_MAX_AGE * 1000 })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Returns `{ uid, role, expiresAt }` for a valid token, otherwise `null`. */
export function verifySessionToken(token) {
  if (!token) return null
  const [payload, signature] = String(token).split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const given = Buffer.from(signature)
  const want = Buffer.from(expected)
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.uid || !data?.exp || data.exp < Date.now()) return null
    return {
      uid: data.uid,
      role: data.role,
      expiresAt: new Date(data.exp).toISOString(),
    }
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

/** The raw token claims. Prefer requireUser() for anything that authorises. */
export async function getSession() {
  const store = await cookies()
  return verifySessionToken(store.get(SESSION_COOKIE)?.value)
}
