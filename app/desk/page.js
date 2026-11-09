import Link from 'next/link'
import { listUsers, ROLE_LABEL } from '@/lib/desk/accounts'
import { requireUser } from '@/lib/desk/guard'
import { STATUS_LABEL, listStories } from '@/lib/desk/stories'
import { formatDate, relativeTime } from '@/lib/site'
import QuickPublish from './QuickPublish'
import WireRefresh from './WireRefresh'
import styles from './desk.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard',
}

function Stat({ value, label }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft: styles.badgeDraft,
    published: styles.badgePublished,
  }
  return <span className={`${styles.badge} ${map[status] || ''}`}>{STATUS_LABEL[status]}</span>
}

export default async function DashboardPage() {
  const user = await requireUser()
  const admin = user.role === 'admin'

  const [stories, team] = await Promise.all([
    listStories({}),
    admin ? listUsers() : Promise.resolve([]),
  ])

  const published = stories.filter((story) => story.status === 'published')
  const drafts = stories.filter((story) => story.status === 'draft')
  const mine = stories.filter((story) => story.authorUid === user.id)
  const myDrafts = mine.filter((story) => story.status === 'draft')

  const queue = (admin ? drafts : myDrafts).slice(0, 6)
  const recent = published.slice(0, 5)

  return (
    <>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <p className={styles.kicker}>{ROLE_LABEL[user.role]} dashboard</p>
          <h1 className={styles.title}>Good to see you, {user.name.split(' ')[0]}.</h1>
          <p className={styles.lede}>
            {admin
              ? 'Publish your own reporting, and manage everything else on the site.'
              : 'Write it here, publish it here. Your stories are yours to edit and take down.'}
          </p>
        </div>
        <div className={styles.headActions}>
          <Link href="/" className={`${styles.btn} ${styles.btnGhost}`}>
            ← Home
          </Link>
          {admin ? <WireRefresh /> : null}
          <Link href="/desk/stories" className={`${styles.btn} ${styles.btnGhost}`}>
            All stories
          </Link>
        </div>
      </header>

      <QuickPublish />

      <section className={styles.stats} aria-label="At a glance">
        <Stat value={published.length} label="On the site" />
        <Stat value={drafts.length} label="Drafts" />
        <Stat value={mine.length} label="Your stories" />
        {admin ? <Stat value={team.length} label="Accounts" /> : null}
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-label="Drafts">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>{admin ? 'Drafts across the site' : 'Your drafts'}</h2>
            <Link href="/desk/stories?status=draft" className={styles.panelMore}>
              All drafts
            </Link>
          </div>

          {queue.length ? (
            <table className={styles.table}>
              <tbody>
                {queue.map((story) => (
                  <tr key={story.id}>
                    <td>
                      <Link href={`/desk/stories/${story.id}`} className={styles.cellTitle}>
                        {story.title}
                      </Link>
                      <div className={styles.muted}>
                        {story.authorName} · {relativeTime(story.updatedAt)}
                      </div>
                    </td>
                    <td style={{ width: 90 }}>
                      <StatusBadge status={story.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>No drafts. Write something above.</p>
          )}
        </section>

        <div>
          <section className={styles.panel} aria-label="Recently published">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>On the site now</h2>
              <Link href="/" className={styles.panelMore}>
                View front page
              </Link>
            </div>
            {recent.length ? (
              <table className={styles.table}>
                <tbody>
                  {recent.map((story) => (
                    <tr key={story.id}>
                      <td>
                        <Link href={`/desk/stories/${story.id}`} className={styles.cellTitle}>
                          {story.title}
                        </Link>
                        <div className={styles.muted}>
                          {story.section} · {formatDate(story.publishedAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.empty}>Nothing published yet.</p>
            )}
          </section>

          <section className={styles.panel} aria-label="Shortcuts">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Shortcuts</h2>
            </div>
            <div className={styles.headActions}>
              <Link href="/desk/stories?status=draft" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                Drafts
              </Link>
              <Link href="/desk/stories?status=published" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                Published
              </Link>
              <Link href="/desk/stories/new" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                Full editor
              </Link>
              {admin ? (
                <Link href="/desk/team" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                  Accounts
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <p className={styles.footer}>
        <Link href="/">Front page</Link>
        <Link href="/desk/stories">All stories</Link>
      </p>
    </>
  )
}
