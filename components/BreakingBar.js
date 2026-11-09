'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './Stories.module.css'

const CYCLE_MS = 6000

export default function BreakingBar({ items }) {
  const list = (items || []).filter((i) => i?.href && i?.title)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (list.length < 2) return
    const timer = setInterval(() => setIndex((i) => i + 1), CYCLE_MS)
    return () => clearInterval(timer)
  }, [list.length])

  if (!list.length) return null
  const current = list[index % list.length]

  return (
    <section className={styles.ticker} aria-label="Breaking news">
      <div className={`container ${styles.tickerInner}`}>
        <span className={styles.tickerLabel}>
          <span className={styles.tickerPulse} aria-hidden="true" />
          Breaking
        </span>
        <Link key={index} href={current.href} className={styles.tickerItem} aria-live="polite">
          {current.title}
        </Link>
        <Link href="/latest" className={styles.tickerMore}>
          All headlines <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
