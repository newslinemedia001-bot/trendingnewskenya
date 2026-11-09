import Link from 'next/link'
import { getAllArticles } from '@/lib/content'
import { syncWire } from '@/lib/wire-sync'
import {
  SITE_NAME,
  dateline,
  formatTime,
  sectionLabel,
  siteUrl,
} from '@/lib/site'
import styles from '@/app/inner.module.css'

export const revalidate = 60

export const metadata = {
  title: 'Latest news from Kenya and the world',
  description:
    'The latest reporting from the Trending News Kenya newsroom, in chronological order: Kenya, politics, business, technology, sport, Africa and the world.',
  alternates: {
    canonical: '/latest',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    title: `Latest news - ${SITE_NAME}`,
    description: 'Every story from the Trending News Kenya newsroom, newest first.',
    url: '/latest',
    type: 'website',
    locale: 'en_KE',
  },
}

const DATE_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export default async function LatestPage() {
  try {
    await syncWire()
  } catch {
    // Stored stories still render if a feed is down.
  }

  const articles = await getAllArticles()

  const groups = []
  for (const article of articles) {
    const key = DATE_KEY.format(new Date(article.publishedAt))
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, date: dateline(article.publishedAt), items: [] }
      groups.push(group)
    }
    group.items.push(article)
  }

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Latest news',
    url: `${siteUrl()}/latest`,
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 30).map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${siteUrl()}/news/${article.slug}`,
      name: article.title,
    })),
  }

  return (
    <div className={`container ${styles.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.headerKicker}>
              <span className="liveDot" aria-hidden="true" />
              Every story, in order
            </p>
            <h1 className={styles.headerTitle}>Latest</h1>
          </div>
          <p className={styles.headerCount}>{articles.length} stories</p>
        </div>
        <p className={styles.headerDek}>
          Every story published on the site — the newsroom&apos;s own reporting and credited wire
          copy — newest first. Times are Nairobi time.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.key} className={styles.latestGroup} aria-label={group.date}>
          <h2 className={styles.latestDate}>
            {group.date}
            <span>{group.items.length} stories</span>
          </h2>
          <div className={styles.latestItems}>
            {group.items.map((article) => (
              <div key={article.slug} className={styles.latestRow}>
                <time className={styles.latestTime} dateTime={article.publishedAt}>
                  {formatTime(article.publishedAt)}
                </time>
                <h3 className={styles.latestHeadline}>
                  <Link href={article.href}>{article.title}</Link>
                </h3>
                {article.wire ? (
                  <span className={styles.latestSection}>{article.source}</span>
                ) : (
                  <Link href={`/section/${article.section}`} className={styles.latestSection}>
                    {sectionLabel(article.section)}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <div className={styles.emptyState}>
          <h2>Nothing published yet</h2>
          <p>New stories will appear here as soon as the newsroom files them.</p>
        </div>
      )}
    </div>
  )
}
