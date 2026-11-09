import Link from 'next/link'
import { getAuthors } from '@/lib/content'
import { SITE_NAME } from '@/lib/site'
import styles from '@/app/inner.module.css'

export const revalidate = 3600

export const metadata = {
  title: 'Writers and editors',
  description:
    'The journalists and editors of Trending News Kenya: who they are, what they cover and where their reporting appears.',
  alternates: { canonical: '/authors' },
  openGraph: {
    title: `Writers and editors - ${SITE_NAME}`,
    description: 'The newsroom behind Trending News Kenya.',
    url: '/authors',
    type: 'website',
    locale: 'en_KE',
  },
}

export default async function AuthorsPage() {
  const authors = await getAuthors()

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.headerKicker}>The newsroom</p>
            <h1 className={styles.headerTitle}>Writers</h1>
          </div>
          <p className={styles.headerCount}>{authors.length} journalists</p>
        </div>
        <p className={styles.headerDek}>
          Every story carries a byline. These are the reporters and editors who file for
          Trending News Kenya — and the subjects they know best.
        </p>
      </header>

      <div className={styles.authorGrid}>
        {authors.map((author) => {
          const initials = author.name
            .replace(/^The /, '')
            .split(' ')
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join('')

          return (
            <article key={author.slug} className={styles.authorCard}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
              <div>
                <h2 className={styles.authorName}>
                  <Link href={`/authors/${author.slug}`}>{author.name}</Link>
                </h2>
                <p className={styles.authorRole}>{author.role}</p>
                <p className={styles.authorBio}>{author.bio}</p>
                <p className={styles.authorCount}>
                  {author.count} {author.count === 1 ? 'story' : 'stories'}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
