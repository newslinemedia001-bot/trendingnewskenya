import styles from '@/app/inner.module.css'

export const metadata = {
  title: 'Privacy notice',
  description:
    'How Trending News Kenya handles personal data on the site and in the newsletter.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy - Trending News Kenya',
    url: '/privacy',
    type: 'website',
    locale: 'en_KE',
  },
}

export default function PrivacyPage() {
  return (
    <div className="container page">
      <header className={styles.header}>
        <p className={styles.headerKicker}>Transparency</p>
        <h1 className={styles.headerTitle}>Privacy</h1>
      </header>

      <main className="prose">
        <h1>How we handle your data</h1>

        <h2>Website visitors</h2>
        <p>
          We do not track visitors, set cookies for advertising or collect IP addresses.
          The site does not use analytics services of any kind. Your visit remains
          anonymous.
        </p>

        <h2>Newsletter subscribers</h2>
        <p>
          The Briefing newsletter is the only place where personal data is collected.
          When you sign up you provide an email address only. That address is stored
          encrypted and used only to send the newsletter. It is never sold, rented or
          shared with any third party. Every email carries a one-click unsubscribe link.
          Subscribers can request deletion at any time by writing to
          <code>editor@trendingnewskenya.co.ke</code>.
        </p>

        <h2>Comments</h2>
        <p>
          Comments are not enabled on the site. No user-generated content or data is
          collected.
        </p>

        <h2>Cookies</h2>
        <p>
          The site sets a single session cookie to remember a visitor's preferred text
          size for the current session only. It expires when the browser closes. No
          tracking, advertising or third-party cookies are set.
        </p>

        <h2>Data retention</h2>
        <p>
          Newsletter subscriber data is retained until a deletion request is received.
          The editorial archive is permanent. No visitor data is ever retained.
        </p>

        <h2>Changes to this notice</h2>
        <p>
          If our practices change we will post the updated notice here. The "last updated"
          date appears at the top of this page.
        </p>
      </main>
    </div>
  )
}