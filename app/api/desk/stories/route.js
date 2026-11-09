import { NextResponse } from 'next/server'
import { apiUser, notWritableResponse } from '@/lib/desk/guard'
import { createStory, listStories } from '@/lib/desk/stories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Stories the caller is allowed to see in the desk. */
export async function GET(request) {
  const { user, response } = await apiUser()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const section = searchParams.get('section') || ''
  const q = searchParams.get('q') || ''
  const mine = searchParams.get('mine') === '1'

  const stories = await listStories({
    status,
    section: section || undefined,
    q: q || undefined,
    authorUid: mine ? user.id : undefined,
  })

  return NextResponse.json({ stories })
}

/** Create a draft. Everyone with a desk account can write. */
export async function POST(request) {
  const { user, response } = await apiUser()
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const payload = await request.json().catch(() => null)
  if (!payload) {
    return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })
  }

  const result = await createStory(payload, user)
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Check the highlighted fields.', errors: result.errors },
      { status: 422 }
    )
  }

  return NextResponse.json({ story: result.story }, { status: 201 })
}
