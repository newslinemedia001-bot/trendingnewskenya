import { notFound } from 'next/navigation'
import { getByTopic } from '@/lib/content'
import { SITE_NAME, TOPIC_COPY, topicLabel, siteUrl } from '@/lib/site'
import StoryCard from '@/components/StoryCard'
import styles from '@/app/inner.module.css'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { tag } = await params
  const label = topicLabel(tag)
  const copy = TOPIC_COPY[tag] || `Reporting and analysis about ${label.toLowerCase()} from Kenya.`

  return {
    title: `${label} — news and analysis`,
    description: copy,
    alternates: { canonical: `/topic/${tag}` },
    openGraph: {
      title: `${label} — ${SITE_NAME}`,
      description: copy,
      url: `/topic/${tag}`,
      type: 'website',
      locale: 'en_KE',
    },
  }
}

export default async function TopicPage({ params }) {
  const { tag } = await params
  const articles = await getByTopic(tag)
  if (!articles.length) notFound()

  const label = topicLabel(tag)
  const copy = TOPIC_COPY[tag] || `Reporting and analysis about ${label.toLowerCase()}.`

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} — news and analysis`,
    description: copy,
    url: `${siteUrl()}/topic/${tag}`,
    isPartOf: { '@id': `${siteUrl()}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.map((article, index) => ({
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
      { '@type': 'ListItem', position: 2, name: label, item: `${siteUrl()}/topic/${tag}` },
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
            <p className={styles.headerKicker}>Topic</p>
            <h1 className={styles.headerTitle}>{label}</h1>
          </div>
          <p className={styles.headerCount}>
            {articles.length} {articles.length === 1 ? 'story' : 'stories'}
          </p>
        </div>
        <p className={styles.headerDek}>{copy}</p>
      </header>

      <div className={styles.sectionGrid}>
        {articles.map((article) => (
          <StoryCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  )
}
