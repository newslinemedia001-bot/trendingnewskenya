/**
 * Daily RSS refresh.
 *
 * Netlify runs this function on the schedule below; it calls the site's own
 * `/api/wire/cron` route, which performs the sync with the service-role key on
 * the server. Nothing about the refresh depends on a reader opening a page.
 *
 * Needs two site environment variables:
 *   CRON_SECRET   any long random string, shared with /api/wire/cron
 *   URL           set automatically by Netlify to the site's main URL
 *
 * Editors can still pull the feeds immediately with the refresh button in the
 * desk, which forces a run regardless of the daily throttle.
 */
export const config = {
  // 04:10 East Africa Time (01:10 UTC) — before the morning commute.
  schedule: '10 1 * * *',
}

export default async () => {
  const site = process.env.URL || process.env.DEPLOY_PRIME_URL
  const secret = process.env.CRON_SECRET

  if (!site || !secret) {
    console.log('wire-daily: skipped — set CRON_SECRET in the site environment.')
    return new Response('skipped', { status: 200 })
  }

  try {
    const response = await fetch(`${site}/api/wire/cron`, {
      headers: { authorization: `Bearer ${secret}` },
    })
    const body = await response.text()
    console.log(`wire-daily: ${response.status} ${body.slice(0, 300)}`)
    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('wire-daily failed:', error?.message || error)
    return new Response('failed', { status: 200 })
  }
}
