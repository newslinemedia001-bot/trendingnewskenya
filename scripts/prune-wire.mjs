#!/usr/bin/env node
/**
 * Trim the stored RSS wire down to a small, section-complete sample.
 *
 *   node scripts/prune-wire.mjs            # dry run: prints the plan
 *   node scripts/prune-wire.mjs --confirm  # deletes the rest
 *
 * Twenty wire stories are kept, chosen so no section is left blank: every
 * section that has wire coverage keeps its newest story, then a second one
 * where the budget allows, and any leftover slots go to the newest remaining
 * headlines. Staff stories are never touched.
 *
 * Lead images are only deleted when they live in our own Supabase Storage
 * bucket; publisher images are third-party URLs and are left alone.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const KEEP = 20
const CHUNK = 100
/** Section order used by the front page; unknown sections are appended. */
const SECTION_ORDER = [
  'kenya',
  'politics',
  'business',
  'technology',
  'sport',
  'entertainment',
  'life',
  'africa',
  'world',
  'opinion',
]

async function loadEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // .env.local is optional; the environment may already hold the values.
  }
}

function timeOf(doc) {
  const value = new Date(doc.publishedAt || doc.createdAt || 0).getTime()
  return Number.isFinite(value) ? value : 0
}

function newestFirst(a, b) {
  return timeOf(b) - timeOf(a)
}

await loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'covers'

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.')
  process.exit(1)
}

const db = createClient(String(url).replace(/\/+$/, ''), key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Every row in a table, paged around PostgREST's 1000-row response cap. */
async function readAll(select, apply = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(db.from('tnk_articles').select(select)).range(
      from,
      from + 999
    )
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return rows
}

function chunks(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const confirm = process.argv.includes('--confirm')

const articles = await readAll('*')
const wire = articles.filter((doc) => doc.wire).sort(newestFirst)
const staff = articles.filter((doc) => !doc.wire && doc.status === 'published')

console.log(`Found ${articles.length} articles: ${wire.length} wire, ${staff.length} staff.\n`)

if (!wire.length) {
  console.log('Nothing to prune: the wire is already empty.')
  process.exit(0)
}

// Sections in front-page order, then anything else the data mentions.
const bySection = new Map()
for (const doc of wire) {
  const section = doc.section || 'kenya'
  if (!bySection.has(section)) bySection.set(section, [])
  bySection.get(section).push(doc)
}
const sections = [
  ...SECTION_ORDER.filter((slug) => bySection.has(slug)),
  ...[...bySection.keys()].filter((slug) => !SECTION_ORDER.includes(slug)),
]

const keep = new Set()
const keepBySection = new Map()

function take(doc, round) {
  if (keep.size >= KEEP || keep.has(doc.id)) return false
  keep.add(doc.id)
  const list = keepBySection.get(doc.section || 'kenya') || []
  list.push({ doc, round })
  keepBySection.set(doc.section || 'kenya', list)
  return true
}

// Round 1: one per section, round 2: a second per section. This is what keeps
// every section populated instead of the newest twenty all landing in one.
for (const round of [1, 2]) {
  for (const section of sections) {
    const pool = bySection.get(section) || []
    const candidate = pool.find((doc) => !keep.has(doc.id))
    if (candidate) take(candidate, round)
  }
}

// Leftover slots (fewer sections than the budget) go to the newest remaining.
for (const doc of wire) {
  if (keep.size >= KEEP) break
  take(doc, 3)
}

const doomed = wire.filter((doc) => !keep.has(doc.id))

console.log('Keeping:')
for (const section of sections) {
  const kept = keepBySection.get(section) || []
  const staffHere = staff.filter((doc) => doc.section === section).length
  console.log(
    `  ${section.padEnd(14)} keep ${kept.length}  drop ${(bySection.get(section) || []).length - kept.length}  (staff stories: ${staffHere})`
  )
  for (const { doc } of kept) {
    console.log(`      · ${doc.title?.slice(0, 70)}`)
  }
}

console.log(`\nKeeping ${keep.size} wire stories, deleting ${doomed.length}.`)

if (!confirm) {
  console.log('Dry run. Re-run with --confirm to delete.')
  process.exit(0)
}

/** Remove a lead image only when it is an object in our own bucket. */
async function deleteImage(doc) {
  const image = String(doc.coverImageUrl || '')
  const marker = `/storage/v1/object/public/${bucket}/`
  const at = image.indexOf(marker)
  if (at === -1) return false
  const objectPath = decodeURIComponent(image.slice(at + marker.length).split('?')[0])
  if (!objectPath) return false
  const { error } = await db.storage.from(bucket).remove([objectPath])
  if (error) {
    console.warn(`  ! image ${objectPath}: ${error.message}`)
    return false
  }
  return true
}

let imagesRemoved = 0
for (const group of chunks(doomed, CHUNK)) {
  for (const doc of group) {
    if (await deleteImage(doc)) imagesRemoved += 1
  }
  const { error } = await db
    .from('tnk_articles')
    .delete()
    .in(
      'id',
      group.map((doc) => doc.id)
    )
  if (error) {
    console.error(`Delete failed: ${error.message}`)
    process.exit(1)
  }
  console.log(`Deleted ${group.length} stories (${imagesRemoved} images removed so far)…`)
}

const { count: wireLeft } = await db
  .from('tnk_articles')
  .select('id', { count: 'exact', head: true })
  .eq('wire', true)

console.log(`\nDone. Wire stories left: ${wireLeft}. Images removed: ${imagesRemoved}.`)
process.exit(0)
