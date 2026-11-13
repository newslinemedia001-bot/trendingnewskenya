import { articleImageUrl, getAllArticles } from '@/lib/content'
import { siteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'
// Supabase reads go through fetch: never reuse a cached response.
export const fetchCache = 'force-no-store'

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function dateOf(value) {
  const date = new Date(value || 0)
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()
}

export async function GET() {
  const base = siteUrl()
  // Stored rows only: serving the feed never fetches a publisher feed or
  // writes to the database.
  // Every published story goes in the feed, exactly as it appears on the site:
  // no paragraph filter, so short wire items are not held back.
  const articles = (await getAllArticles())
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 30)

  const items = articles
    .map((article) => {
      const link = `${base}${article.href}`
      const creator = article.wire ? article.source : article.author.name
      const credit = article.wire
        ? `\n      <dc:source>${esc(article.source)}</dc:source>`
        : ''
      // Every article has an image, and feed readers need an absolute URL.
      const imageSrc = articleImageUrl(article)
      const image = `\n      <media:content url="${esc(imageSrc)}" type="${/\.png$/i.test(imageSrc) ? 'image/png' : 'image/jpeg'}" />`

      return `
    <item>
      <title>${esc(article.title)}</title>
      <link>${esc(link)}</link>
      <description>${esc(article.dek || article.title)}</description>
      <dc:creator>${esc(creator)}</dc:creator>${credit}
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${dateOf(article.publishedAt)}</pubDate>${image}
    </item>`
    })
    .join('')

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Trending News Kenya — Latest</title>
    <link>${esc(base)}</link>
    <description>The latest published stories from Trending News Kenya, including credited wire copy.</description>
    <language>en_KE</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>5</ttl>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${esc(base)}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Readers and the CDN must always ask the server for the current set:
      // a cached copy is why the feed kept showing yesterday's stories.
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Netlify-CDN-Cache-Control': 'no-store',
    },
  })
}
