import { searchArticles } from '@/lib/content'
import StoryCard from '@/components/StoryCard'
import styles from '@/app/inner.module.css'

export const metadata = {
  title: 'Search',
  description: 'Search reporting from the Trending News Kenya newsroom.',
  robots: { index: false, follow: true },
}

const SUGGESTIONS = [
  'budget',
  'M-Pesa',
  'Nairobi',
  'Harambee Stars',
  'tea',
  'devolution',
  'geothermal',
]

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams
  const term = typeof sp?.q === 'string' ? sp.q.slice(0, 120) : ''
  const results = term ? await searchArticles(term) : []

  return (
    <div className="container page">
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.headerKicker}>The archive</p>
            <h1 className={styles.headerTitle}>Search</h1>
          </div>
          {term && (
            <p className={styles.headerCount}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
          )}
        </div>
        <p className={styles.headerDek}>
          Find a story by headline, subject, writer or place. Every published story is
          searchable.
        </p>
      </header>

      <form className={styles.searchForm} action="/search" method="get" role="search">
        <label className="srOnly" htmlFor="search-input">
          Search stories
        </label>
        <input
          id="search-input"
          className="input"
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Try “budget”, “M-Pesa”, “Nairobi”…"
          autoComplete="off"
        />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {!term ? (
        <>
          <p className={styles.searchMeta}>Popular searches</p>
          <div className={styles.chips}>
            {SUGGESTIONS.map((suggestion) => (
              <a
                key={suggestion}
                className="tag"
                href={`/search?q=${encodeURIComponent(suggestion)}`}
              >
                {suggestion}
              </a>
            ))}
          </div>
        </>
      ) : results.length ? (
        <>
          <p className={styles.searchMeta}>
            Results for <span className={styles.resultCount}>“{term}”</span>
          </p>
          <div className={styles.sectionGrid}>
            {results.map((article) => (
              <StoryCard key={article.slug} article={article} />
            ))}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <h2>No stories matched “{term}”</h2>
          <p>
            Try a shorter phrase, a section name such as “business”, or browse the{' '}
            <a href="/latest">latest stories</a> and <a href="/section/kenya">Kenya</a>{' '}
            front pages.
          </p>
        </div>
      )}
    </div>
  )
}
