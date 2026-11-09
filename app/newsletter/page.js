import NewsletterBand from '@/components/NewsletterBand'
import { SITE_NAME, siteUrl } from '@/lib/site'
import styles from '@/app/inner.module.css'

export const metadata = {
  title: 'The Briefing — our daily newsletter',
  description:
    'The Briefing is a short daily email from the Trending News Kenya newsroom: the stories that matter, the context behind them, and what to watch next.',
  alternates: { canonical: '/newsletter' },
  openGraph: {
    title: `The Briefing - ${SITE_NAME}`,
    description: 'The day’s Kenyan news, in one calm email, by 6am.',
    url: '/newsletter',
    type: 'website',
    locale: 'en_KE',
  },
}

export default function NewsletterPage() {
  const pageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'The Briefing',
    url: `${siteUrl()}/newsletter`,
    description:
      'A short daily email from the Trending News Kenya newsroom covering the stories that matter.',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }}
      />
      <div className="container page">
        <header className={styles.header}>
          <p className={styles.headerKicker}>Free · Every weekday</p>
          <h1 className={styles.headerTitle}>The Briefing</h1>
          <p className={styles.headerDek}>
            Kenya’s news, in one calm email. Written by the newsroom, in Nairobi, before
            the city wakes up.
          </p>
        </header>

        <div className={styles.policyLayout}>
          <div className="prose">
            <h2>What you get</h2>
            <p>
              A short email, usually under five minutes of reading. Three or four stories
              that genuinely moved the day, a line of context on each, and a look at what
              the newsroom is watching next.
            </p>
            <h2>When it arrives</h2>
            <p>
              Monday to Friday by 6am Nairobi time. When the news is big enough to interrupt
              a morning — a budget, an election result, a national emergency — we send an
              extra edition.
            </p>
            <h2>What we do with your address</h2>
            <p>
              We store it so we can send you the newsletter, and nothing else. We do not sell
              it, rent it or pass it to advertisers. Every edition has a one-click
              unsubscribe. Read the full detail in our{' '}
              <a href="/privacy">privacy notice</a>.
            </p>
            <h2>Written by people, not a robot</h2>
            <p>
              The Briefing is edited by the same desk that edits the site. If a story is
              wrong, the correction appears both here and in the next email. Our standards
              are published in full on the <a href="/about#standards">about page</a>.
            </p>
          </div>

          <aside className={styles.policyNav} aria-label="Newsletter facts">
            <h2>At a glance</h2>
            <p className="formNote">Frequency: weekdays, by 6am</p>
            <p className="formNote">Length: about 5 minutes</p>
            <p className="formNote">Price: free</p>
            <p className="formNote">Unsubscribe: one click, every email</p>
          </aside>
        </div>
      </div>

      <NewsletterBand
        title="Start tomorrow morning with the whole picture."
        copy="Join readers across Kenya and the diaspora. One email, every weekday, by 6am. Free, and one click to leave."
      />
    </>
  )
}
