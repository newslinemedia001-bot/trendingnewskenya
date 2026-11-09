/**
 * The public content API.
 *
 * Everything here is the newsroom's own published work: no demo archive, no
 * fallback to seeded copy. Stories live in Firestore (or the local desk store
 * while it is being set up) and are written only by the desk.
 *
 * Bylines come from the public `authors` collection, which the desk keeps in
 * step with each staff account. Password hashes never leave `users`.
 */
import { cache } from 'react'
import { readCollection } from '@/lib/desk/store'
import { SECTIONS, SECTION_SLUGS, siteUrl } from '@/lib/site'

const PAGE_SIZE = 12
const PLACEHOLDER_AUTHOR = { slug: 'staff', name: 'Staff reporter', role: 'Newsroom', bio: '' }

/** Minimum paragraphs required for an article to appear publicly. */
export const MIN_PARAGRAPHS = 3

/** Count real paragraphs in body copy. Used to drop one-sentence wire items. */
export function paragraphCount(body) {
  if (!body) return 0
  const blocks = String(body)
    .split(/(?:\r?\n){2,}|<\/p>\s*<p>/gi)
    .map((p) => p.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
  if (blocks.length >= 2) return blocks.length
  const sentences = String(body)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.!?]+\s+/)
    .filter(Boolean)
  return sentences.length >= 3 ? 3 : sentences.length
}

function iso(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return null
}

function imageFor(data) {
  if (!data.coverImageUrl) return null
  return {
    src: data.coverImageUrl,
    alt: data.imageAlt || data.imageCaption || data.title,
    caption: data.imageCaption || '',
    credit: data.imageCredit || '',
    width: 1600,
    height: 900,
  }
}

function mapped(doc, authorsBySlug) {
  const author =
    authorsBySlug.get(doc.authorSlug) ||
    (doc.authorName
      ? {
          slug: doc.authorSlug || 'staff',
          name: doc.authorName,
          role: doc.authorTitle || 'Reporter',
          bio: '',
        }
      : PLACEHOLDER_AUTHOR)

  const publishedAt = iso(doc.publishedAt) || iso(doc.createdAt)
  return {
    id: doc.id,
    slug: doc.slug || doc.id,
    title: doc.title || '',
    dek: doc.dek || '',
    section: doc.section || 'kenya',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    author,
    author_slug: author.slug,
    image: imageFor(doc),
    body: doc.body || '',
    publishedAt,
    updatedAt: iso(doc.updatedAt) || publishedAt,
    isFeatured: Boolean(doc.isFeatured),
    isBreaking: Boolean(doc.isBreaking),
    views: Number(doc.views) || 0,
    // Wire articles are stored on-site but belong to another publisher: they
    // are read at /news/<slug> with a credit, never by leaving the site.
    wire: Boolean(doc.wire),
    source: doc.source || '',
    sourceUrl: doc.sourceUrl || '',
    originalUrl: doc.originalUrl || '',
    remoteImage: Boolean(doc.remoteImage),
    external: false,
    href: `/news/${doc.slug || doc.id}`,
  }
}

/** One read of the published set per request, shared by every section. */
const publishedStories = cache(async () => {
  try {
    const [docs, authorDocs] = await Promise.all([
      readCollection('articles', { field: 'status', op: '==', value: 'published' }),
      readCollection('authors'),
    ])

    const authorsBySlug = new Map(
      authorDocs.map((author) => [
        author.id,
        {
          slug: author.id,
          name: author.name || 'Staff reporter',
          role: author.role || 'Reporter',
          bio: author.bio || '',
        },
      ])
    )

    return docs
      .map((doc) => mapped(doc, authorsBySlug))
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
  } catch {
    // A cold or misconfigured database must never take the paper down.
    return []
  }
})

export function getAllSections() {
  return SECTIONS
}

export async function getAllArticles() {
  return publishedStories()
}

export async function hasPublishedStories() {
  return (await publishedStories()).length > 0
}

export async function getFeaturedArticle() {
  const articles = await publishedStories()
  return articles.find((article) => article.isFeatured) || articles[0] || null
}

export async function getBreakingArticles(limitCount = 4) {
  const articles = await publishedStories()
  const flagged = articles.filter((article) => article.isBreaking)
  return (flagged.length ? flagged : articles).slice(0, limitCount)
}

export async function getLatest(limitCount = 8, exclude = []) {
  const excluded = new Set(exclude.filter(Boolean))
  const articles = await publishedStories()
  return articles.filter((article) => !excluded.has(article.slug)).slice(0, limitCount)
}

export async function getBySection(section, limitCount = 12) {
  const articles = await publishedStories()
  return articles.filter((article) => article.section === section).slice(0, limitCount)
}

export async function getArticleBySlug(slug) {
  const articles = await publishedStories()
  const article = articles.find((a) => a.slug === slug)
  if (!article) return null
  // Staff copy is always full-length; wire summaries can be short but are
  // still valid stories that link out to the original publisher.
  if (!article.wire && paragraphCount(article.body) < MIN_PARAGRAPHS) return null
  return article
}

/** Stored wire headlines, newest first. */
export async function getWireArticles(limitCount = 40) {
  const articles = await publishedStories()
  return articles.filter((article) => article.wire).slice(0, limitCount)
}

export async function getMostRead(limitCount = 5, exclude = []) {
  const excluded = new Set(exclude.filter(Boolean))
  const articles = await publishedStories()
  return [...articles]
    .filter((article) => !excluded.has(article.slug))
    .sort((a, b) => b.views - a.views)
    .slice(0, limitCount)
}

export async function searchArticles(searchTerm, limitCount = 24) {
  const term = String(searchTerm || '').trim().toLowerCase()
  if (!term) return []
  const articles = await publishedStories()
  return articles
    .filter((article) =>
      [article.title, article.dek, article.body, article.author.name, ...article.tags]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
    .slice(0, limitCount)
}

export async function getSectionCounts() {
  const articles = await publishedStories()
  const counts = Object.fromEntries(SECTION_SLUGS.map((slug) => [slug, 0]))
  for (const article of articles) {
    counts[article.section] = (counts[article.section] || 0) + 1
  }
  return counts
}

export async function getSectionPage(section, page = 1) {
  const articles = await publishedStories()
  const inSection = articles.filter((article) => article.section === section)
  const totalPages = Math.max(1, Math.ceil(inSection.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const from = (safePage - 1) * PAGE_SIZE
  return {
    articles: inSection.slice(from, from + PAGE_SIZE),
    total: inSection.length,
    page: safePage,
    totalPages,
    pageSize: PAGE_SIZE,
  }
}

export async function getRelated(article, limitCount = 3) {
  if (!article) return []
  const articles = await publishedStories()
  const sameSection = articles.filter(
    (entry) => entry.section === article.section && entry.slug !== article.slug
  )
  const sharedTags = articles.filter(
    (entry) =>
      entry.slug !== article.slug &&
      entry.section !== article.section &&
      entry.tags.some((tag) => article.tags.includes(tag))
  )
  const rest = articles.filter(
    (entry) => entry.slug !== article.slug && !sameSection.includes(entry) && !sharedTags.includes(entry)
  )
  return [...sameSection, ...sharedTags, ...rest].slice(0, limitCount)
}

export async function getAuthor(slug) {
  const articles = (await publishedStories()).filter((article) => !article.wire)
  const fromArticles = articles.find((article) => article.author.slug === slug)?.author
  if (!fromArticles) return null
  return {
    author: fromArticles,
    articles: articles.filter((article) => article.author.slug === slug),
  }
}

/** Bylines with counts, for the writers index. Wire publishers are not staff. */
export async function getAuthors() {
  const articles = (await publishedStories()).filter((article) => !article.wire)
  const bySlug = new Map()
  for (const article of articles) {
    if (!bySlug.has(article.author.slug)) {
      bySlug.set(article.author.slug, { ...article.author, count: 0 })
    }
    const entry = bySlug.get(article.author.slug)
    entry.count += 1
    if (!entry.bio && article.author.bio) entry.bio = article.author.bio
  }
  return [...bySlug.values()].sort((a, b) => b.count - a.count)
}

export async function getTopics(limitCount = 12) {
  const articles = await publishedStories()
  const map = new Map()
  for (const article of articles) {
    for (const tag of article.tags) {
      if (!map.has(tag)) map.set(tag, { slug: tag, count: 0, latest: article })
      const entry = map.get(tag)
      entry.count += 1
      if (new Date(article.publishedAt) > new Date(entry.latest.publishedAt)) {
        entry.latest = article
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limitCount)
}

export async function getByTopic(tag) {
  const articles = await publishedStories()
  return articles.filter((article) => article.tags.includes(tag))
}

export async function getLatestBySection(limitPerSection = 4, exclude = []) {
  const excluded = new Set(exclude.filter(Boolean))
  const articles = await publishedStories()
  return SECTIONS.map((section) => ({
    section,
    articles: articles
      .filter((article) => article.section === section.slug && !excluded.has(article.slug))
      .slice(0, limitPerSection),
  })).filter((entry) => entry.articles.length > 0)
}

/** Absolute URL for an article image, for Open Graph and JSON-LD. */
export function articleImageUrl(article) {
  if (!article?.image?.src) return `${siteUrl()}/og-default.png`
  const src = article.image.src
  if (article.remoteImage && /^https?:\/\//i.test(src)) {
    return `${siteUrl()}/api/wire/image?url=${encodeURIComponent(src)}`
  }
  return src.startsWith('http') ? src : siteUrl() + src
}
