import { NextResponse } from 'next/server'
import { apiUser, notWritableResponse } from '@/lib/desk/guard'
import { syncWire } from '@/lib/wire-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Admin-only: pull the RSS feeds into Firestore immediately. */
export async function POST() {
  const { response } = await apiUser({ role: 'admin' })
  if (response) return response

  const blocked = notWritableResponse()
  if (blocked) return blocked

  const result = await syncWire({ force: true })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
