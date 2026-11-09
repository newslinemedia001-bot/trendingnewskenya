/**
 * Second-pass artwork: Openverse (CC-licensed) for topics where the first
 * Wikimedia search returned the wrong subject. Writes into the same credit map.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const UA = 'TrendingNewsKenya/1.0 (newsroom demo build)'
const TARGETS = [
  { slug: 'parliament', q: 'Kenya parliament building Nairobi', alt: 'The Parliament of Kenya in Nairobi' },
  { slug: 'nairobi-street', q: 'Nairobi street scene', alt: 'A street in downtown Nairobi' },
  { slug: 'tea-farm', q: 'tea plantation Kericho', alt: 'A tea plantation in the Kenyan highlands' },
  { slug: 'football', q: 'Kenya football fans', alt: 'Kenyan football supporters' },
  { slug: 'music', q: 'Sauti Sol', alt: 'A Kenyan band performing live' },
  { slug: 'coast', q: 'Diani Beach Kenya', alt: 'The Indian Ocean at Diani Beach' },
  { slug: 'students', q: 'University of Nairobi', alt: 'Students at the University of Nairobi' },
  { slug: 'port', q: 'Mombasa port', alt: 'The port of Mombasa' },
  { slug: 'finance', q: 'Nairobi central business district', alt: 'Office towers in Nairobi’s central business district' },
  { slug: 'health', q: 'Kenya hospital nurse', alt: 'A health worker at a Kenyan hospital' },
  { slug: 'wildlife', q: 'Nairobi National Park', alt: 'Wildlife in Nairobi National Park' },
  { slug: 'culture', q: 'Kenya traditional dancers', alt: 'Traditional dancers in Kenya' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(q) {
  const url =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({
      q,
      page_size: '8',
      license: 'cc0,by,by-sa,pdm',
      size: 'large',
      mature: 'false',
    })
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Openverse ${res.status}`)
  return (await res.json()).results || []
}

const creditsPath = path.join(process.cwd(), 'content', 'image-credits.json')
const credits = JSON.parse(await readFile(creditsPath, 'utf8'))
await mkdir(path.join(process.cwd(), 'public', 'images'), { recursive: true })

for (const t of TARGETS) {
  let results = []
  try {
    results = await search(t.q)
  } catch (e) {
    console.log(`✗ ${t.slug}: ${e.message}`)
    continue
  }
  const usable = results.filter(
    (r) =>
      r.width >= 1200 &&
      r.height >= 700 &&
      /jpe?g|png|webp/i.test(r.filetype || '') &&
      !/\.svg/i.test(r.url)
  )
  let saved = false
  for (const r of usable.slice(0, 3)) {
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(String(res.status))
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 40_000) throw new Error('too small')
      await writeFile(path.join(process.cwd(), 'public', 'images', `${t.slug}.jpg`), buf)
      credits[t.slug] = {
        file: `/images/${t.slug}.jpg`,
        alt: t.alt,
        title: r.title || t.alt,
        author: r.creator || 'Unknown',
        licence: `${(r.license || 'cc').toUpperCase()} ${r.license_version || ''}`.trim(),
        source: r.foreign_landing_url || r.detail_url,
        bytes: buf.length,
      }
      saved = true
      console.log(`✓ ${t.slug}: ${r.title} — ${r.creator} (${r.license})`)
      break
    } catch (e) {
      console.log(`  ${t.slug}: ${r.title} → ${e.message}`)
    }
    await sleep(300)
  }
  if (!saved) console.log(`✗ ${t.slug}: no usable result`)
  await sleep(600)
}

await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n')
