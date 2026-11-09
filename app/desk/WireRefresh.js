'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './desk.module.css'

/**
 * Admins can pull the RSS wire into Firestore on demand. The site also syncs
 * automatically (throttled) whenever the front page is built, so this is for
 * when a fresh headline cannot wait.
 */
export default function WireRefresh() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [note, setNote] = useState(null)

  async function refresh() {
    if (pending) return
    setPending(true)
    setNote(null)
    try {
      const response = await fetch('/api/wire/sync', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setNote({ tone: 'error', text: data.error || data.reason || 'The wire could not be refreshed.' })
        return
      }
      setNote({
        tone: 'success',
        text: `Wire refreshed: ${data.added || 0} new, ${data.updated || 0} updated, ${
          data.total || 0
        } on file.`,
      })
      router.refresh()
    } catch {
      setNote({ tone: 'error', text: 'Could not reach the server.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <span className={styles.wireRefresh}>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={refresh}
        disabled={pending}
      >
        {pending ? 'Refreshing RSS…' : 'Refresh RSS'}
      </button>
      {note ? (
        <span
          className={`${styles.wireNote} ${note.tone === 'error' ? styles.wireNoteError : ''}`}
          role="status"
        >
          {note.text}
        </span>
      ) : null}
    </span>
  )
}
