import Link from 'next/link'
import { buildFrontPage } from '@/lib/frontpage'
import { SITE_NAME, sectionKicker } from '@/lib/site'
import BreakingBar from '@/components/BreakingBar'
import StoryCard from '@/components/StoryCard'
import SectionHeader from '@/components/SectionHeader'
import LatestStrip from '@/components/LatestStrip'
import MostRead from '@/components/MostRead'
import NewsletterBand from '@/components/NewsletterBand'
import styles from './page.module.css'

export const revalidate = 60

export const metadata = {
  title: `${SITE_NAME} — Kenya news, politics, business and sport`,
  description:
    'Breaking news and analysis from Kenya, Africa and the world. Politics, business, technology, sport, culture and opinion, reported from Nairobi by Trending News Kenya.',
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    url: '/',
    title: `${SITE_NAME} — Kenya news, politics, business and sport`,
    description:
      'Breaking news and analysis from Kenya, Africa and the world, reported from Nairobi.',
  },
}

function OpinionItem({ article }) {
  return (
    <article className={styles.opinionItem}>
      <p className={styles.opinionItemKicker}>{article.wire ? 'From the wire' : 'Opinion'}</p>
      <h3 className={styles.opinionItemHeadline}>
        <Link href={article.href}>{article.title}</Link>
      </h3>
      <p className={styles.opinionItemMeta}>
        {article.wire ? `Source: ${article.source}` : article.author.name}
      </p>
    </article>
  )
}

export default async function HomePage() {
  const { lead, secondary, latest, sections, topics, mostRead } = await buildFrontPage()

  const kenya = sections.kenya || []
  const politics = sections.politics || []
  const business = sections.business || []
  const technology = sections.technology || []
  const sport = sections.sport || []
  const entertainment = sections.entertainment || []
  const life = sections.life || []
  const africa = sections.africa || []
  const world = sections.world || []
  const opinion = sections.opinion || []

  if (!lead) {
    return (
      <div className="container page">
        <h1>The front page is quiet</h1>
        <p>
          Nothing has come in from the newsroom or the wire yet. <Link href="/login">Sign in</Link>{' '}
          to publish the first story.
        </p>
      </div>
    )
  }

  const breakingItems = (lead.isBreaking ? [lead] : []).concat(
    [...secondary, ...latest].filter((card) => card.isBreaking)
  )
  const ticker = (breakingItems.length ? breakingItems : [lead, ...secondary, ...latest])
    .slice(0, 5)
    .map((card) => ({ href: card.href, title: card.title, external: card.external }))

  return (
    <>
      <BreakingBar items={ticker} />

      <div className="container">
        {topics.length ? (
          <div className={styles.topicBar}>
            <span className={styles.topicLabel}>In the news</span>
            <div className={styles.topicList}>
              {topics.map((topic) => (
                <Link key={topic.slug} href={`/topic/${topic.slug}`} className={styles.topicLink}>
                  {topic.slug.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
            <span className={styles.topicEdition}>Nairobi edition</span>
          </div>
        ) : null}

        <div className={styles.hero}>
          <div className={styles.heroMain}>
            <StoryCard article={lead} variant="lead" headingLevel="h1" priority />

            <div className={styles.secondary}>
              {secondary.map((article) => (
                <StoryCard key={article.slug} article={article} variant="card" />
              ))}
            </div>
          </div>

          <aside className={styles.rail} aria-label="Most read and newsletters">
            <MostRead articles={mostRead} />
            <div className={styles.railPromo}>
              <p className={styles.railPromoKicker}>Newsletter</p>
              <h2 className={styles.railPromoTitle}>
                Start the day
                <br />
                better informed.
              </h2>
              <p className={styles.railPromoCopy}>
                The Briefing gathers the stories that matter to Kenya into one short email, in your
                inbox by 6am.
              </p>
              <Link href="/newsletter" className={styles.railPromoLink}>
                Get The Briefing <span aria-hidden="true">→</span>
              </Link>
            </div>
            {topics.length ? (
              <div className={styles.railTopics}>
                <h2 className={styles.railTopicsTitle}>Topics</h2>
                <div className={styles.topicChips}>
                  {topics.slice(0, 6).map((topic) => (
                    <Link key={topic.slug} href={`/topic/${topic.slug}`} className={styles.chip}>
                      {topic.slug.replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        <LatestStrip articles={latest} />

        {kenya.length > 0 && (
          <section aria-label="Kenya">
            <SectionHeader title="Kenya" kicker={sectionKicker('kenya')} href="/section/kenya" />
            <div className={styles.kenyaGrid}>
              <StoryCard article={kenya[0]} variant="wide" />
              <div className={styles.stackList}>
                {kenya.slice(1, 5).map((article) => (
                  <StoryCard key={article.slug} article={article} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        )}

        {politics.length > 0 && (
          <section aria-label="Politics">
            <SectionHeader
              title="Politics"
              kicker={sectionKicker('politics')}
              href="/section/politics"
            />
            <div className={styles.grid3}>
              {politics.map((article) => (
                <StoryCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        )}

        {business.length > 0 && (
          <section aria-label="Business">
            <SectionHeader
              title="Business"
              kicker={sectionKicker('business')}
              href="/section/business"
            />
            <div className={styles.grid4}>
              {business.map((article) => (
                <StoryCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        )}

        {(technology.length > 0 || sport.length > 0) && (
          <section className={styles.splitBand} aria-label="Technology and sport">
            {technology.length > 0 && (
              <div>
                <SectionHeader
                  title="Technology"
                  kicker={sectionKicker('technology')}
                  href="/section/technology"
                  compact
                />
                <div className={styles.stackList}>
                  {technology.map((article) => (
                    <StoryCard key={article.slug} article={article} variant="compact" />
                  ))}
                </div>
              </div>
            )}
            {sport.length > 0 && (
              <div>
                <SectionHeader
                  title="Sport"
                  kicker={sectionKicker('sport')}
                  href="/section/sport"
                  compact
                />
                <div className={styles.stackList}>
                  {sport.map((article) => (
                    <StoryCard key={article.slug} article={article} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {(entertainment.length > 0 || life.length > 0) && (
          <section className={styles.cultureBand} aria-label="Culture and life">
            <div className="container">
              <div className={styles.cultureHead}>
                <p className={styles.cultureKicker}>Culture &amp; life</p>
                <h2 className={styles.cultureTitle}>
                  The coast, the city, the weekend — and the work behind them.
                </h2>
              </div>
              <div className={styles.cultureGrid}>
                {entertainment.length > 0 && (
                  <div>
                    <SectionHeader title="Entertainment" href="/section/entertainment" compact />
                    <div className={styles.stackList}>
                      {entertainment.map((article) => (
                        <StoryCard key={article.slug} article={article} variant="compact" />
                      ))}
                    </div>
                  </div>
                )}
                {life.length > 0 && (
                  <div>
                    <SectionHeader title="Life" href="/section/life" compact />
                    <div className={styles.stackList}>
                      {life.map((article) => (
                        <StoryCard key={article.slug} article={article} variant="compact" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {(africa.length > 0 || world.length > 0) && (
          <section className={styles.worldSplit} aria-label="Africa and the world">
            {africa.length > 0 && (
              <div>
                <SectionHeader
                  title="Africa"
                  kicker={sectionKicker('africa')}
                  href="/section/africa"
                  compact
                />
                <div className={styles.stackList}>
                  {africa.map((article) => (
                    <StoryCard key={article.slug} article={article} variant="compact" />
                  ))}
                </div>
              </div>
            )}
            {world.length > 0 && (
              <div>
                <SectionHeader
                  title="World"
                  kicker={sectionKicker('world')}
                  href="/section/world"
                  compact
                />
                <div className={styles.stackList}>
                  {world.map((article) => (
                    <StoryCard key={article.slug} article={article} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {opinion.length > 0 && (
          <section className={styles.opinion} aria-label="Opinion">
            <div className={`container ${styles.opinionInner}`}>
              <div className={styles.opinionHeadCol}>
                <p className={styles.opinionKicker}>The argument</p>
                <h2 className={styles.opinionTitle}>Opinion</h2>
                <p className={styles.opinionNote}>
                  Editorials, columns and arguments about power, money and public life.
                </p>
                <Link href="/section/opinion" className={styles.opinionMore}>
                  All opinion <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className={styles.opinionGrid}>
                {opinion.map((article) => (
                  <OpinionItem key={article.slug} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

        <NewsletterBand />
      </div>
    </>
  )
}
