import { getWireArticles } from '@/lib/content'
import { syncWire } from '@/lib/wire-sync'
import { SITE_NAME } from '@/lib/site'
import StoryCard from '@/components/StoryCard'
import styles from '@/app/inner.module.css'

export const revalidate = 60

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
  try {
    await syncWire()
  } catch {
    // Stored headlines still render if a feed is down.
  }

  const items = await getWireArticles(60)

  return (
    <div className="container page">
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
          Headlines from other publishers, refreshed automatically. Every story is stored here
          and opens on this site with credit to the newsroom that wrote it.
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
