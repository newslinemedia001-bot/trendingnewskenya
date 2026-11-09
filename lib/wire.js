import { cache } from 'react'
import Parser from 'rss-parser'

/**
 * The wire carries headlines from other newsrooms. Feeds are fetched
 * server-side with a 30-minute cache; a dead or blocked feed is skipped so it
 * can never take the page down.
 *
 * Each item arrives with as much as the publisher offers: a summary, the
 * article text where the feed carries it, a best-guess section, and an image
 * from the publisher's own media metadata. When a feed omits the image,
 * `syncWire` asks the article page for its Open Graph image before giving up.
 */
const FEEDS = [
  {
    name: 'Nation Africa',
    url: 'https://nation.africa/kenya/rss.xml',
    home: 'https://nation.africa',
    section: 'kenya',
  },
  {
    name: 'The Standard',
    url: 'https://www.standardmedia.co.ke/rss/headlines.php',
    home: 'https://www.standardmedia.co.ke',
    section: 'kenya',
  },
  {
    name: 'BBC Africa',
    url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
    home: 'https://www.bbc.com',
    section: 'africa',
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    home: 'https://www.aljazeera.com',
    section: 'world',
  },
]

const SECTION_HINTS = [
  ['politics', ['politic', 'parliament', 'senate', 'governor', 'election', 'cabinet', 'mp ', 'bill']],
  ['business', ['business', 'econom', 'market', 'shilling', 'bank', 'trade', 'tax', 'inflation', 'jobs']],
  ['technology', ['tech', 'fintech', 'mobile', 'digital', 'startup', 'internet', 'ai ']],
  ['sport', ['sport', 'athletic', 'football', 'rugby', 'sevens', 'harambee', 'match', 'olympic']],
  ['entertainment', ['entertain', 'music', 'film', 'celebrity', 'culture', 'concert']],
  ['opinion', ['opinion', 'editorial', 'column', 'comment']],
  ['life', ['life', 'travel', 'food', 'health', 'lifestyle', 'coast']],
  ['africa', ['africa', 'somalia', 'uganda', 'tanzania', 'ethiopia', 'sudan', 'congo', 'rwanda']],
  ['world', ['world', 'global', 'europe', 'asia', 'america', 'united nations']],
]

const UA =
  'Mozilla/5.0 (compatible; TrendingNewsKenya/1.0; +https://trendingnewskenya.co.ke)'

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:group', 'mediaGroup'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ],
    feed: [['media:thumbnail', 'mediaThumbnail']],
  },
})

function clean(text) {
  return String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&lsquo;|&rsquo;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '”')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, value) => String.fromCharCode(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCharCode(parseInt(value, 16)))
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeUrl(url) {
  return String(url || '')
    .replace(/&amp;/g, '&')
    .replace(/&#0?38;/g, '&')
    .trim()
}

function entryUrl(entry) {
  if (!entry) return null
  if (typeof entry === 'string') return entry
  return entry?.$?.url || entry?.url || null
}

function collectMedia(entry, out) {
  if (!entry) return
  for (const item of Array.isArray(entry) ? entry : [entry]) {
    const url = entryUrl(item)
    if (url) out.push(url)
  }
}

/** The first usable image offered by the feed item itself. */
export function firstImage(item) {
  const candidates = []

  collectMedia(item?.mediaContent, candidates)
  collectMedia(item?.mediaGroup?.['media:content'], candidates)
  collectMedia(item?.mediaGroup?.mediaContent, candidates)
  collectMedia(item?.['media:content'], candidates)
  collectMedia(item?.mediaThumbnail, candidates)
  collectMedia(item?.['media:thumbnail'], candidates)
  collectMedia(item?.enclosure, candidates)

  if (item?.image?.url) candidates.push(item.image.url)
  if (item?.['itunes:image']?.$?.href) candidates.push(item['itunes:image'].$.href)
  if (item?.enclosure?.url) candidates.push(item.enclosure.url)

  for (const html of [item?.contentEncoded, item?.content, item?.description, item?.summary]) {
    if (!html) continue
    const matches = String(html).matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
    for (const match of matches) candidates.push(match[1])
  }

  return (
    candidates
      .map(decodeUrl)
      .find(
        (url) =>
          /^https?:\/\//i.test(url) &&
          !/^data:/i.test(url) &&
          !/pixel|tracking|1x1|spacer/i.test(url)
      ) || null
  )
}

function channelImage(feed) {
  const candidates = []
  if (feed?.image?.url) candidates.push(feed.image.url)
  collectMedia(feed?.mediaThumbnail, candidates)
  if (feed?.['itunes:image']?.$?.href) candidates.push(feed['itunes:image'].$.href)
  return candidates.map(decodeUrl).find((url) => /^https?:\/\//i.test(url)) || null
}

function guessSection(item, fallback) {
  const haystack = [...(item.categories || []), item.title, item.contentSnippet]
    .join(' ')
    .toLowerCase()

  for (const [section, words] of SECTION_HINTS) {
    if (words.some((word) => haystack.includes(word))) return section
  }
  return fallback
}

function truncate(text, limit) {
  const value = String(text || '').trim()
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 1).trimEnd()}…`
}

function cleanTags(item) {
  const list = Array.isArray(item.categories) ? item.categories : []
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
        .filter((tag) => tag.length > 2 && tag.length < 40)
    ),
  ].slice(0, 6)
}

/** Ask the publisher's article page for its Open Graph / Twitter image. */
export async function fetchOgImage(link) {
  if (!/^https?:\/\//i.test(String(link || ''))) return null

  try {
    const response = await fetch(link, {
      headers: {
        'User-Agent': `${UA} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36`,
        Accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) return null

    const html = await response.text()
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(html)
      const url = decodeUrl(match?.[1])
      if (url && /^https?:\/\//i.test(url)) return url
    }
    return null
  } catch {
    return null
  }
}

async function loadFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(9000),
    })
    if (!response.ok) throw new Error(String(response.status))
    const xml = await response.text()
    const parsed = await parser.parseString(xml)
    const fallbackImage = channelImage(parsed)

    return (parsed.items || [])
      .slice(0, 15)
      .map((item) => {
        const snippet = clean(item.contentSnippet || item.description || item.content || '')
        const copy = clean(item.contentEncoded || item.content || item.description || '')
        const summary = truncate(snippet || copy, 240)
        const body = copy.length > snippet.length ? copy : snippet

        return {
          title: clean(item.title),
          link: item.link,
          summary,
          content: truncate(body, 12000),
          image: firstImage(item),
          fallbackImage,
          publishedAt:
            item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null),
          source: feed.name,
          sourceUrl: feed.home,
          section: guessSection(item, feed.section),
          tags: cleanTags(item),
        }
      })
      .filter((item) => item.title && item.link)
  } catch {
    return []
  }
}

const loadWire = cache(async (limitCount = 40) => {
  const results = (await Promise.all(FEEDS.map(loadFeed))).filter((items) => items.length)
  if (!results.length) return []

  // Round-robin so one prolific publisher cannot fill the whole wire.
  const merged = []
  const seen = new Set()
  for (let i = 0; merged.length < limitCount && i < 20; i += 1) {
    for (const feed of results) {
      const item = feed[i]
      if (!item) continue
      const key = String(item.title).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
      if (merged.length >= limitCount) break
    }
  }
  return merged
})

export async function getWire(limitCount = 40) {
  return loadWire(limitCount)
}

/** The wire grouped into the sections the front page prints. */
export async function getWireBySection(sections, perSection = 3) {
  const items = await loadWire(60)
  return sections
    .map((section) => ({
      section,
      items: items.filter((item) => item.section === section.slug).slice(0, perSection),
    }))
    .filter((entry) => entry.items.length > 0)
}
