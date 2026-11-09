/** Final artwork pass: continental / world imagery for the Africa and World desks. */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const UA = 'TrendingNewsKenya/1.0 (newsroom demo build)'
const TARGETS = [
  { slug: 'africa-union', q: 'African Union headquarters Addis Ababa', alt: 'The African Union headquarters in Addis Ababa' },
  { slug: 'world', q: 'United Nations General Assembly hall', alt: 'The United Nations General Assembly hall' },
  { slug: 'markets', q: 'stock exchange trading floor', alt: 'A stock exchange trading floor' },
  { slug: 'kenya-flag', q: 'Kenya flag', alt: 'The flag of Kenya' },
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const creditsPath = path.join(process.cwd(), 'content', 'image-credits.json')
const credits = JSON.parse(await readFile(creditsPath, 'utf8'))
await mkdir(path.join(process.cwd(), 'public', 'images'), { recursive: true })

for (const t of TARGETS) {
  await sleep(2500)
  let results = []
  try {
    const url =
      'https://api.openverse.org/v1/images/?' +
      new URLSearchParams({ q: t.q, page_size: '6', license: 'cc0,by,by-sa,pdm', size: 'large' })
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`Openverse ${res.status}`)
    results = (await res.json()).results || []
  } catch (e) {
    console.log(`✗ ${t.slug}: ${e.message}`)
    continue
  }
  const usable = results.filter(
    (r) => r.width >= 1200 && r.height >= 700 && /jpe?g|png|webp/i.test(r.filetype || '')
  )
  let saved = false
  for (const r of usable.slice(0, 2)) {
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(String(res.status))
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 40_000) throw new Error('too small')
      await writeFile(path.join(process.cwd(), 'public', 'images', `${t.slug}.jpg`), buf)
      credits[t.slug] = {
        file: `/images/${t.slug}.jpg`, alt: t.alt, title: r.title || t.alt,
        author: r.creator || 'Unknown',
        licence: `${(r.license || 'cc').toUpperCase()} ${r.license_version || ''}`.trim(),
        source: r.foreign_landing_url || r.detail_url, bytes: buf.length,
      }
      saved = true
      console.log(`✓ ${t.slug}: ${r.title} — ${r.creator} (${r.license})`)
      break
    } catch (e) {
      console.log(`  ${t.slug}: ${r.title} → ${e.message}`)
    }
    await sleep(600)
  }
  if (!saved) console.log(`✗ ${t.slug}: no usable result`)
}

await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n')
