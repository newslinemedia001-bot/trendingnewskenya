import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  articleImageUrl,
  getArticleBySlug,
  getBySection,
  getMostRead,
  getRelated,
} from '@/lib/content'
import {
  SITE_NAME,
  dateline,
  formatDate,
  readingTime,
  remoteImageUrl,
  sectionLabel,
  siteUrl,
} from '@/lib/site'
import ArticleBody from '@/components/ArticleBody'
import ShareBar from '@/components/ShareBar'
import StoryCard from '@/components/StoryCard'
import MostRead from '@/components/MostRead'
import styles from '@/app/article.module.css'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return {
      title: 'Story not found',
      robots: { index: false, follow: false },
    }
  }

  const url = `/news/${article.slug}`
  const description = article.dek || `${article.title} — ${SITE_NAME}`
  const image = articleImageUrl(article)

  return {
    title: article.title,
    description,
    keywords: [sectionLabel(article.section), ...(article.tags || [])],
    alternates: {
      canonical: url,
      types: { 'application/rss+xml': '/feed.xml' },
    },
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description,
      siteName: SITE_NAME,
      locale: 'en_KE',
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.updatedAt || article.publishedAt || undefined,
      authors: [article.wire ? article.source : article.author.name],
      section: sectionLabel(article.section),
      tags: article.tags,
      images: image ? [{ url: image, width: 1600, height: 900, alt: article.image?.alt || article.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: image ? [image] : [],
    },
  }
}

export default async function ArticlePage({ params }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const [related, mostRead, sectionMore] = await Promise.all([
    getRelated(article, 3),
    getMostRead(5, [article.slug]),
    getBySection(article.section, 6),
  ])

  const url = `${siteUrl()}/news/${article.slug}`
  const sectionHref = `/section/${article.section}`
  const moreInSection = sectionMore.filter((a) => a.slug !== article.slug).slice(0, 4)
  const minutes = readingTime(article.body)
  const wordCount = String(article.body || '')
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  const updated =
    article.updatedAt && article.updatedAt !== article.publishedAt ? article.updatedAt : null
  const initials = (article.wire ? article.source : article.author.name)
    .replace(/^The /, '')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: article.title,
    description: article.dek,
    image: article.image ? [articleImageUrl(article)] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    articleSection: sectionLabel(article.section),
    keywords: (article.tags || []).join(', '),
    inLanguage: 'en-KE',
    isAccessibleForFree: true,
    url,
    isPartOf: { '@id': `${siteUrl()}/#website` },
    wordCount,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1'],
    },
    author: article.wire
      ? { '@type': 'Organization', name: article.source, url: article.sourceUrl || undefined }
      : {
          '@type': 'Person',
          name: article.author.name,
          jobTitle: article.author.role,
          url: `${siteUrl()}/authors/${article.author.slug}`,
        },
    creditText: article.wire ? article.source : undefined,
    isBasedOn: article.wire ? article.originalUrl || undefined : undefined,
    publisher: { '@id': `${siteUrl()}/#organization` },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl() },
      {
        '@type': 'ListItem',
        position: 2,
        name: sectionLabel(article.section),
        item: `${siteUrl()}${sectionHref}`,
      },
      { '@type': 'ListItem', position: 3, name: article.title },
    ],
  }

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className={styles.breadcrumbSep} aria-hidden="true">
          /
        </span>
        <Link href={sectionHref}>{sectionLabel(article.section)}</Link>
      </nav>

      <header className={styles.header}>
        <div className={styles.kicker}>
          <Link href={sectionHref} className={styles.kickerSection}>
            {sectionLabel(article.section)}
          </Link>
          <span className={styles.kickerDivider} aria-hidden="true" />
          <span>{article.tags?.[0]?.replace(/-/g, ' ') || 'Reporting'}</span>
          {article.wire && <span className={styles.wireTag}>Wire</span>}
          {article.isBreaking && <span className={styles.breakingTag}>Breaking</span>}
        </div>

        <h1 className={styles.headline}>{article.title}</h1>
        {article.dek && <p className={styles.dek}>{article.dek}</p>}

        <div className={styles.bylineRow}>
          <div className={styles.byline}>
            {article.wire ? (
              <>
                <span>
                  From <strong>{article.source}</strong>
                </span>
                <span className={styles.bylineRole}>Wire</span>
                {article.originalUrl && (
                  <a
                    href={article.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.btn} ${styles.btnSmall} ${styles.btnOutline}`}
                  >
                    Read original →
                  </a>
                )}
              </>
            ) : (
              <>
                <span>
                  By{' '}
                  <strong>
                    <Link href={`/authors/${article.author.slug}`}>{article.author.name}</Link>
                  </strong>
                </span>
                <span className={styles.bylineRole}>{article.author.role}</span>
              </>
            )}
            <span className={styles.bylineDivider} aria-hidden="true" />
            <time dateTime={article.publishedAt}>{dateline(article.publishedAt)}</time>
            <span className={styles.bylineDivider} aria-hidden="true" />
            <span>{minutes} min read</span>
          </div>
          <ShareBar url={url} title={article.title} />
        </div>
      </header>

      {article.image && (
        <figure className={styles.hero}>
          <div className={styles.heroFrame}>
            {article.remoteImage ? (
              /* Publisher images are third-party URLs; bypass the Next image proxy. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={remoteImageUrl(article.image.src)}
                alt={article.image.alt || article.title}
                className={styles.heroImg}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <Image
                src={article.image.src}
                alt={article.image.alt || article.title}
                fill
                sizes="(max-width: 1320px) 100vw, 1320px"
                className={styles.heroImg}
                priority
              />
            )}
          </div>
          <figcaption>
            <span>{article.image.caption || article.image.alt}</span>
            {(article.wire || article.image.credit) && (
              <span className={styles.credit}>
                Photo: {article.wire ? article.source : article.image.credit}
              </span>
            )}
          </figcaption>
        </figure>
      )}

      <div className={styles.layout}>
        <div className={styles.bodyWrap}>
          <ArticleBody content={article.body} />

          <div className={styles.tags}>
            <span className={styles.tagLabel}>Topics</span>
            {(article.tags || []).map((tag) => (
              <Link key={tag} href={`/topic/${tag}`} className={styles.tagLink}>
                {tag.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>

          {article.wire ? (
            <div className={styles.sourceBox}>
              <div className={styles.authorAvatar} aria-hidden="true">
                {initials}
              </div>
              <div>
                <p className={styles.authorName}>{article.source}</p>
                <p className={styles.authorRole}>Publisher · wire story</p>
                <p className={styles.authorBio}>
                  This story was first published by {article.source}. Trending News Kenya carries
                  it on-site so readers can stay here, with the publisher credited above.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.authorBox}>
              <div className={styles.authorAvatar} aria-hidden="true">
                {initials}
              </div>
              <div>
                <p className={styles.authorName}>
                  <Link href={`/authors/${article.author.slug}`}>{article.author.name}</Link>
                </p>
                <p className={styles.authorRole}>{article.author.role}</p>
                {article.author.bio && <p className={styles.authorBio}>{article.author.bio}</p>}
              </div>
            </div>
          )}

          {article.wire ? (
            <p className={styles.policyNote}>
              This report was written and published by <strong>{article.source}</strong>, not by
              the Trending News Kenya newsroom. It is republished here in full with credit to the
              publisher, and the headline remains the copyright of {article.source}. Read our{' '}
              <Link href="/about#standards">attribution policy</Link>. Photographs are the
              publisher&apos;s and are credited above.
              {updated && <> Last updated {formatDate(updated)}.</>}
            </p>
          ) : (
            <p className={styles.policyNote}>
              This story was reported and edited by the Trending News Kenya newsroom. Read our{' '}
              <Link href="/about#standards">editorial standards</Link> and{' '}
              <Link href="/about#corrections">corrections policy</Link>. Photographs are credited
              above; illustrative images are licensed from their authors.
              {updated && <> Last updated {formatDate(updated)}.</>}
            </p>
          )}
        </div>

        <aside className={styles.rail} aria-label="More coverage">
          <MostRead articles={mostRead} />

          {moreInSection.length > 0 && (
            <div className={styles.railBlock}>
              <h2 className={styles.railTitle}>More in {sectionLabel(article.section)}</h2>
              <ul className={styles.railList}>
                {moreInSection.map((item) => (
                  <li key={item.slug} className={styles.railItem}>
                    <span className={styles.railKicker}>{sectionLabel(item.section)}</span>
                    <h3 className={styles.railHeadline}>
                      <Link href={item.href}>{item.title}</Link>
                    </h3>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-label="Related stories">
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <StoryCard key={item.slug} article={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
