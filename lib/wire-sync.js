/**
 * Persist the RSS wire into Firestore.
 *
 * Every headline a publisher offers becomes a normal `articles` document with
 * `wire: true`, so the front page, sections, search, feeds and the internal
 * story page all read from one place. The document keeps the publisher's own
 * image URL and the attribution needed to credit it on-site.
 *
 * The sync is:
 *   - idempotent — document IDs come from a hash of the article link;
 *   - incremental — unchanged headlines are skipped, existing images are reused
 *     before any publisher page is scraped for an Open Graph image;
 *   - bounded — a small worker pool, no more than a handful of scrapes per run;
 *   - housekeeping — wire items older than two weeks are removed.
 */
import { createHash } from 'node:crypto'
import { canWrite, deleteDoc, readCollection, writeDoc } from '@/lib/desk/store'
import { fetchOgImage, getWire } from '@/lib/wire'

export const WIRE_RETENTION_DAYS = 14
export const WIRE_SYNC_INTERVAL_MS = 15 * 60 * 1000

const MAX_OG_SCRAPES = 18
const OG_CONCURRENCY = 4
const MAX_ITEMS = 60

function nowIso() {
  return new Date().toISOString()
}

/** Count real paragraphs in body copy. Drops one-sentence wire items. */
function paragraphCount(body) {
  if (!body) return 0
  const text = String(body)
    .replace(/<[^>]*>+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return 0
  const sentences = text.split(/[.!?]+\s+/).filter(Boolean)
  // At least three sentences as a proxy for three paragraphs when copy is
  // plain text; or three blocks when HTML paragraphs are present.
  const blocks = String(body)
    .split(/(?:\r?\n){2,}|<\/p>\s*<p>/gi)
    .map((p) => p.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
  return Math.max(blocks.length, sentences.length >= 3 ? 3 : sentences.length)
}

function hashOf(link) {
  return createHash('sha1').update(String(link || '')).digest('hex').slice(0, 16)
}

function slugify(title) {
  return String(title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

function isoOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Run `worker` over `items` with at most `limit` in flight. */
async function pool(items, limit, worker) {
  const queue = [...items]
  const results = []
  async function next() {
    while (queue.length) {
      const item = queue.shift()
      results.push(await worker(item))
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, next))
  return results
}

/**
 * Fill in images for feed items that arrived without one. Existing stored
 * images are always preferred, so a publisher page is fetched at most once per
 * headline.
 */
async function resolveImages(items, existingById) {
  const seen = new Set()
  const needs = []
  for (const item of items) {
    const id = `wire_${hashOf(item.link)}`
    const existingImage = existingById.get(id)?.coverImageUrl
    if (item.image || existingImage) continue
    if (seen.has(id)) continue
    seen.add(id)
    needs.push({ id, link: item.link })
  }

  const scraped = new Map()
  await pool(needs.slice(0, MAX_OG_SCRAPES), OG_CONCURRENCY, async ({ id, link }) => {
    const image = await fetchOgImage(link)
    if (image) scraped.set(id, image)
  })
  return scraped
}

function buildDoc({ item, id, existing, ogImage }) {
  const publishedAt =
    isoOrNull(existing?.publishedAt) || isoOrNull(item.publishedAt) || nowIso()
  const createdAt = isoOrNull(existing?.createdAt) || publishedAt
  const slug =
    existing?.slug ||
    `wire-${slugify(item.title) || 'headline'}-${id.slice(-6)}`
  const image = item.image || existing?.coverImageUrl || ogImage || ''

  return {
    id,
    slug,
    title: item.title,
    dek: item.summary || '',
    section: item.section || 'kenya',
    tags: Array.isArray(item.tags) ? item.tags : [],
    body: item.content || item.summary || '',
    status: 'published',
    wire: true,
    source: item.source,
    sourceUrl: item.sourceUrl || '',
    originalUrl: item.link,
    imageCredit: item.source,
    authorUid: '',
    authorSlug: '',
    authorName: item.source,
    authorTitle: 'Wire',
    coverImageUrl: image,
    remoteImage: Boolean(image),
    imageAlt: item.title,
    imageCaption: '',
    isFeatured: false,
    isBreaking: false,
    createdAt,
    updatedAt: nowIso(),
    createdBy: 'wire-sync',
    publishedAt,
    publishedBy: 'wire-sync',
    views: Number(existing?.views) || 0,
  }
}

function unchanged(existing, next) {
  if (!existing) return false
  return (
    existing.title === next.title &&
    existing.dek === next.dek &&
    existing.section === next.section &&
    existing.body === next.body &&
    existing.coverImageUrl === next.coverImageUrl &&
    existing.originalUrl === next.originalUrl &&
    existing.status === next.status
  )
}

async function runSync() {
  const startedAt = nowIso()
  const existing = await readCollection('articles')
  const wireDocs = existing.filter((doc) => doc.wire)
  const existingById = new Map(existing.map((doc) => [doc.id, doc]))

  const items = (await getWire(MAX_ITEMS)).filter((item) => item.title && item.link)
  const scraped = await resolveImages(items, existingById)

  const seen = new Set()
  let added = 0
  let updated = 0
  let skipped = 0

  for (const item of items) {
    const id = `wire_${hashOf(item.link)}`
    if (seen.has(id)) continue
    seen.add(id)

    const doc = buildDoc({
      item,
      id,
      existing: existingById.get(id),
      ogImage: scraped.get(id),
    })

    // Drop short wire copy: require at least three paragraphs.
    if (paragraphCount(doc.body) < 3) {
      skipped += 1
      continue
    }

    if (unchanged(existingById.get(id), doc)) {
      skipped += 1
      continue
    }

    try {
      await writeDoc('articles', id, doc, { merge: true })
      if (existingById.has(id)) updated += 1
      else added += 1
    } catch {
      // A single failed document must not abandon the rest of the sync.
    }
  }

  // Housekeeping: drop wire items that have aged out of the feed window and
  // are no longer among the headlines we just saw.
  const cutoff = Date.now() - WIRE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  let removed = 0
  for (const doc of wireDocs) {
    if (seen.has(doc.id)) continue
    const date = new Date(doc.publishedAt || doc.createdAt || 0).getTime()
    if (Number.isFinite(date) && date < cutoff) {
      try {
        await deleteDoc('articles', doc.id)
        removed += 1
      } catch {
        // Ignore; retention is best-effort.
      }
    }
  }

  return {
    ok: true,
    startedAt,
    finishedAt: nowIso(),
    fetched: items.length,
    added,
    updated,
    skipped,
    removed,
    total: seen.size,
  }
}

const state = (globalThis.__tnkWireSync ||= { lastFinished: 0, running: null, lastResult: null })

/**
 * Sync the wire into Firestore. Throttled to once every fifteen minutes unless
 * `force` is set (the desk's manual refresh button). Concurrent callers share
 * one run.
 */
export async function syncWire({ force = false } = {}) {
  if (!canWrite()) {
    return { ok: false, reason: 'read-only', fetched: 0, added: 0, updated: 0, skipped: 0, removed: 0 }
  }

  if (state.running) return state.running

  const fresh =
    !force && state.lastFinished && Date.now() - state.lastFinished < WIRE_SYNC_INTERVAL_MS
  if (fresh) {
    return { ok: true, throttled: true, ...(state.lastResult || {}) }
  }

  state.running = runSync()
    .catch((error) => ({
      ok: false,
      reason: error?.message || 'sync failed',
      fetched: 0,
      added: 0,
      updated: 0,
      skipped: 0,
      removed: 0,
    }))
    .then((result) => {
      state.running = null
      state.lastFinished = Date.now()
      state.lastResult = result
      return result
    })

  return state.running
}
