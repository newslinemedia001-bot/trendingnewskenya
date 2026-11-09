import Link from 'next/link'
import styles from './Stories.module.css'

export default function SectionHeader({ title, kicker, href, moreLabel, compact = false }) {
  return (
    <header className={`${styles.sectionHeader} ${compact ? styles.sectionHeaderCompact : ''}`}>
      <div className={styles.sectionTitleWrap}>
        {kicker && <span className={styles.sectionKicker}>{kicker}</span>}
        <h2 className={styles.sectionTitle}>
          {href ? <Link href={href}>{title}</Link> : title}
        </h2>
      </div>
      {href && (
        <Link href={href} className={styles.more}>
          {moreLabel || `See all ${title}`} <span aria-hidden="true">→</span>
        </Link>
      )}
    </header>
  )
}
