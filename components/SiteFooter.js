import Link from 'next/link'
import { SECTIONS, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import styles from './SiteFooter.module.css'

const year = 2026

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.flag} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.wordmark} aria-label={`${SITE_NAME} — home`}>
            <span className={styles.wordTop}>Trending News</span>
            <span className={styles.wordKenya}>Kenya</span>
          </Link>
          <p className={styles.brandCopy}>{SITE_DESCRIPTION}</p>
          <Link href="/newsletter" className={styles.briefing}>
            The Briefing — the day’s news in one calm email
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <nav className={styles.cols} aria-label="Footer">
          <div className={styles.col}>
            <h2>Sections</h2>
            {SECTIONS.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/section/${s.slug}`}>
                {s.label}
              </Link>
            ))}
          </div>
          <div className={styles.col}>
            <h2>More sections</h2>
            {SECTIONS.slice(6).map((s) => (
              <Link key={s.slug} href={`/section/${s.slug}`}>
                {s.label}
              </Link>
            ))}
            <Link href="/latest">Latest</Link>
            <Link href="/wire">The wire</Link>
          </div>
          <div className={styles.col}>
            <h2>The paper</h2>
            <Link href="/about">About us</Link>
            <Link href="/about#standards">Editorial standards</Link>
            <Link href="/authors">Writers</Link>
            <Link href="/topics">Topics</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/credits">Photo credits</Link>
          </div>
          <div className={styles.col}>
            <h2>More</h2>
            <Link href="/search">Search</Link>
            <Link href="/newsletter">Newsletters</Link>
            <Link href="/feed.xml">RSS feed</Link>
            <Link href="/sitemap.xml">Sitemap</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </nav>
      </div>

      <div className={styles.bottom}>
        <div className={`container ${styles.bottomInner}`}>
          <p>
            © {year} {SITE_NAME}. All rights reserved.
          </p>
          <p className={styles.bottomNote}>
            Reporting from Nairobi. Photography credited to its authors.
            <Link href="/credits"> Full credits</Link>.
          </p>
        </div>
      </div>
    </footer>
  )
}
