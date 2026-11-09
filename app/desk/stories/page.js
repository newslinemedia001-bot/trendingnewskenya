import Link from 'next/link'
import { requireUser } from '@/lib/desk/guard'
import { STATUS_LABEL, listStories } from '@/lib/desk/stories'
import { SECTIONS, relativeTime, sectionLabel } from '@/lib/site'
import styles from '../desk.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Stories',
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
]

function badgeClass(status) {
  return status === 'draft' ? styles.badgeDraft : styles.badgePublished
}

export default async function StoriesPage({ searchParams }) {
  const user = await requireUser()
  const params = await searchParams
  const status = FILTERS.some((filter) => filter.value === params.status) ? params.status : 'all'
  const section = SECTIONS.some((entry) => entry.slug === params.section) ? params.section : ''
  const q = typeof params.q === 'string' ? params.q : ''
  const mine = params.mine === '1'

  const stories = await listStories({
    status,
    section: section || undefined,
    q: q || undefined,
    authorUid: mine ? user.id : undefined,
  })

  return (
    <>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <p className={styles.kicker}>{mine ? 'Your work' : 'The newsroom'}</p>
          <h1 className={styles.title}>Stories</h1>
          <p className={styles.lede}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            {status === 'all' ? '' : ` marked ${STATUS_LABEL[status]?.toLowerCase()}`}
            {section ? ` in ${sectionLabel(section)}` : ''}.
          </p>
        </div>
        <div className={styles.headActions}>
          <Link href="/desk/stories/new" className={`${styles.btn} ${styles.btnAccent}`}>
            New story
          </Link>
        </div>
      </header>

      <div className={styles.filters}>
        {FILTERS.map((filter) => {
          const query = new URLSearchParams()
          if (filter.value !== 'all') query.set('status', filter.value)
          if (section) query.set('section', section)
          if (q) query.set('q', q)
          if (params.mine === '1') query.set('mine', '1')
          const href = `/desk/stories${query.toString() ? `?${query}` : ''}`
          return (
            <Link
              key={filter.value}
              href={href}
              className={`${styles.filter} ${status === filter.value ? styles.filterActive : ''}`}
            >
              {filter.label}
            </Link>
          )
        })}
        <span className={styles.muted} style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          {user.role === 'admin' ? 'You can edit and delete any story here.' : 'Showing every story; you can edit your own.'}
        </span>
      </div>

      <section className={styles.panel}>
        {stories.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Headline</th>
                <th scope="col">Section</th>
                <th scope="col">Status</th>
                <th scope="col">Written by</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr key={story.id}>
                  <td>
                    <Link href={`/desk/stories/${story.id}`} className={styles.cellTitle}>
                      {story.title}
                    </Link>
                    {story.isFeatured || story.isBreaking ? (
                      <div style={{ marginTop: 5, display: 'flex', gap: 6 }}>
                        {story.isBreaking ? (
                          <span className={`${styles.badge} ${styles.badgeFlag}`}>Breaking</span>
                        ) : null}
                        {story.isFeatured ? (
                          <span className={`${styles.badge} ${styles.badgeFlag}`}>Lead</span>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td className={styles.muted}>{sectionLabel(story.section)}</td>
                  <td>
                    <span className={`${styles.badge} ${badgeClass(story.status)}`}>
                      {STATUS_LABEL[story.status]}
                    </span>
                  </td>
                  <td className={styles.muted}>{story.authorName}</td>
                  <td className={styles.muted}>{relativeTime(story.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            No stories here yet. <Link href="/desk/stories/new">Start one</Link>.
          </p>
        )}
      </section>
    </>
  )
}
