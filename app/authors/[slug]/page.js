import { notFound } from 'next/navigation'
import { getAuthor } from '@/lib/content'
import { SITE_NAME, siteUrl } from '@/lib/site'
import StoryCard from '@/components/StoryCard'
import styles from '@/app/inner.module.css'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { slug } = await params
  const record = await getAuthor(slug)
  if (!record) return { title: 'Writer not found', robots: { index: false } }

  const { author } = record
  return {
    title: `${author.name} — ${author.role}`,
    description: author.bio,
    alternates: { canonical: `/authors/${author.slug}` },
    openGraph: {
      title: `${author.name} - ${SITE_NAME}`,
      description: author.bio,
      url: `/authors/${author.slug}`,
      type: 'profile',
      locale: 'en_KE',
    },
  }
}

export default async function AuthorPage({ params }) {
  const { slug } = await params
  const record = await getAuthor(slug)
  if (!record) notFound()

  const { author, articles } = record
  const initials = author.name
    .replace(/^The /, '')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')

  const profileLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.role,
      description: author.bio,
      url: `${siteUrl()}/authors/${author.slug}`,
      worksFor: { '@id': `${siteUrl()}/#organization` },
    },
  }

  return (
    <div className={`container ${styles.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }}
      />

      <div className={styles.profile}>
        <div className={styles.profileAvatar} aria-hidden="true">
          {initials}
        </div>
        <div>
          <p className={styles.headerKicker}>Writer</p>
          <h1 className={styles.profileName}>{author.name}</h1>
          <p className={styles.profileRole}>{author.role}</p>
          <p className={styles.profileBio}>{author.bio}</p>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.headerTitle} style={{ fontSize: 28 }}>
            Recent stories
          </h2>
          <p className={styles.headerCount}>
            {articles.length} {articles.length === 1 ? 'story' : 'stories'}
          </p>
        </div>
      </header>

      {articles.length ? (
        <div className={styles.sectionGrid}>
          {articles.map((article) => (
            <StoryCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>No stories yet</h2>
          <p>This writer’s reporting will appear here.</p>
        </div>
      )}
    </div>
  )
}
