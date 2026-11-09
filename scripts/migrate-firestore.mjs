#!/usr/bin/env node
/**
 * One-time content move: Firestore -> Supabase.
 *
 *   node scripts/migrate-firestore.mjs            # copy published stories + bylines
 *   node scripts/migrate-firestore.mjs --dry-run  # show what would be copied
 *
 * Reads Firestore through its public web SDK, so it only needs the Firebase web
 * config (the same NEXT_PUBLIC_FIREBASE_* values the site already uses) and the
 * security rules that expose published articles and bylines. Drafts and the
 * users collection are not publicly readable and are therefore skipped; create
 * a fresh administrator with `node scripts/create-staff.mjs` afterwards.
 *
 * Writes need the Supabase service-role key. Run scripts/supabase-schema.sql
 * first.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const DRY = process.argv.includes('--dry-run')

async function loadEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // .env.local is optional when the variables are already in the environment.
  }
}

await loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

// A dry run only reads Firestore, so the Supabase key is not required yet.
const requiredEnv = [
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', PROJECT_ID],
  ['NEXT_PUBLIC_FIREBASE_API_KEY', API_KEY],
]
if (!DRY) {
  requiredEnv.push(
    ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY]
  )
}

const missing = requiredEnv.filter(([, value]) => !value)

if (missing.length) {
  console.error(`Missing env: ${missing.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

const ARTICLE_COLUMNS = [
  'id', 'slug', 'title', 'dek', 'section', 'tags', 'body', 'status', 'wire',
  'source', 'sourceUrl', 'originalUrl', 'authorUid', 'authorSlug', 'authorName',
  'authorTitle', 'coverImageUrl', 'imageAlt', 'imageCaption', 'imageCredit',
  'remoteImage', 'isFeatured', 'isBreaking', 'views', 'createdAt', 'updatedAt',
  'publishedAt', 'createdBy', 'publishedBy', 'updatedBy',
]

const AUTHOR_COLUMNS = ['id', 'name', 'role', 'bio', 'updatedAt']

/** ISO-8601 string for a Firestore/ISO/Date value, or null. */
function toIso(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString()
  return null
}

function pick(source, columns) {
  const row = {}
  for (const column of columns) {
    if (source[column] === undefined) continue
    row[column] = source[column]
  }
  return row
}

function normalizeArticle(id, data) {
  const row = pick({ ...data, id }, ARTICLE_COLUMNS)
  row.id = String(id)
  row.slug = String(data.slug || id)
  row.tags = Array.isArray(data.tags) ? data.tags.filter(Boolean).map(String) : []
  row.views = Number(data.views) || 0
  row.wire = Boolean(data.wire)
  row.remoteImage = Boolean(data.remoteImage)
  row.isFeatured = Boolean(data.isFeatured)
  row.isBreaking = Boolean(data.isBreaking)
  row.status = data.status || 'published'
  row.section = data.section || 'kenya'
  for (const field of ['createdAt', 'updatedAt', 'publishedAt']) {
    row[field] = toIso(data[field])
  }
  return row
}

function normalizeAuthor(id, data) {
  const row = pick({ ...data, id }, AUTHOR_COLUMNS)
  row.id = String(id)
  row.updatedAt = toIso(data.updatedAt)
  return row
}

const { initializeApp } = await import('firebase/app')
const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore')

const firebase = initializeApp({
  apiKey: API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT_ID,
  appId: APP_ID,
})
const store = getFirestore(firebase)

console.log(`Firestore project: ${PROJECT_ID}`)
console.log(`Supabase project : ${SUPABASE_URL || '(dry run)'}`)
console.log(DRY ? 'Mode             : dry run\n' : 'Mode             : write\n')

/* ---------- bylines ---------- */
const authorSnapshot = await getDocs(collection(store, 'authors'))
const authors = authorSnapshot.docs.map((doc) => normalizeAuthor(doc.id, doc.data()))
console.log(`Bylines in Firestore: ${authors.length}`)

/* ---------- published stories ---------- */
const publishedSnapshot = await getDocs(
  query(collection(store, 'articles'), where('status', '==', 'published'))
)
const articles = publishedSnapshot.docs.map((doc) => normalizeArticle(doc.id, doc.data()))
console.log(`Published stories   : ${articles.length}`)

/* ---------- what is not readable ---------- */
for (const name of ['users', 'articles']) {
  try {
    const snapshot = await getDocs(collection(store, name))
    console.log(`  ${name}: ${snapshot.size} docs readable without the status filter`)
  } catch (error) {
    console.log(`  ${name}: not readable (${error.code || error.message}) — skipped`)
  }
}

if (DRY) {
  console.log('\nSample rows:')
  console.log(JSON.stringify(articles.slice(0, 2), null, 2))
  process.exit(0)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/* ---------- write ---------- */
function dedupe(rows) {
  const bySlug = new Map()
  let dropped = 0
  for (const row of rows) {
    if (bySlug.has(row.slug)) {
      dropped += 1
      const existing = bySlug.get(row.slug)
      const left = new Date(row.publishedAt || row.createdAt || 0).getTime()
      const right = new Date(existing.publishedAt || existing.createdAt || 0).getTime()
      if (left > right) bySlug.set(row.slug, row)
      continue
    }
    bySlug.set(row.slug, row)
  }
  if (dropped)  console.log(`  dropped ${dropped} duplicate slug(s)`)
  return [...bySlug.values()]
}

async function upsertAll(table, rows) {
  let written = 0
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100)
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`\n✗ ${table} batch at row ${index} failed: ${error.message}`)
      if (error.details) console.error(`  ${error.details}`)
      console.error('  Is scripts/supabase-schema.sql applied and the tnk schema exposed?')
      process.exit(1)
    }
    written += batch.length
  }
  return written
}

if (authors.length) {
  const written = await upsertAll('tnk_authors', authors)
  console.log(`✓ bylines written: ${written}`)
}

const uniqueArticles = dedupe(articles)
const written = await upsertAll('tnk_articles', uniqueArticles)
console.log(`✓ stories written: ${written}`)

const { count, error: countError } = await supabase
  .from('tnk_articles')
  .select('id', { count: 'exact', head: true })

if (countError) {
  console.error(`Could not verify: ${countError.message}`)
  process.exit(1)
}

console.log(`\nSupabase now holds ${count} article row(s).`)
console.log('Drafts and desk accounts were not copied — Firestore does not expose them publicly.')
console.log('Create an administrator with: node scripts/create-staff.mjs --name "..." --email ... --password ... --role admin')
