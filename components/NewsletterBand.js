import NewsletterForm from './NewsletterForm'
import styles from './Stories.module.css'

export default function NewsletterBand({
  kicker = 'The Briefing',
  title = 'The day’s news, in one calm email.',
  copy = 'A short, useful read from the Trending News Kenya newsroom — the stories that matter, the context behind them, and what to watch tomorrow. In your inbox by 6am.',
}) {
  return (
    <section className={styles.newsletter} id="briefing" aria-labelledby="briefing-title">
      <div className={`container ${styles.newsletterInner}`}>
        <div>
          <p className={styles.newsletterKicker}>{kicker}</p>
          <h2 className={styles.newsletterTitle} id="briefing-title">
            {title}
          </h2>
          <p className={styles.newsletterCopy}>{copy}</p>
        </div>
        <div>
          <NewsletterForm />
        </div>
      </div>
    </section>
  )
}
