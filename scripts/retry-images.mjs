/** Retry helper for image topics that failed the first pass. */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'TrendingNewsKenya/1.0 (newsroom demo build; contact: newsroom@example.com)'
const TARGETS = [
  { slug: 'tea-farm', query: 'tea plantation Kericho', alt: 'A tea plantation in the Kenyan highlands' },
  { slug: 'football', query: 'Harambee Stars Kenya football', alt: 'Kenyan football fans' },
  { slug: 'concert', query: 'music festival Nairobi Kenya', alt: 'A live music crowd in Nairobi' },
  { slug: 'port', query: 'Mombasa port container', alt: 'The port of Mombasa' },
  { slug: 'health', query: 'Kenya health clinic', alt: 'A health clinic in Kenya' },
  { slug: 'parliament', query: 'Kenya parliament building', alt: 'The Parliament of Kenya in Nairobi' },
]
const stripTags = (s) =>
  String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const LICENCE_OK = /(public domain|cc0|cc[ -]by(-sa)?[ -]?\d|attribution|free art)/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  return res.json()
}

async function candidates(query) {
  const data = await api({
    action: 'query', generator: 'search', gsrsearch: `filetype:bitmap ${query}`,
    gsrlimit: '20', gsrnamespace: '6', prop: 'imageinfo',
    iiprop: 'url|size|extmetadata', iiurlwidth: '1600',
  })
  const pages = Object.values(data?.query?.pages || {}).sort((a, b) => a.index - b.index)
  return pages.map((p) => {
    const info = p.imageinfo?.[0]
    if (!info) return null
    const meta = info.extmetadata || {}
    const licence = stripTags(meta.LicenseShortName?.value)
    if (!LICENCE_OK.test(licence) || Math.min(info.width, info.height) < 800) return null
    return {
      title: p.title.replace(/^File:/, ''),
      thumb: info.thumburl?.replace(/\?.*$/, ''),
      source: info.descriptionurl,
      author: stripTags(meta.Artist?.value) || 'Wikimedia Commons contributor',
      licence,
      width: info.width,
      height: info.height,
    }
  }).filter(Boolean)
}

const creditsPath = path.join(process.cwd(), 'content', 'image-credits.json')
const credits = JSON.parse(await readFile(creditsPath, 'utf8'))
await mkdir(path.join(process.cwd(), 'public', 'images'), { recursive: true })

for (const t of TARGETS) {
  const tries = await candidates(t.query).catch(() => [])
  let saved = false
  for (const c of tries.slice(0, 6)) {
    try {
      const res = await fetch(c.thumb, {
        headers: { 'User-Agent': UA, Referer: 'https://commons.wikimedia.org/' },
      })
      if (!res.ok) throw new Error(String(res.status))
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 30_000) throw new Error('too small')
      await writeFile(path.join(process.cwd(), 'public', 'images', `${t.slug}.jpg`), buf)
      credits[t.slug] = {
        file: `/images/${t.slug}.jpg`, alt: t.alt, title: c.title, author: c.author,
        licence: c.licence, source: c.source, bytes: buf.length,
      }
      console.log(`✓ ${t.slug}: ${c.title} — ${c.licence}`)
      saved = true
      break
    } catch (e) {
      console.log(`  ${t.slug}: ${c.title} → ${e.message}`)
    }
    await sleep(400)
  }
  if (!saved) console.log(`✗ ${t.slug}: nothing usable`)
  await sleep(800)
}
await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n')
