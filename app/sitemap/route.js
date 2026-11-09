import { getAllArticles, getAllSections, getAuthors } from '@/lib/content'

export const dynamic = 'force-static'
export const revalidate = 3600

const PRIORITY = {
  article: 0.7,
  section: 0.6,
  author: 0.4,
  static: 0.5,
}

export async function GET() {
  const base = 'https://trendingnewskenya.co.ke'
  const now = new Date()

  // Static pages
  const staticRoutes = [
    { url: base, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/latest`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/section/kenya`, priority: PRIORITY.section, lastmod: now },
    { url: `${base}/about`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/contact`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/privacy`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/terms`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/search`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/wire`, priority: PRIORITY.static, lastmod: now },
    { url: `${base}/newsletter`, priority: PRIORITY.static, lastmod: now },
  ]

  // Sections
  const sections = await getAllSections()
  const sectionRoutes = sections.map((s) => ({
    url: `${base}/section/${s.slug}`,
    priority: PRIORITY.section,
    lastmod: now,
  }))

  // Authors
  const authors = await getAuthors()
  const authorRoutes = authors.map((a) => ({
    url: `${base}/authors/${a.slug || a.name.toLowerCase().replace(/ /g, '-')}`,
    priority: PRIORITY.author,
    lastmod: now,
  }))

  // Articles (every stored article is already published-only)
  const articles = await getAllArticles()
  const articleRoutes = articles
    .slice(0, 2000) // sitemap limit
    .map((a) => ({
      url: `${base}/news/${a.slug}`,
      priority: PRIORITY.article,
      lastmod: new Date(a.updatedAt || a.publishedAt),
    }))

  const all = [...staticRoutes, ...sectionRoutes, ...authorRoutes, ...articleRoutes]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${all
    .map(
      (r) =>
        `<url>
      <loc>${r.url}</loc>
      <lastmod>${r.lastmod.toISOString().split('T')[0]}</lastmod>
      <priority>${r.priority}</priority>
    </url>`
    )
    .join('')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}