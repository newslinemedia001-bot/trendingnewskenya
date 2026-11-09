import { NextResponse } from 'next/server'
import { canDelete, canEdit, deleteStory, getStory, updateStory } from '@/lib/desk/stories'
import { apiUser, notWritableResponse } from '@/lib/desk/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { user, response } = await apiUser()
  if (response) return response

  const { id } = await params
  const story = await getStory(id)
  if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 })
  if (!canEdit(user, story) && story.authorUid !== user.id) {
    return NextResponse.json({ error: 'You cannot read this story.' }, { status: 403 })
  }

  return NextResponse.json({ story })
}

/** Save, submit for review, publish or unpublish. */
export async function PATCH(request, { params }) {
  const { user, response } = await apiUser()
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const { id } = await params
  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })

  const result = await updateStory(id, payload, user)
  if (!result.ok) {
    return NextResponse.json(
      { error: 'That change could not be saved.', errors: result.errors },
      { status: result.status || 422 }
    )
  }

  return NextResponse.json({ story: result.story })
}

export async function DELETE(request, { params }) {
  const { user, response } = await apiUser()
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const { id } = await params
  const story = await getStory(id)
  if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 })
  if (!canDelete(user, story)) {
    return NextResponse.json({ error: 'You cannot delete this story.' }, { status: 403 })
  }

  const result = await deleteStory(id, user)
  if (!result.ok) {
    return NextResponse.json({ error: 'That story could not be deleted.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
