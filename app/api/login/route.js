import { NextResponse } from 'next/server'
import { authenticate, getUser, markLogin, publicUser } from '@/lib/desk/accounts'
import { deskBlocked } from '@/lib/desk/store'
import {
  SESSION_COOKIE,
  createSessionToken,
  getSession,
  sessionCookieOptions,
  verifySessionToken,
} from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Small brute-force brake: eight failed attempts per address every fifteen
 * minutes. In-memory is enough here — it resets on deploy and never gets in
 * the way of a legitimate editor who mistypes a password twice.
 */
const failures = new Map()
const WINDOW = 15 * 60 * 1000
const LIMIT = 8

function tooManyAttempts(email) {
  const entry = failures.get(email)
  if (!entry) return false
  if (Date.now() - entry.first > WINDOW) {
    failures.delete(email)
    return false
  }
  return entry.count >= LIMIT
}

function recordFailure(email) {
  const entry = failures.get(email)
  if (!entry || Date.now() - entry.first > WINDOW) {
    failures.set(email, { count: 1, first: Date.now() })
    return
  }
  entry.count += 1
}

/** Sign in and set the signed session cookie. */
export async function POST(request) {
  if (deskBlocked()) {
    return NextResponse.json(
      {
        error:
          'The desk cannot sign anyone in: no database credentials. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the server.',
      },
      { status: 503 }
    )
  }

  // The desk posts JSON, but a form submission has to work before hydration:
  // credentials in a form body never end up in the URL bar.
  const contentType = request.headers.get('content-type') || ''
  const fromForm = !contentType.includes('application/json')
  const payload = fromForm
    ? Object.fromEntries((await request.formData().catch(() => new FormData())).entries())
    : await request.json().catch(() => null)

  const email = String(payload?.email || '').trim().toLowerCase()
  const password = String(payload?.password || '')

  if (!email || !password) {
    if (fromForm) return NextResponse.redirect(new URL('/login?error=missing', request.url), 303)
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 })
  }

  if (tooManyAttempts(email)) {
    if (fromForm) return NextResponse.redirect(new URL('/login?error=throttled', request.url), 303)
    return NextResponse.json(
      { error: 'Too many attempts. Wait fifteen minutes and try again.' },
      { status: 429 }
    )
  }

  const user = await authenticate(email, password)

  if (user && user.blocked) {
    if (fromForm) return NextResponse.redirect(new URL('/login?error=inactive', request.url), 303)
    return NextResponse.json(
      { error: 'This account has been deactivated. Ask an administrator to restore it.' },
      { status: 403 }
    )
  }

  if (!user) {
    recordFailure(email)
    if (fromForm) return NextResponse.redirect(new URL('/login?error=invalid', request.url), 303)
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  failures.delete(email)
  await markLogin(user.id)

  const token = createSessionToken({ uid: user.id, role: user.role })
  const response = fromForm
    ? NextResponse.redirect(new URL('/desk', request.url), 303)
    : NextResponse.json({
        ok: true,
        user: publicUser(user),
        expiresAt: verifySessionToken(token).expiresAt,
      })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return response
}

/** Who is signed in, if anyone. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ valid: false }, { status: 401 })

  const user = await getUser(session.uid)
  if (!user || user.active === false) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  return NextResponse.json({
    valid: true,
    user: publicUser(user),
    expiresAt: session.expiresAt,
  })
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 })
  return response
}
