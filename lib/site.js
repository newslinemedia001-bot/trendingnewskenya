export const SITE_NAME = 'Trending News Kenya'
export const SITE_SHORT = 'TNK'
export const SITE_TAGLINE = 'Kenya, in focus.'
export const SITE_DESCRIPTION =
  'Trending News Kenya is an independent digital newspaper in Nairobi covering Kenyan politics, business, technology, sport, entertainment, Africa and the world.'
export const SITE_EDITION = 'Nairobi edition'

/**
 * Sections, in navigation order. `kicker` is the small label used above
 * headlines; `title`/`description` are the on-page SEO metadata for the
 * section front (written for the queries Kenyans actually search).
 */
export const SECTIONS = [
  {
    slug: 'kenya',
    label: 'Kenya',
    kicker: 'The nation',
    title: 'Kenya News Today — Politics, Counties and the Economy',
    description:
      'Kenya news today: the capital, the counties, public finances and the stories shaping daily life, reported from Nairobi by Trending News Kenya.',
    keywords: ['kenya news today', 'kenya news', 'nairobi news', 'kenya breaking news', 'county news kenya'],
    intro:
      'The capital, the counties and the economy — reported from Nairobi and from the places the headlines usually skip.',
  },
  {
    slug: 'politics',
    label: 'Politics',
    kicker: 'Power & policy',
    title: 'Kenya Politics News — Parliament, Counties and Policy',
    description:
      'Kenyan politics explained: Parliament, devolution, public finance and the policy fights that decide how the country is run.',
    keywords: ['kenya politics', 'kenya parliament news', 'kenya politics today', 'devolution kenya', 'kenya policy'],
    intro:
      'Parliament, devolution and the policy fights that decide how Kenya is run — without the press-release fog.',
  },
  {
    slug: 'business',
    label: 'Business',
    kicker: 'Markets & money',
    title: 'Kenya Business News — Markets, Trade and the Economy',
    description:
      'Kenya business news today: markets, banking, trade, agriculture and the companies moving the Kenyan economy.',
    keywords: ['kenya business news', 'business news kenya today', 'kenya economy', 'nairobi business', 'kenya markets'],
    intro:
      'Markets, trade, agriculture and the companies moving the Kenyan economy — with the numbers and the context.',
  },
  {
    slug: 'technology',
    label: 'Technology',
    kicker: 'Innovation',
    title: 'Kenya Tech News — Startups, Fintech and Digital Policy',
    description:
      'Kenya technology news: fintech, startups, connectivity, AI and the digital policy shaping Nairobi’s tech scene.',
    keywords: ['kenya tech news', 'kenya fintech', 'nairobi startups', 'kenya technology', 'mobile money kenya'],
    intro:
      'Fintech, startups, connectivity and the digital rules that shape them — from Nairobi’s growing technology scene.',
  },
  {
    slug: 'sport',
    label: 'Sport',
    kicker: 'On the field',
    title: 'Kenya Sport News — Athletics, Football and Rugby',
    description:
      'Kenya sport news: athletics, the Harambee Stars, Kenya Sevens, club football and the stories behind the results.',
    keywords: ['kenya sports news', 'kenya athletics', 'harambee stars', 'kenya sevens', 'kenya football news'],
    intro:
      'Athletics, football, rugby and the people and places that produce Kenya’s champions.',
  },
  {
    slug: 'entertainment',
    label: 'Entertainment',
    kicker: 'Culture',
    title: 'Kenya Entertainment News — Music, Film and Culture',
    description:
      'Kenya entertainment news: music, film, television, festivals and the business of Kenyan culture.',
    keywords: ['kenya entertainment news', 'kenyan music', 'kenya film', 'kenya celebrities', 'nairobi events'],
    intro:
      'Music, film, television and the business of Kenyan culture — the work behind the moment.',
  },
  {
    slug: 'africa',
    label: 'Africa',
    kicker: 'The continent',
    title: 'Africa News — East Africa and the Continent',
    description:
      'Africa news and analysis: East African politics, trade, security and the continental decisions that reach Kenyan households.',
    keywords: ['africa news', 'east africa news', 'african union news', 'africa politics', 'kenya africa'],
    intro:
      'East Africa and the wider continent — trade, security and the decisions in Addis, Kampala and Dar that reach Kenyan households.',
  },
  {
    slug: 'world',
    label: 'World',
    kicker: 'Global',
    title: 'World News — Global Headlines and Analysis',
    description:
      'World news today: global politics, markets, conflict and the international stories that matter to readers in Kenya.',
    keywords: ['world news today', 'global news', 'international news', 'world headlines'],
    intro:
      'Global politics, markets and conflict — translated for readers whose lives are already tied to them.',
  },
  {
    slug: 'opinion',
    label: 'Opinion',
    kicker: 'The argument',
    title: 'Opinion — Analysis and Editorials from Kenya',
    description:
      'Kenyan opinion and analysis: editorials, columns and arguments about power, money, cities and public life.',
    keywords: ['kenya opinion', 'kenya editorials', 'kenya analysis', 'kenyan columnists'],
    intro:
      'Editorials, columns and arguments about power, money and public life — signed, argued and open to reply.',
  },
  {
    slug: 'life',
    label: 'Life',
    kicker: 'Living',
    title: 'Life in Kenya — Travel, Food, Culture and the City',
    description:
      'Life in Kenya: the coast, the city after dark, food, travel and the culture of everyday Kenyan life.',
    keywords: ['life in kenya', 'kenya travel', 'kenya food', 'nairobi lifestyle', 'kenya coast'],
    intro:
      'The coast, the city after dark, food and the small economies of everyday Kenyan life.',
  },
]

export const SECTION_SLUGS = SECTIONS.map((s) => s.slug)

export function sectionBySlug(slug) {
  return SECTIONS.find((s) => s.slug === slug) || null
}

export function sectionLabel(slug) {
  return sectionBySlug(slug)?.label || 'News'
}

export function sectionKicker(slug) {
  return sectionBySlug(slug)?.kicker || 'News'
}

export function sectionIntro(slug) {
  return sectionBySlug(slug)?.intro || ''
}

// Topics are editorial tags, not database rows: they are derived from article
// tags and get their own indexable landing pages for topical authority.
export const TOPIC_COPY = {
  'public-finance': 'Budgets, taxes, debt and how public money is raised and spent in Kenya.',
  'nairobi': 'The capital’s growth, transport, housing and the politics of the city.',
  'transport': 'Matatus, commuter rail, roads and the daily cost of getting around Nairobi.',
  'agriculture': 'Tea, coffee, flowers and the smallholders who anchor Kenya’s exports.',
  'mobile-money': 'M-Pesa, payments, interoperability and the economics of Kenyan fintech.',
  'startups': 'Funding, founders and the companies building Kenya’s technology economy.',
  'energy': 'Geothermal, solar and the grid that powers Kenyan industry.',
  'athletics': 'Training camps, agents and the business of Kenyan distance running.',
  'rugby': 'Kenya Sevens, club rugby and the long road back to the world series.',
  'music': 'Artists, labels, streaming and the money behind Kenyan music.',
  'film': 'Kenyan cinema, production and the screens people actually watch.',
  'conservation': 'Wildlife, tourism and the fight over land and water.',
  'trade': 'Imports, exports, ports and Kenya’s place in regional commerce.',
  'devolution': 'Counties, governors and the promises of the 2010 constitution.',
  'education': 'Schools, the CBC curriculum and what learning costs Kenyan families.',
  'climate': 'Drought, floods and the changing weather across the Horn of Africa.',
  'elections': 'Campaigns, coalitions and the institutions that run Kenyan votes.',
}

export function topicLabel(tag) {
  if (TOPIC_COPY[tag]) {
    return tag
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
  return tag
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

export function absUrl(src) {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  return siteUrl() + (src.startsWith('/') ? src : `/${src}`)
}

/**
 * Publisher images are streamed through our own origin so hosts that block
 * hotlinks still show their pictures. Local/Firebase images pass through.
 */
export function remoteImageUrl(src) {
  if (!src) return src
  return /^https?:\/\//i.test(src)
    ? `/api/wire/image?url=${encodeURIComponent(src)}`
    : src
}

const NAIROBI = 'Africa/Nairobi'

export function formatDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'long',
    timeZone: NAIROBI,
  }).format(new Date(iso))
}

export function formatDateShort(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: NAIROBI,
  }).format(new Date(iso))
}

export function formatTime(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: NAIROBI,
  }).format(new Date(iso))
}

/**
 * Today's date as YYYY-MM-DD in Nairobi. Used for machine-readable dates in
 * server-rendered markup: a full timestamp would differ between the server and
 * the browser and break hydration.
 */
export function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function relativeTime(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return `${m} min ago`
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return h === 1 ? '1 hour ago' : `${h} hours ago`
  }
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400)
    return d === 1 ? 'Yesterday' : `${d} days ago`
  }
  return formatDateShort(iso)
}

export function readingTime(body) {
  const words = String(body || '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

/** ISO date shown in the dateline, e.g. "Nov. 6, 2026". */
export function dateline(iso) {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: NAIROBI,
  }).formatToParts(new Date(iso))
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  const year = parts.find((p) => p.type === 'year')?.value
  return `${month}. ${day}, ${year}`
}

export function datelineLong(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: NAIROBI,
  }).format(new Date(iso))
}
