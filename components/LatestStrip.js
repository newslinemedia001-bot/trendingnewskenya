import Link from 'next/link'
import { formatTime, relativeTime } from '@/lib/site'
import styles from './Stories.module.css'

function isToday(iso) {
  if (!iso) return false
  const now = new Date()
  const then = new Date(iso)
  return (
    now.getFullYear() === then.getFullYear() &&
    now.getMonth() === then.getMonth() &&
    now.getDate() === then.getDate()
  )
}

function timeLabel(iso) {
  return isToday(iso) ? formatTime(iso) : relativeTime(iso)
}

export default function LatestStrip({ articles, title = 'Latest headlines' }) {
  if (!articles?.length) return null
  const half = Math.ceil(articles.length / 2)
  const columns = [articles.slice(0, half), articles.slice(half)]

  return (
    <section className={styles.latest} aria-labelledby="latest-headlines">
      <div className={styles.latestHead}>
        <h2 className={styles.latestTitle} id="latest-headlines">
          <span className="liveDot" aria-hidden="true" />
          {title}
        </h2>
        <span className={styles.latestTime}>Updated continuously</span>
      </div>
      <div className={styles.latestGrid}>
        {columns.map((column, index) => (
          <div key={index}>
            {column.map((article) => (
              <div key={article.slug} className={styles.latestItem}>
                <time className={styles.latestItemTime} dateTime={article.publishedAt}>
                  {timeLabel(article.publishedAt)}
                </time>
                <h3 className={styles.latestItemHeadline}>
                  <Link href={article.href || `/news/${article.slug}`}>{article.title}</Link>
                </h3>
                {article.wire ? (
                  <span className={styles.latestItemSource}>{`Source: ${article.source}`}</span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
