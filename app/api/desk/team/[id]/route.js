import { NextResponse } from 'next/server'
import { deleteUser, getUser, setActive, setPassword, updateUser } from '@/lib/desk/accounts'
import { apiUser, notWritableResponse } from '@/lib/desk/guard'
import { readCollection } from '@/lib/desk/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Change a colleague's name, title, email, role, password or access. */
export async function PATCH(request, { params }) {
  const { user: actor, response } = await apiUser({ role: 'admin' })
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const { id } = await params
  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })

  if (typeof payload.active === 'boolean') {
    if (payload.active === false && id === actor.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 }
      )
    }
    const result = await setActive(id, payload.active, actor)
    if (!result.ok) {
      return NextResponse.json({ error: result.errors.form }, { status: 422 })
    }
  }

  if (payload.password) {
    const result = await setPassword(id, payload.password)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Check the highlighted fields.', errors: result.errors },
        { status: 422 }
      )
    }
  }

  if (payload.name !== undefined || payload.email !== undefined || payload.title !== undefined || payload.role !== undefined) {
    const result = await updateUser(id, payload, actor)
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Check the highlighted fields.', errors: result.errors },
        { status: 422 }
      )
    }
  }

  const user = await getUser(id)
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  const { passwordHash, ...safe } = user
  return NextResponse.json({ user: safe })
}

/** Remove an account that has never filed a story. */
export async function DELETE(request, { params }) {
  const { user: actor, response } = await apiUser({ role: 'admin' })
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const { id } = await params
  if (id === actor.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  const stories = await readCollection('articles')
  const storyCount = stories.filter((story) => story.authorUid === id).length
  const result = await deleteUser(id, { storyCount })
  if (!result.ok) {
    return NextResponse.json({ error: result.errors.form }, { status: 422 })
  }

  return NextResponse.json({ ok: true })
}
