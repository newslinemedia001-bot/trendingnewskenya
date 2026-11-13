import Link from 'next/link'
import styles from './Stories.module.css'

/**
 * The breaking bar: the latest headlines drift from right to left, so a reader
 * sees every line without waiting for a rotation timer.
 *
 * The list is printed twice inside one track; the track slides a full half of
 * its own width and then starts over, which is what makes the loop seamless.
 * The second copy is hidden from assistive tech and taken out of the tab order
 * so each headline is announced and reachable once. Motion pauses on hover and
 * focus, and is disabled entirely for readers who ask for reduced motion.
 */
export default function BreakingBar({ items }) {
  const list = (items || []).filter((i) => i?.href && i?.title)
  if (!list.length) return null
  const track = [...list, ...list]

  return (
    <section className={styles.ticker} aria-label="Breaking news">
      <div className={`container ${styles.tickerInner}`}>
        <span className={styles.tickerLabel}>
          <span className={styles.tickerPulse} aria-hidden="true" />
          Breaking
        </span>
        <div className={styles.tickerViewport}>
          <div className={styles.tickerTrack}>
            {track.map((item, index) => {
              const copy = index >= list.length
              return (
                <Link
                  key={`${item.href}-${index}`}
                  href={item.href}
                  className={styles.tickerItem}
                  aria-hidden={copy ? 'true' : undefined}
                  tabIndex={copy ? -1 : undefined}
                >
                  {item.title}
                </Link>
              )
            })}
          </div>
        </div>
        <Link href="/latest" className={styles.tickerMore}>
          All headlines <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
