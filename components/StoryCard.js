import Link from 'next/link'
import Image from 'next/image'
import { relativeTime, remoteImageUrl, sectionLabel } from '@/lib/site'
import styles from './Stories.module.css'

function Meta({ article, variant }) {
  return (
    <div className={styles.meta}>
      {article.wire ? (
        <span className={styles.sourceCredit}>{`Source: ${article.source}`}</span>
      ) : variant === 'opinion' ? (
        <span className={styles.authorName}>{article.author.name}</span>
      ) : (
        <>
          <span className={styles.authorName}>{article.author.name}</span>
          <span className={styles.metaDot} aria-hidden="true" />
        </>
      )}
      <time dateTime={article.publishedAt}>{relativeTime(article.publishedAt)}</time>
    </div>
  )
}

export default function StoryCard({
  article,
  variant = 'card',
  headingLevel = 'h3',
  showDek = true,
  priority = false,
  sizes,
}) {
  if (!article) return null

  const Heading = headingLevel
  const href = article.href || `/news/${article.slug}`
  const remote = Boolean(article.remoteImage)
  const showImage = article.image && !['text', 'opinion'].includes(variant)
  const imageSizes =
    sizes ||
    (variant === 'lead'
      ? '(max-width: 900px) 100vw, 760px'
      : variant === 'wide'
        ? '(max-width: 900px) 100vw, 520px'
        : variant === 'compact'
          ? '92px'
          : '(max-width: 640px) 50vw, 300px')

  return (
    <article className={`${styles.story} ${styles[variant] || ''}`}>
      {showImage &&
        (remote ? (
          <Link href={href} className={styles.media} tabIndex={-1} aria-hidden="true">
            {/* Publisher images are third-party URLs, printed without a Next image proxy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={remoteImageUrl(article.image.src)}
              alt=""
              className={`${styles.mediaImg} ${styles.mediaImgFill}`}
              loading={priority ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
            />
          </Link>
        ) : (
          <Link href={href} className={styles.media} tabIndex={-1} aria-hidden="true">
            <Image
              src={article.image.src}
              alt=""
              fill
              sizes={imageSizes}
              className={styles.mediaImg}
              priority={priority}
            />
          </Link>
        ))}

      <div className={styles.body}>
        <div className={styles.kickerRow}>
          {variant === 'opinion' ? (
            <span className={styles.section}>Opinion</span>
          ) : (
            <Link href={`/section/${article.section}`} className={styles.section}>
              {sectionLabel(article.section)}
            </Link>
          )}
          {article.wire && <span className={styles.wireTag}>Wire</span>}
          {article.isBreaking && <span className={styles.breaking}>Breaking</span>}
        </div>

        <Heading className={styles.headline}>
          <Link href={href}>{article.title}</Link>
        </Heading>

        {showDek && article.dek && variant !== 'compact' && variant !== 'text' && (
          <p className={styles.dek}>{article.dek}</p>
        )}

        <Meta article={article} variant={variant} />
      </div>
    </article>
  )
}
