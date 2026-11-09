'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './desk.module.css'

export default function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    try {
      await fetch('/api/login', { method: 'DELETE' })
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className={`${styles.btn} ${styles.btnSmall} ${styles.onDark}`}
      disabled={pending}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
