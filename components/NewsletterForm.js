'use client'

import { useState } from 'react'
import styles from './Stories.module.css'

export default function NewsletterForm({ source = 'site' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('done')
        setEmail('')
        return
      }
      setStatus('error')
      setMessage(data?.error || 'Something went wrong. Please try again.')
    } catch {
      setStatus('error')
      setMessage('Could not reach the newsroom. Check your connection and try again.')
    }
  }

  if (status === 'done') {
    return (
      <div className={styles.newsletterSuccess} role="status">
        <strong>You’re on the list.</strong>
        <span>The next Briefing arrives in your inbox at 6am, Nairobi time.</span>
      </div>
    )
  }

  return (
    <div>
      <form className={styles.newsletterForm} onSubmit={onSubmit}>
        <label className="srOnly" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="btn btnAccent" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
      {status === 'error' && (
        <p className={styles.newsletterError} role="alert">
          {message}
        </p>
      )}
      <p className={styles.newsletterNote}>Free. No spam. Unsubscribe in one click.</p>
    </div>
  )
}
