/**
 * Staff stories.
 *
 *   draft ──publish──▶ published
 *     ▲                    │
 *     └────unpublish───────┘
 *
 * Editors publish and manage their own stories. Administrators can publish,
 * edit, unpublish and delete anyone's. Nothing in this module may run in the
 * browser — it is called from server code only.
 */
import { randomUUID } from 'node:crypto'
import { readCollection, readDoc, writeDoc, deleteDoc } from '@/lib/desk/store'
import { SECTION_SLUGS } from '@/lib/site'

export const STATUSES = ['draft', 'published']

export const STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
}

const MIN_PUBLISH_BODY = 200

function now() {
  return new Date().toISOString()
}

function slugify(title) {
  return String(title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',')
  return [
    ...new Set(
      list
        .map((tag) =>
          String(tag || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        )
        .filter(Boolean)
    ),
  ].slice(0, 6)
}

export function isAdmin(user) {
  return user?.active !== false && user?.role === 'admin'
}

/** Every signed-in account may write and publish its own stories. */
export function canPublish(user) {
  return user?.active !== false && (user?.role === 'editor' || user?.role === 'admin')
}

export function ownsStory(user, story) {
  return Boolean(user && story && story.authorUid === user.id)
}

/**
 * Administrators manage the whole site; editors manage only what they wrote.
 * Both may edit their own story after it is published.
 */
export function canEdit(user, story) {
  if (!user || user.active === false || !story) return false
  if (isAdmin(user)) return true
  return canPublish(user) && ownsStory(user, story)
}

export function canDelete(user, story) {
  return canEdit(user, story)
}

function validateFields(input, { publishing = false } = {}) {
  const errors = {}
  const title = String(input.title || '').trim()
  if (title.length < 8) errors.title = 'Write a headline of at least 8 characters.'

  const section = String(input.section || '').trim()
  if (!SECTION_SLUGS.includes(section)) errors.section = 'Choose a section.'

  if (publishing) {
    const dek = String(input.dek || '').trim()
    if (dek.length < 20) errors.dek = 'Add a standfirst of at least 20 characters for search and social.'
    const body = String(input.body || '').trim()
    if (body.length < MIN_PUBLISH_BODY) {
      errors.body = `A published story needs at least ${MIN_PUBLISH_BODY} characters of copy.`
    }
  }

  return errors
}

async function uniqueSlug(title, id = null) {
  const base = slugify(title) || `story-${Date.now()}`
  const articles = await readCollection('articles')
  const taken = new Set(articles.filter((a) => a.id !== id).map((a) => a.slug))
  if (!taken.has(base)) return base
  for (let i = 2; i < 200; i += 1) {
    const candidate = `${base}-${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${randomUUID().slice(0, 6)}`
}

/** Newest first, whatever the status. */
function sortStories(stories) {
  return [...stories].sort((a, b) => {
    const left = new Date(b.updatedAt || b.publishedAt || 0).getTime()
    const right = new Date(a.updatedAt || a.publishedAt || 0).getTime()
    return left - right
  })
}

export async function listStories({ status, authorUid, section, q } = {}) {
  const stories = await readCollection('articles')
  const query = String(q || '').trim().toLowerCase()

  return sortStories(
    stories.filter((story) => {
      // The wire is ingested automatically and is not staff copy.
      if (story.wire) return false
      if (status && status !== 'all' && story.status !== status) return false
      if (authorUid && story.authorUid !== authorUid) return false
      if (section && story.section !== section) return false
      if (query) {
        const haystack = [story.title, story.dek, story.body, story.authorName]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  )
}

export async function getStory(id) {
  return readDoc('articles', id)
}

export async function countByStatus(user) {
  const stories = (await readCollection('articles')).filter((story) => !story.wire)
  const mine = stories.filter((story) => story.authorUid === user?.id)
  const published = stories.filter((story) => story.status === 'published')
  return {
    total: stories.length,
    published: published.length,
    draft: stories.filter((story) => story.status === 'draft').length,
    review: stories.filter((story) => story.status === 'review').length,
    mine: mine.length,
    myDrafts: mine.filter((story) => story.status === 'draft').length,
    myReview: mine.filter((story) => story.status === 'review').length,
  }
}

export async function createStory(input, user) {
  if (!user || user.active === false) {
    return { ok: false, errors: { form: 'You are not signed in.' } }
  }

  // The dashboard composer can publish in one step; the full editor saves a
  // draft first. Both use this function.
  const publishNow = String(input.status || '') === 'published'
  if (publishNow && !canPublish(user)) {
    return { ok: false, status: 403, errors: { form: 'Your account cannot publish.' } }
  }

  const errors = validateFields(input, { publishing: publishNow })
  if (Object.keys(errors).length) return { ok: false, errors }

  const title = String(input.title).trim()
  const timestamp = now()
  const story = {
    id: randomUUID(),
    slug: await uniqueSlug(title),
    title,
    dek: String(input.dek || '').trim(),
    section: String(input.section).trim(),
    tags: cleanTags(input.tags),
    body: String(input.body || ''),
    status: publishNow ? 'published' : 'draft',
    authorUid: user.id,
    authorSlug: user.slug,
    authorName: user.name,
    authorTitle: user.title || '',
    coverImageUrl: String(input.coverImageUrl || '').trim(),
    imageAlt: String(input.imageAlt || '').trim(),
    imageCaption: String(input.imageCaption || '').trim(),
    imageCredit: String(input.imageCredit || '').trim(),
    isFeatured: false,
    isBreaking: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: user.email,
    publishedAt: publishNow ? timestamp : null,
    publishedBy: publishNow ? user.email : '',
    views: 0,
  }

  await writeDoc('articles', story.id, story, { merge: false })
  return { ok: true, story }
}

const EDITABLE = [
  'title',
  'dek',
  'section',
  'body',
  'coverImageUrl',
  'imageAlt',
  'imageCaption',
  'imageCredit',
]

export async function updateStory(id, patch, user) {
  const story = await getStory(id)
  if (!story) return { ok: false, status: 404, errors: { form: 'That story no longer exists.' } }

  if (!canEdit(user, story)) {
    return { ok: false, status: 403, errors: { form: 'You cannot edit this story.' } }
  }

  const next = { ...story }
  for (const field of EDITABLE) {
    if (patch[field] !== undefined) next[field] = String(patch[field] ?? '')
  }
  if (patch.tags !== undefined) next.tags = cleanTags(patch.tags)

  const targetStatus = patch.status !== undefined ? String(patch.status) : story.status
  if (!STATUSES.includes(targetStatus)) {
    return { ok: false, status: 400, errors: { form: 'Unknown story status.' } }
  }

  if (targetStatus === 'published' && !canPublish(user)) {
    return { ok: false, status: 403, errors: { form: 'Your account cannot publish.' } }
  }

  const errors = validateFields(next, { publishing: targetStatus === 'published' })
  if (Object.keys(errors).length) return { ok: false, status: 422, errors }

  // Front-page flags are site-wide curation, so they belong to administrators.
  if (patch.isFeatured !== undefined || patch.isBreaking !== undefined) {
    if (!isAdmin(user)) {
      return {
        ok: false,
        status: 403,
        errors: { form: 'Only administrators can set front-page flags.' },
      }
    }
  }
  if (patch.isFeatured !== undefined) next.isFeatured = Boolean(patch.isFeatured)
  if (patch.isBreaking !== undefined) next.isBreaking = Boolean(patch.isBreaking)

  if (next.title !== story.title) {
    next.slug = await uniqueSlug(next.title, id)
  }

  if (targetStatus === 'published' && story.status !== 'published') {
    next.publishedAt = patch.publishedAt || now()
    next.publishedBy = user.email
  }
  if (targetStatus !== 'published' && story.status === 'published') {
    // Unpublishing keeps the original filed date so a re-publish does not
    // silently restamp the story.
    next.publishedAt = story.publishedAt
  }

  next.status = targetStatus
  next.updatedAt = now()
  next.updatedBy = user.email

  await writeDoc('articles', id, next, { merge: true })
  return { ok: true, story: next }
}

export async function deleteStory(id, user) {
  const story = await getStory(id)
  if (!story) return { ok: false, status: 404, errors: { form: 'That story no longer exists.' } }
  if (!canDelete(user, story)) {
    return { ok: false, status: 403, errors: { form: 'You cannot delete this story.' } }
  }
  await deleteDoc('articles', id)
  return { ok: true }
}
