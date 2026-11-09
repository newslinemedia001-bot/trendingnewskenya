import { notFound } from 'next/navigation'
import { getSectionPage } from '@/lib/content'
import { SECTIONS, SITE_NAME, sectionBySlug, siteUrl } from '@/lib/site'
import StoryCard from '@/components/StoryCard'
import Pagination from '@/components/Pagination'
import styles from '@/app/inner.module.css'

export const revalidate = 60

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ slug: section.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const section = sectionBySlug(slug)
  if (!section) return { title: 'Section not found', robots: { index: false } }

  return {
    title: section.title,
    description: section.description,
    keywords: section.keywords,
    alternates: {
      canonical: `/section/${section.slug}`,
      types: { 'application/rss+xml': '/feed.xml' },
    },
    openGraph: {
      title: section.title,
      description: section.description,
      url: `/section/${section.slug}`,
      siteName: SITE_NAME,
      locale: 'en_KE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: section.title,
      description: section.description,
    },
  }
}

export default async function SectionPage({ params, searchParams }) {
  const { slug } = await params
  const section = sectionBySlug(slug)
  if (!section) notFound()

  const sp = await searchParams
  const requested = Math.max(1, parseInt(sp?.page || '1', 10) || 1)
  const { articles, total, page, totalPages } = await getSectionPage(slug, requested)
  if (!articles.length && requested > 1) notFound()

  const canonical = page === 1 ? `/section/${slug}` : `/section/${slug}?page=${page}`
  const lead = page === 1 ? articles[0] : null
  const rest = page === 1 ? articles.slice(1) : articles
  const grid = lead ? rest : articles

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: section.title,
    description: section.description,
    url: `${siteUrl()}${canonical}`,
    isPartOf: { '@id': `${siteUrl()}/#website` },
    publisher: { '@id': `${siteUrl()}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: grid.slice(0, 12).map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl()}/news/${article.slug}`,
        name: article.title,
      })),
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl() },
      {
        '@type': 'ListItem',
        position: 2,
        name: section.label,
        item: `${siteUrl()}/section/${slug}`,
      },
    ],
  }

  return (
    <div className={`container ${styles.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.headerKicker}>
              <span className="liveDot" aria-hidden="true" />
              Section
            </p>
            <h1 className={styles.headerTitle}>{section.label}</h1>
          </div>
          <p className={styles.headerCount}>
            {total} {total === 1 ? 'story' : 'stories'}
          </p>
        </div>
        <p className={styles.headerDek}>{section.intro}</p>
      </header>

      {articles.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No {section.label} stories yet</h2>
          <p>
            The newsroom is still filing this section. Check the front page for the latest
            reporting.
          </p>
        </div>
      ) : (
        <>
          {lead && (
            <div className={styles.lead}>
              <StoryCard article={lead} variant="lead" priority />
              <div className={styles.leadList}>
                {rest.slice(0, 3).map((article) => (
                  <StoryCard key={article.slug} article={article} variant="compact" />
                ))}
              </div>
            </div>
          )}

          <div className={styles.sectionGrid}>
            {(lead ? rest.slice(3) : grid).map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>

          <Pagination basePath={`/section/${slug}`} page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  )
}
