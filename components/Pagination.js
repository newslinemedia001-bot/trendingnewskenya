import Link from 'next/link'
import styles from './Stories.module.css'

export default function Pagination({ basePath, page, totalPages }) {
  if (totalPages <= 1) return null
  const prev = page > 1 ? (page === 2 ? basePath : `${basePath}?page=${page - 1}`) : null
  const next = page < totalPages ? `${basePath}?page=${page + 1}` : null

  return (
    <nav className={styles.pager} aria-label="Pagination">
      <span className={styles.pagerInfo}>
        Page {page} of {totalPages}
      </span>
      <div className={styles.pagerLinks}>
        {prev ? (
          <Link href={prev} className="btn btnGhost btnSmall" rel="prev">
            ← Newer
          </Link>
        ) : (
          <span className="btn btnGhost btnSmall" aria-disabled="true" style={{ opacity: 0.4 }}>
            ← Newer
          </span>
        )}
        {next ? (
          <Link href={next} className="btn btnGhost btnSmall" rel="next">
            Older →
          </Link>
        ) : (
          <span className="btn btnGhost btnSmall" aria-disabled="true" style={{ opacity: 0.4 }}>
            Older →
          </span>
        )}
      </div>
    </nav>
  )
}
