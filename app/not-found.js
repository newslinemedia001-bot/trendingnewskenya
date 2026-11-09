import Link from 'next/link'
import { SECTIONS } from '@/lib/site'
import styles from '@/app/inner.module.css'

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="container page">
      <header className={styles.header}>
        <p className={styles.headerKicker}>Error 404</p>
        <h1 className={styles.headerTitle}>That page has left the building.</h1>
        <p className={styles.headerDek}>
          The story may have moved, been renamed, or never existed. The front page is a
          good place to start again.
        </p>
      </header>

      <p style={{ marginBottom: 24 }}>
        <Link className="btn" href="/">
          Go to the front page
        </Link>
      </p>

      <div className={styles.sectionGrid}>
        {SECTIONS.slice(0, 6).map((section) => (
          <div key={section.slug} className={styles.creditCard}>
            <h2 className={styles.authorName} style={{ fontSize: 22 }}>
              <Link href={`/section/${section.slug}`}>{section.label}</Link>
            </h2>
            <p className={styles.creditMeta}>{section.intro}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
