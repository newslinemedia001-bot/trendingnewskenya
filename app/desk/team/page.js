import { listUsers } from '@/lib/desk/accounts'
import { requireAdmin } from '@/lib/desk/guard'
import { readCollection } from '@/lib/desk/store'
import TeamManager from '../TeamManager'
import styles from '../desk.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Team',
}

export default async function TeamPage() {
  const user = await requireAdmin()
  const [users, stories] = await Promise.all([listUsers(), readCollection('articles')])

  const counts = stories.reduce((map, story) => {
    map[story.authorUid] = (map[story.authorUid] || 0) + 1
    return map
  }, {})

  const team = users.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    title: member.title || '',
    role: member.role,
    active: member.active !== false,
    stories: counts[member.id] || 0,
    lastLoginAt: member.lastLoginAt || null,
  }))

  return (
    <>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <p className={styles.kicker}>Administration</p>
          <h1 className={styles.title}>Who can publish</h1>
          <p className={styles.lede}>
            Editors publish and manage their own stories; administrators manage every story on the
            site. Set a first password here, and reset it whenever it is forgotten. Deactivating an
            account ends its sessions on the next request.
          </p>
        </div>
      </header>

      <TeamManager team={team} currentUserId={user.id} />
    </>
  )
}
