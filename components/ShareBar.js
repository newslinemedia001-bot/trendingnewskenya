'use client'

import { useState } from 'react'
import styles from '@/app/article.module.css'

export default function ShareBar({ url, title }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    { label: 'X', href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: 'Email', href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.share} aria-label="Share this story">
      <span className={styles.shareLabel}>Share</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.shareLink}
        >
          {link.label}
        </a>
      ))}
      <button type="button" className={styles.shareButton} onClick={copyLink}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  )
}
