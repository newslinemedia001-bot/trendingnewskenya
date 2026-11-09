import styles from '@/app/inner.module.css'

export const metadata = {
  title: 'Terms of use',
  description:
    'The terms governing use of the Trending News Kenya website and newsletter.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms - Trending News Kenya',
    url: '/terms',
    type: 'website',
    locale: 'en_KE',
  },
}

export default function TermsPage() {
  return (
    <div className="container page">
      <header className={styles.header}>
        <p className={styles.headerKicker}>Terms</p>
        <h1 className={styles.headerTitle}>Terms of use</h1>
      </header>

      <main className="prose">
        <h1>Terms of use for Trending News Kenya</h1>

        <h2>Acceptance</h2>
        <p>
          By accessing or using this website, you accept these terms. If you do not
          accept them, please discontinue use immediately.
        </p>

        <h2>Copyright</h2>
        <p>
          All original content on this site — articles, photographs, graphics, videos
          and design — is the property of Trending News Kenya or its credited
          contributors. All rights reserved. You may not reproduce, modify, distribute,
          display or transmit any part of this content without prior written permission.
        </p>

        <h2>Fair use</h2>
        <p>
          You may quote brief passages with attribution for purposes of commentary,
          criticism, education or research. Whole articles may not be republished.
        </p>

        <h2>User conduct</h2>
        <p>
          You agree not to use this website for any illegal or unauthorised purpose. You
          must not transmit any viruses, malware or code of a destructive nature. You
          must not attempt to gain unauthorised access to any part of the site or its
          associated systems.
        </p>

        <h2>External links</h2>
        <p>
          The site contains links to external resources. Trending News Kenya is not
          responsible for the availability, accuracy or content of any external site.
          These links are provided for convenience only.
        </p>

        <h2>No warranty</h2>
        <p>
          Content is provided "as is" without warranties of any kind, either express or
          implied. To the fullest extent permitted by law, Trending News Kenya excludes
          all conditions, representations and warranties in relation to the content.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Trending News Kenya shall not be
          liable for any indirect, consequential or special damages, or any loss of
          profit, revenue, data or goodwill, whether in contract, tort or otherwise,
          arising out of or in connection with the use of this website.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of Kenya. Any dispute arising out of or
          in connection with these terms shall be subject to the exclusive jurisdiction
          of the Kenyan courts.
        </p>

        <h2>Last updated</h2>
        <p>2026</p>
      </main>
    </div>
  )
}