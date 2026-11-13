import { getWireArticles } from '@/lib/content'
import { SITE_NAME, siteUrl } from '@/lib/site'
import StoryCard from '@/components/StoryCard'
import styles from '@/app/inner.module.css'

// Render per request so the page always shows the stored archive as it is.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'The wire — headlines from other newsrooms',
  description:
    'Headlines from Kenyan and international newsrooms, published on-site and credited to the publisher that wrote them.',
  alternates: { canonical: '/wire' },
  openGraph: {
    title: `The wire - ${SITE_NAME}`,
    description: 'Headlines from other newsrooms, read on-site with credit to each publisher.',
    url: '/wire',
    type: 'website',
    locale: 'en_KE',
  },
}

export default async function WirePage() {
  // Stored rows only: a reader's visit never triggers a feed fetch or a write.
  const items = await getWireArticles(60)

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The wire — headlines from other newsrooms',
    description:
      'Headlines from Kenyan and international newsrooms, published on-site and credited to the publisher that wrote them.',
    url: `${siteUrl()}/wire`,
    isPartOf: { '@id': `${siteUrl()}/#website` },
    publisher: { '@id': `${siteUrl()}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 60).map((article, index) => ({
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
      { '@type': 'ListItem', position: 2, name: 'The wire', item: `${siteUrl()}/wire` },
    ],
  }

  return (
    <div className="container page">
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
            <p className={styles.headerKicker}>Other newsrooms</p>
            <h1 className={styles.headerTitle}>The wire</h1>
          </div>
          <p className={styles.headerCount}>
            {items.length} {items.length === 1 ? 'story' : 'stories'}
          </p>
        </div>
        <p className={styles.headerDek}>
          Headlines from other publishers, collected by the desk. Every story is stored here and
          opens on this site with credit to the newsroom that wrote it.
        </p>
      </header>

      {items.length ? (
        <div className={styles.sectionGrid}>
          {items.map((article) => (
            <StoryCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>The wire is warming up</h2>
          <p>
            Partner feeds will appear here as soon as they are imported. Our own reporting
            continues on the <a href="/latest">latest page</a>.
          </p>
        </div>
      )}

      <p className={styles.metaNote}>
        Wire stories are republished with credit to the publisher named on each story. Headlines
        remain the copyright of those publishers.
      </p>
    </div>
  )
}
