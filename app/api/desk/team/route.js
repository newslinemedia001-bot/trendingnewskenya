import { NextResponse } from 'next/server'
import { createUser, listUsers, publicUser } from '@/lib/desk/accounts'
import { apiUser, notWritableResponse } from '@/lib/desk/guard'
import { readCollection } from '@/lib/desk/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The staff list, with a story count per account. Admins only. */
export async function GET() {
  const { response } = await apiUser({ role: 'admin' })
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const [users, allStories] = await Promise.all([listUsers(), readCollection('articles')])
  const stories = allStories.filter((story) => !story.wire)
  const counts = stories.reduce((map, story) => {
    map[story.authorUid] = (map[story.authorUid] || 0) + 1
    return map
  }, {})
  const published = stories.reduce((map, story) => {
    if (story.status === 'published') map[story.authorUid] = (map[story.authorUid] || 0) + 1
    return map
  }, {})

  return NextResponse.json({
    team: users.map((user) => ({
      ...publicUser(user),
      stories: counts[user.id] || 0,
      published: published[user.id] || 0,
    })),
  })
}

/** Create a staff account. Admins only. */
export async function POST(request) {
  const { user, response } = await apiUser({ role: 'admin' })
  if (response) return response
  const blocked = notWritableResponse()
  if (blocked) return blocked

  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })

  const result = await createUser({ ...payload, actor: user })
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Check the highlighted fields.', errors: result.errors },
      { status: 422 }
    )
  }

  return NextResponse.json({ user: result.user }, { status: 201 })
}
