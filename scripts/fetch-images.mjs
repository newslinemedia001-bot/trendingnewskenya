/**
 * Downloads freely licensed photography from Wikimedia Commons for the demo
 * newsroom and writes attribution metadata to content/image-credits.json.
 *
 *   npm run fetch:images
 *
 * Images are used only as demo editorial artwork. Each record keeps the
 * author, licence and source URL so the site can credit them properly.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'TrendingNewsKenya/1.0 (newsroom demo build; contact: newsroom@example.com)'

const TARGETS = [
  { slug: 'nairobi-skyline', query: 'Nairobi skyline', alt: 'The Nairobi skyline at dusk' },
  { slug: 'parliament', query: 'Parliament of Kenya Nairobi building', alt: 'The Parliament of Kenya in Nairobi' },
  { slug: 'nairobi-traffic', query: 'Nairobi expressway traffic', alt: 'Traffic on the Nairobi Expressway' },
  { slug: 'tea-farm', query: 'Kenya tea plantation', alt: 'A tea plantation in the Kenyan highlands' },
  { slug: 'mobile-money', query: 'M-Pesa Kenya shop', alt: 'A mobile money agent in Kenya' },
  { slug: 'running', query: 'Eliud Kipchoge marathon', alt: 'A Kenyan distance runner competing' },
  { slug: 'football', query: 'Kenya national football team Harambee Stars', alt: 'The Kenyan national football team' },
  { slug: 'concert', query: 'Nairobi concert crowd', alt: 'A crowd at a Nairobi concert' },
  { slug: 'maasai-mara', query: 'Maasai Mara wildlife', alt: 'Wildlife on the Maasai Mara' },
  { slug: 'coast', query: 'Diani Beach Kenya', alt: 'The Kenyan coast at Diani Beach' },
  { slug: 'lake-victoria', query: 'Lake Victoria fishing boat Kenya', alt: 'Fishermen on Lake Victoria' },
  { slug: 'students', query: 'University of Nairobi students', alt: 'Students at the University of Nairobi' },
  { slug: 'energy', query: 'Olkaria geothermal power station', alt: 'The Olkaria geothermal power station' },
  { slug: 'airport', query: 'Jomo Kenyatta International Airport', alt: 'Jomo Kenyatta International Airport' },
  { slug: 'flowers', query: 'Kenya flower farm roses', alt: 'A flower farm in Kenya' },
  { slug: 'market', query: 'Nairobi market vendor', alt: 'A market trader in Nairobi' },
  { slug: 'port', query: 'Mombasa port Kenya', alt: 'The port of Mombasa' },
  { slug: 'coffee', query: 'Kenya coffee farmer', alt: 'A coffee farmer in Kenya' },
  { slug: 'rugby', query: 'Kenya rugby sevens', alt: 'Kenya Sevens rugby' },
  { slug: 'city-night', query: 'Nairobi at night', alt: 'Nairobi after dark' },
  { slug: 'school', query: 'Kenya primary school classroom', alt: 'A primary school classroom in Kenya' },
  { slug: 'health', query: 'Kenya hospital nurse', alt: 'A health worker in Kenya' },
  { slug: 'parliament-protest', query: 'Nairobi protest', alt: 'A demonstration in Nairobi' },
  { slug: 'railway', query: 'Madaraka Express train Kenya', alt: 'The Madaraka Express train' },
]

const stripTags = (s) =>
  String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const LICENCE_OK = /(public domain|cc0|cc[ -]by(-sa)?[ -]?\d|attribution|free art)/i

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  return res.json()
}

async function pick(target) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${target.query}`,
    gsrlimit: '12',
    gsrnamespace: '6',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1600',
  })
  const pages = Object.values(data?.query?.pages || {}).sort((a, b) => a.index - b.index)
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info) continue
    const meta = info.extmetadata || {}
    const licence = stripTags(meta.LicenseShortName?.value)
    if (!LICENCE_OK.test(licence)) continue
    if (Math.min(info.width, info.height) < 900) continue
    if (/\.svg|\.png|\.gif|\.tif/i.test(page.title)) continue
    return {
      title: page.title.replace(/^File:/, ''),
      url: info.thumburl,
      source: info.descriptionurl,
      author: stripTags(meta.Artist?.value) || 'Wikimedia Commons contributor',
      licence,
      width: 1600,
      height: info.thumbheight || Math.round((1600 * info.height) / info.width),
    }
  }
  return null
}

const outDir = path.join(process.cwd(), 'public', 'images')
await mkdir(outDir, { recursive: true })

const credits = {}
const failures = []

for (const target of TARGETS) {
  process.stdout.write(`→ ${target.slug}: `)
  try {
    const found = await pick(target)
    if (!found) {
      console.log('no suitable image')
      failures.push(target.slug)
      continue
    }
    const res = await fetch(found.url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`download ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(path.join(outDir, `${target.slug}.jpg`), buf)
    credits[target.slug] = {
      file: `/images/${target.slug}.jpg`,
      alt: target.alt,
      title: found.title,
      author: found.author,
      licence: found.licence,
      source: found.source,
      bytes: buf.length,
    }
    console.log(`${(buf.length / 1024).toFixed(0)} KB — ${found.licence}`)
  } catch (err) {
    console.log(`failed: ${err.message}`)
    failures.push(target.slug)
  }
}

await writeFile(
  path.join(process.cwd(), 'content', 'image-credits.json'),
  JSON.stringify(credits, null, 2) + '\n'
)

console.log(`\n${Object.keys(credits).length} images saved, ${failures.length} failed.`)
if (failures.length) console.log('Missing:', failures.join(', '))
