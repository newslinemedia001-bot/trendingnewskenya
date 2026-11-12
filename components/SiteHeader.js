import Image from 'next/image'
import Link from 'next/link'
import { SITE_NAME, datelineLong, todayKey } from '@/lib/site'
import NavLinks from './NavLinks'
import styles from './SiteHeader.module.css'

export default function SiteHeader() {
  const isoDate = todayKey()
  const today = datelineLong(isoDate)

  return (
    <header className={styles.header}>
      <a href="#main" className="skipLink">
        Skip to main content
      </a>

      <div className={styles.utility}>
        <div className={`container ${styles.utilityInner}`}>
          <p className={styles.dateline}>
            <time dateTime={isoDate}>{today}</time>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.edition}>Nairobi, Kenya</span>
          </p>
          <nav className={styles.utilityNav} aria-label="Reader services">
            <Link href="/latest">Today’s paper</Link>
            <Link href="/authors">Writers</Link>
            <Link href="/newsletter">Newsletters</Link>
            <Link href="/search">Search</Link>
            <Link href="/login">Sign in</Link>
            <a href="/feed.xml" aria-label="RSS feed">
              RSS
            </a>
          </nav>
        </div>
      </div>

      <div className={`container ${styles.masthead}`}>
        <p className={styles.mastSide}>
          <span className={styles.liveBadge}>
            <span className={`liveDot ${styles.liveDot}`} aria-hidden="true" />
            Live
          </span>
          <span className={styles.mastSub}>Nairobi, Kenya</span>
        </p>

        <Link href="/" className={styles.wordmark} aria-label="Trending News Kenya — home">
          <Image
            src="/brand/logo-light.png"
            alt={SITE_NAME}
            width={1307}
            height={362}
            priority
            className={styles.logoImg}
          />
        </Link>

        <div className={styles.mastRight}>
          <Link href="/search" className={styles.search}>
            Search
          </Link>
        </div>
      </div>

      <div className={styles.navBar}>
        <div className={`container ${styles.navInner}`}>
          <nav className={styles.nav} aria-label="Sections">
            <NavLinks />
          </nav>
          <Link href="/newsletter" className={styles.briefing}>
            The Briefing
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
