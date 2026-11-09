import { NextResponse } from 'next/server'
import { getUser, setPassword, verifyPassword } from '@/lib/desk/accounts'
import { apiUser, notWritableResponse } from '@/lib/desk/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Change your own password. */
export async function PATCH(request) {
  const { user, response } = await apiUser()
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const payload = await request.json().catch(() => null)
  const current = String(payload?.currentPassword || '')
  const next = String(payload?.newPassword || '')

  if (next.length < 8) {
    return NextResponse.json(
      { error: 'Check the highlighted fields.', errors: { newPassword: 'Use at least 8 characters.' } },
      { status: 422 }
    )
  }

  const record = await getUser(user.id)
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    return NextResponse.json(
      { error: 'Check the highlighted fields.', errors: { currentPassword: 'That is not your current password.' } },
      { status: 422 }
    )
  }

  const result = await setPassword(user.id, next)
  if (!result.ok) {
    return NextResponse.json({ error: 'That password could not be saved.' }, { status: 422 })
  }

  return NextResponse.json({ ok: true })
}
