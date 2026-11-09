import Link from 'next/link'
import { ROLE_LABEL } from '@/lib/desk/accounts'
import { requireUser } from '@/lib/desk/guard'
import { canWrite } from '@/lib/desk/store'
import DeskNav from './DeskNav'
import LogoutButton from './LogoutButton'
import styles from './desk.module.css'

export const metadata = {
  title: { default: 'Newsroom desk', template: '%s - Desk' },
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function SetupBanner({ ready }) {
  if (ready) return null
  return (
    <div className={styles.banner} role="status">
      <div className={styles.bannerInner}>
        The desk has no database credentials, so nothing can be saved. Add
        {' '}<code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to
        {' '}<code>.env.local</code> — both from Supabase → Project Settings → API Keys — and restart
        the server.
      </div>
    </div>
  )
}

export default async function DeskLayout({ children }) {
  const user = await requireUser()
  const ready = canWrite()

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/desk" className={styles.wordmark}>
            Trending News <span className={styles.wordmarkMeta}>Desk</span>
          </Link>
          <DeskNav isAdmin={user.role === 'admin'} />
          <div className={styles.who}>
            <span className={styles.whoText}>
              <span className={styles.whoName}>{user.name}</span>
              <span className={styles.whoRole}>
                {user.title || ROLE_LABEL[user.role] || user.role}
              </span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <SetupBanner ready={ready} />

      <main className={styles.main}>{children}</main>
    </div>
  )
}
