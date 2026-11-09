import { notFound } from 'next/navigation'
import styles from '@/app/inner.module.css'

export const metadata = {
  title: 'About Trending News Kenya',
  description:
    'Who we are, what we stand for, and the standards that guide our reporting from Nairobi to the world.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About - Trending News Kenya',
    description:
      'Who we are, what we stand for, and the standards that guide our reporting from Nairobi to the world.',
    url: '/about',
    type: 'website',
    locale: 'en_KE',
  },
}

export default function AboutPage() {
  const sectionLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Trending News Kenya',
    url: 'https://trendingnewskenya.co.ke',
    description:
      'An independent digital newspaper in Nairobi covering Kenyan politics, business, technology, sport, entertainment, Africa and the world.',
    logo: 'https://trendingnewskenya.co.ke/logo.png',
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://trendingnewskenya.co.ke' },
      { '@type': 'ListItem', position: 2, name: 'About' },
    ],
  }

  return (
    <div className="container page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.headerKicker}>The newsroom</p>
            <h1 className={styles.headerTitle}>About</h1>
          </div>
        </div>
      </header>

      <main className="prose">
        <h2>Our purpose</h2>
        <p>
          Trending News Kenya is an independent digital newspaper based in Nairobi. We
          cover Kenyan politics, business, technology, sport, entertainment, Africa and
          the world — with analysis and reporting written for readers in Kenya and the
          diaspora who want straight talk without the noise.
        </p>

        <h2>Our standards</h2>
        <ul>
          <li>
            <strong>Accuracy:</strong> Every fact is checked and sourced. Corrections are
            published promptly.
          </li>
          <li>
            <strong>Independence:</strong> We are not owned by a political party, a
            corporation or a government. No advertiser or source tells us what to write.
          </li>
          <li>
            <strong>Fairness:</strong> We give all sides a fair hearing. Right of reply is
            a right we extend to every subject.
          </li>
          <li>
            <strong>Transparency:</strong> When we make a mistake we say so. Our sources
            and methods are disclosed when it matters.
          </li>
          <li>
            <strong>Public interest:</strong> We pursue stories that affect people's lives,
            livelihoods and rights. We do not chase sensationalism for its own sake.
          </li>
        </ul>

        <h2>Our team</h2>
        <p>
          Our journalists and editors are based across Kenya, from Nairobi to Mombasa,
          Kisumu and the coast. Each brings deep local knowledge and a commitment to
          evidence-driven reporting. The byline tells you who wrote every story.
        </p>

        <h2>Contact</h2>
        <p>
          You can reach the editorial team at <a href="mailto:editor@trendingnewskenya.co.ke">editor@trendingnewskenya.co.ke</a>.
          For press inquiries, advertising or partnership proposals, use the same address.
        </p>

        <h2>Founding year</h2>
        <p>2026</p>
      </main>
    </div>
  )
}