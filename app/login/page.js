import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/desk/guard'
import LoginForm from './LoginForm'
import styles from './login.module.css'

export const metadata = {
  title: 'Editorial login',
  description: 'Sign in to the Trending News Kenya newsroom desk.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const FORM_ERRORS = {
  invalid: 'Invalid email or password.',
  missing: 'Enter your email and password.',
  throttled: 'Too many attempts. Wait fifteen minutes and try again.',
  inactive: 'This account has been deactivated. Ask an administrator to restore it.',
}

export default async function LoginPage({ searchParams }) {
  const user = await currentUser()
  if (user) redirect('/desk')

  const params = await searchParams
  const formError = FORM_ERRORS[params?.error] || null

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.card}>
        <p className={styles.kicker}>Newsroom</p>
        <h1 className={styles.title}>Editorial sign-in</h1>
        <p className={styles.dek}>
          Staff of Trending News Kenya sign in here to write, edit and publish. Accounts are
          created by an administrator.
        </p>

        {formError ? (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        ) : null}

        <LoginForm />

        <p className={styles.hint}>
          No account yet? Ask the newsroom administrator to add you.
        </p>
        <p className={styles.back}>
          <Link href="/">Back to the front page</Link>
        </p>
      </div>
    </div>
  )
}
