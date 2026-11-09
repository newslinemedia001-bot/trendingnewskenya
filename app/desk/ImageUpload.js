'use client'

import { useRef, useState } from 'react'
import styles from './desk.module.css'

/**
 * Upload a lead image to Supabase Storage and hand back its public URL.
 *
 * The file never goes through a third party: POST /api/desk/upload stores it in
 * the newsroom's own bucket, so the URL is stable and can be reused in feeds
 * and social cards.
 */
export default function ImageUpload({ value, onChange, disabled = false }) {
  const input = useRef(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPending(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/desk/upload', { method: 'POST', body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'The image could not be uploaded.')
        return
      }
      onChange(data.url)
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
          onClick={() => input.current?.click()}
          disabled={disabled || pending}
        >
          {pending ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </button>
        {value ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSmall}`}
            onClick={() => onChange('')}
            disabled={disabled || pending}
          >
            Remove
          </button>
        ) : null}
        <span className={styles.hint}>
          {pending ? 'Sending to storage…' : 'JPEG, PNG, WebP, AVIF or GIF · up to 8 MB'}
        </span>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={upload}
        hidden
      />

      {error ? <span className={styles.fieldError}>{error}</span> : null}

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Lead image preview"
          style={{
            display: 'block',
            width: '100%',
            maxHeight: 190,
            objectFit: 'cover',
            marginTop: 10,
            borderRadius: 4,
            border: '1px solid var(--rule, #ddd)',
          }}
        />
      ) : null}
    </div>
  )
}
