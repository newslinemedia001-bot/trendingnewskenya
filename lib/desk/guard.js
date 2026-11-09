/**
 * Authorisation helpers shared by desk pages and API routes.
 *
 * The cookie only says *who* is asking. Who they are is always re-read from
 * the store, so a deactivated account or a changed role applies immediately.
 */
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/desk/accounts'
import { canWrite } from '@/lib/desk/store'
import { getSession } from '@/lib/session'

/** A ready-made 503 for any route that needs to write to the database. */
export function notWritableResponse() {
  if (canWrite()) return null
  return Response.json(
    {
      error:
        'The desk cannot save: no database credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.',
    },
    { status: 503 }
  )
}

/** The signed-in account without its password hash, or null. */
export async function currentUser() {
  const session = await getSession()
  if (!session?.uid) return null
  const user = await getUser(session.uid)
  if (!user || user.active === false) return null
  const { passwordHash, ...safe } = user
  return safe
}

/** Page guard: bounces to the sign-in page. */
export async function requireUser() {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}

/** Page guard for admin-only screens. */
export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/desk')
  return user
}

/**
 * Route guard. Returns `{ user }` or `{ response }` with a ready-made JSON
 * error, so handlers stay flat:
 *
 *   const { user, response } = await apiUser()
 *   if (response) return response
 */
export async function apiUser({ role } = {}) {
  const session = await getSession()
  if (!session?.uid) {
    return {
      response: Response.json({ error: 'Sign in to use the desk.' }, { status: 401 }),
    }
  }

  const user = await getUser(session.uid)
  if (!user || user.active === false) {
    return {
      response: Response.json({ error: 'This account is no longer active.' }, { status: 401 }),
    }
  }

  if (role && user.role !== role) {
    return {
      response: Response.json(
        { error: 'Only administrators can do that.' },
        { status: 403 }
      ),
    }
  }

  const { passwordHash, ...safe } = user
  return { user: safe }
}
