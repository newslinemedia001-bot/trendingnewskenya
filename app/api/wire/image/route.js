/**
 * Same-origin proxy for publisher images.
 *
 * Wire stories keep the publisher's own image URL, but several publishers
 * refuse direct hotlinks (Nation Africa answers 403 without a referer). This
 * route fetches the image server-side with a browser-like request and streams
 * it back, so every wire card and article still shows the picture the
 * publisher supplied.
 *
 * Only hosts belonging to the publishers we syndicate are allowed, so the
 * route cannot be used as an open proxy.
 */
const ALLOWED_HOSTS = [
  'nation.africa',
  'standardmedia.co.ke',
  'bbci.co.uk',
  'bbcimg.co.uk',
  'bbc.co.uk',
  'bbc.com',
  'aljazeera.com',
  'aljazeera.net',
]

const REFERERS = [
  ['nation.africa', 'https://nation.africa/'],
  ['standardmedia.co.ke', 'https://www.standardmedia.co.ke/'],
  ['bbci.co.uk', 'https://www.bbc.co.uk/'],
  ['bbcimg.co.uk', 'https://www.bbc.co.uk/'],
  ['bbc.co.uk', 'https://www.bbc.co.uk/'],
  ['bbc.com', 'https://www.bbc.com/'],
  ['aljazeera.com', 'https://www.aljazeera.com/'],
  ['aljazeera.net', 'https://www.aljazeera.com/'],
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const MAX_BYTES = 15 * 1024 * 1024

function allowedHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return ALLOWED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function refererFor(hostname) {
  const host = String(hostname || '').toLowerCase()
  const match = REFERERS.find(([domain]) => host === domain || host.endsWith(`.${domain}`))
  return match ? match[1] : null
}

export const runtime = 'nodejs'
export const revalidate = 86400

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url')

  if (!raw) return new Response('Missing image url.', { status: 400 })

  let target
  try {
    target = new URL(raw)
  } catch {
    return new Response('Invalid image url.', { status: 400 })
  }

  if (target.protocol !== 'https:' || !allowedHost(target.hostname)) {
    return new Response('Image host is not allowed.', { status: 403 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-KE,en;q=0.9',
        Referer: refererFor(target.hostname) || `${target.origin}/`,
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })

    if (!upstream.ok) {
      return new Response('Publisher image unavailable.', { status: 502 })
    }

    const type = upstream.headers.get('content-type') || ''
    if (!type.startsWith('image/')) {
      return new Response('Publisher did not return an image.', { status: 502 })
    }

    const bytes = await upstream.arrayBuffer()
    if (bytes.byteLength > MAX_BYTES) {
      return new Response('Image is too large.', { status: 502 })
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Could not fetch the publisher image.', { status: 502 })
  }
}
