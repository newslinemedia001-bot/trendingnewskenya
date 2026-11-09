import Link from 'next/link'
import styles from './Stories.module.css'

export default function MostRead({ articles, title = 'Most read' }) {
  if (!articles?.length) return null

  return (
    <section className={styles.mostRead} aria-labelledby="most-read-title">
      <h2 className={styles.mostReadTitle} id="most-read-title">
        {title}
        <span aria-hidden="true">Top 5</span>
      </h2>
      <ol className={styles.mostReadList}>
        {articles.map((article, index) => (
          <li key={article.slug} className={styles.mostReadItem}>
            <span className={styles.mostReadNum} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Link href={article.href || `/news/${article.slug}`} className={styles.mostReadLink}>
              {article.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
