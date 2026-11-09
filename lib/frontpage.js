/**
 * The front page model.
 *
 * Everything printed here — the newsroom's own reporting and the RSS wire —
 * lives in the same Firestore `articles` collection. `syncWire` refreshes the
 * wire first (throttled to every fifteen minutes), then the page is assembled
 * from stored documents only, so it works even if a feed is down.
 */
import { getAllArticles, getTopics } from '@/lib/content'
import { syncWire } from '@/lib/wire-sync'
import { SECTIONS } from '@/lib/site'

const SECTION_COUNTS = {
  kenya: 5,
  politics: 3,
  business: 4,
  technology: 2,
  sport: 2,
  entertainment: 2,
  life: 2,
  africa: 3,
  world: 3,
  opinion: 2,
}

function timeOf(card) {
  const value = new Date(card.publishedAt || 0).getTime()
  return Number.isFinite(value) ? value : 0
}

function byNewest(a, b) {
  return timeOf(b) - timeOf(a)
}

/**
 * Alternate staff copy and wire copy so a section reads as a mix rather than
 * a block of one source.
 */
function mix(staffCards, wireCards, count) {
  const left = [...staffCards]
  const right = [...wireCards]
  const out = []
  while (out.length < count && (left.length || right.length)) {
    if (left.length) out.push(left.shift())
    if (out.length < count && right.length) out.push(right.shift())
  }
  return out
}

export async function buildFrontPage() {
  // Best-effort: a slow or unreachable wire must not hold up the paper.
  try {
    await syncWire()
  } catch {
    // Stored wire articles from previous runs still render.
  }

  const [articles, topics] = await Promise.all([getAllArticles(), getTopics(7)])

  const staff = articles.filter((story) => !story.wire)
  const wire = articles.filter((story) => story.wire)

  const featured = staff.find((story) => story.isFeatured)
  const lead = featured || staff[0] || wire[0] || null

  const used = new Set(lead ? [lead.slug] : [])
  const remainder = [...staff, ...wire]
    .filter((card) => card.slug !== lead?.slug)
    .sort(byNewest)

  const secondary = remainder.slice(0, 2)
  for (const card of secondary) used.add(card.slug)

  const latest = remainder.filter((card) => !used.has(card.slug)).slice(0, 8)
  for (const card of latest) used.add(card.slug)

  const sections = {}
  for (const section of SECTIONS) {
    const count = SECTION_COUNTS[section.slug] || 2
    const staffCards = staff.filter(
      (story) => story.section === section.slug && !used.has(story.slug)
    )
    const wireCards = wire.filter(
      (story) => story.section === section.slug && !used.has(story.slug)
    )
    const picked = mix(staffCards, wireCards, count)
    for (const card of picked) used.add(card.slug)
    sections[section.slug] = picked
  }

  const mostRead = [...articles].sort((a, b) => b.views - a.views).slice(0, 5)

  return {
    lead,
    secondary,
    latest,
    sections,
    topics,
    mostRead,
    hasStaffStories: staff.length > 0,
  }
}
