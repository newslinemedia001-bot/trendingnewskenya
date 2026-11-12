import localFont from 'next/font/local'
import './globals.css'
import SiteChrome from '@/components/SiteChrome'
import { SITE_NAME, SITE_DESCRIPTION, SITE_TAGLINE, siteUrl } from '@/lib/site'
import { getFeaturedArticle, articleImageUrl } from '@/lib/content'

const serif = localFont({
  src: [
    { path: './fonts/newsreader.woff2', weight: '200 800', style: 'normal' },
    { path: './fonts/newsreader-italic.woff2', weight: '200 800', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
})

const sans = localFont({
  src: './fonts/archivo.woff2',
  variable: '--font-sans',
  weight: '400 700',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
})

export async function generateMetadata() {
  const base = siteUrl()
  const leading = await getFeaturedArticle()
  const ogImage = leading ? articleImageUrl(leading) : `${base}/og-default.png`

  return {
    metadataBase: new URL(base),
    title: {
      default: `${SITE_NAME} — Kenya, Africa and the world`,
      template: `%s - ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      'Kenya news',
      'Kenya news today',
      'breaking news Kenya',
      'Nairobi news',
      'Kenya politics',
      'Kenya business news',
      'Kenya technology news',
      'Kenya sport',
      'Africa news',
      'world news',
      'Kenyan newspaper',
      'Trending News Kenya',
    ],
    authors: [{ name: SITE_NAME, url: base }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'news',
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    alternates: {
      types: { 'application/rss+xml': '/feed.xml' },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_KE',
      url: '/',
      title: `${SITE_NAME} — Kenya, Africa and the world`,
      description: SITE_DESCRIPTION,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${SITE_NAME} — Kenya, Africa and the world`,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
    formatDetection: { telephone: false, address: false, email: false },
  }
}

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

const organizationLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsMediaOrganization',
      '@id': `${siteUrl()}/#organization`,
      name: SITE_NAME,
      url: siteUrl(),
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl()}/logo.png`,
        width: 600,
        height: 600,
      },
      description: SITE_DESCRIPTION,
      foundingDate: '2026',
      ethicsPolicy: `${siteUrl()}/about#standards`,
      correctionsPolicy: `${siteUrl()}/about#corrections`,
      publishingPrinciples: `${siteUrl()}/about#standards`,
      actionableFeedbackPolicy: `${siteUrl()}/contact`,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'newsroom',
          email: 'newsroom@trendingnewskenya.co.ke',
          availableLanguage: ['en'],
        },
      ],
      slogan: SITE_TAGLINE,
      areaServed: { '@type': 'Country', name: 'Kenya' },
      knowsAbout: [
        'Kenya politics',
        'Kenyan business and markets',
        'Kenya technology and fintech',
        'Kenyan sport and athletics',
        'Kenyan culture and entertainment',
        'Africa news',
        'World news',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl()}/#website`,
      name: SITE_NAME,
      url: siteUrl(),
      description: SITE_DESCRIPTION,
      inLanguage: 'en-KE',
      publisher: { '@id': `${siteUrl()}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl()}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-KE" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SiteChrome>{children}</SiteChrome>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </body>
    </html>
  )
}
