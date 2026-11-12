/**
 * IndexNow — push changed URLs to Bing, DuckDuckGo, Yahoo, Yandex and Seznam.
 *
 * Those engines share the IndexNow protocol (DuckDuckGo and Yahoo serve Bing's
 * index), so a single submission notifies all of them. The key is public by
 * design: ownership is proved by serving the same key at /<key>.txt.
 */
import { siteUrl } from '@/lib/site'

const KEY = 'dcde53d68649aff35d3bb6a1b62718f5'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

/**
 * Submit up to 1000 absolute URLs. Returns `{ ok }` and never throws, so a
 * search-engine hiccup can never break a page render or the wire sync.
 */
export async function submitToIndexNow(urls = []) {
  const list = [...new Set(urls.filter((u) => typeof u === 'string' && u.startsWith('https://')))].slice(
    0,
    1000
  )
  if (!list.length) return { ok: false, reason: 'nothing-to-submit' }

  const base = siteUrl()

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(base).hostname,
        key: KEY,
        keyLocation: `${base}/${KEY}.txt`,
        urlList: list,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    return { ok: response.ok, status: response.status, submitted: list.length }
  } catch (error) {
    return { ok: false, reason: error?.message || 'indexnow-failed', submitted: 0 }
  }
}
