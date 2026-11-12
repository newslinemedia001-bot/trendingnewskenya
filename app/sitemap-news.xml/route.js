import { getAllArticles } from '@/lib/content'
import { SITE_NAME, siteUrl } from '@/lib/site'

export const dynamic = 'force-static'
export const revalidate = 900

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const base = siteUrl()
  // Google News only wants the last two days of stories.
  const cutoff = Date.now() - 48 * 60 * 60 * 1000

  const articles = (await getAllArticles())
    .filter((a) => new Date(a.publishedAt || 0).getTime() >= cutoff)
    .slice(0, 1000)

  const items = articles
    .map(
      (a) => `  <url>
    <loc>${esc(`${base}/news/${a.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
