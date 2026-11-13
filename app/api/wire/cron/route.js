import { NextResponse } from 'next/server'
import { syncWire } from '@/lib/wire-sync'
import { canWrite } from '@/lib/desk/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The scheduled wire refresh.
 *
 * Called once a day by `netlify/functions/wire-daily.mjs`. Readers never hit
 * this route, so the stored archive only changes on the daily run or when an
 * editor presses refresh in the desk.
 *
 * Guarded by CRON_SECRET: without the variable the route refuses to run rather
 * than leave an unauthenticated write on the public internet.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Set CRON_SECRET in the site environment to enable the daily wire refresh.' },
      { status: 503 }
    )
  }

  const header = request.headers.get('authorization') || ''
  const provided = header.replace(/^Bearer\s+/i, '') || new URL(request.url).searchParams.get('secret')
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canWrite()) {
    return NextResponse.json({ error: 'No database credentials.' }, { status: 503 })
  }

  const result = await syncWire({ force: true })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
