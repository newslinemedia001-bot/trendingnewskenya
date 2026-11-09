'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SECTIONS } from '@/lib/site'
import ImageUpload from './ImageUpload'
import styles from './desk.module.css'

const EMPTY = {
  title: '',
  section: 'kenya',
  dek: '',
  body: '',
  coverImageUrl: '',
  tags: '',
}

/**
 * The dashboard composer: headline, standfirst and copy are enough to put a
 * story on the site. Publishing happens in a single request; saving a draft
 * hands the story to the full editor for images, topics and flags.
 */
export default function QuickPublish() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState('')

  const words = form.body.trim() ? form.body.trim().split(/\s+/).length : 0

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setNotice(null)
  }

  async function submit(status) {
    setPending(status)
    setErrors({})
    setNotice(null)

    try {
      const response = await fetch('/api/desk/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrors(data.errors || {})
        setNotice({ tone: 'error', text: data.error || 'That story did not save.' })
        return
      }

      const saved = data.story
      setForm(EMPTY)

      if (status === 'published') {
        setNotice({
          tone: 'success',
          text: `Published: “${saved.title}”. It is on the front page now.`,
        })
        router.refresh()
      } else {
        router.push(`/desk/stories/${saved.id}`)
      }
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Check your connection.' })
    } finally {
      setPending('')
    }
  }

  return (
    <section className={styles.panel} aria-label="Publish a story">
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Publish a story</h2>
        <span className={styles.muted}>
          {words ? `${words} ${words === 1 ? 'word' : 'words'}` : 'Draft it here, publish in one click'}
        </span>
      </div>

      {notice ? (
        <p
          className={`${styles.notice} ${notice.tone === 'success' ? styles.noticeSuccess : ''}`}
          role="status"
          style={{ marginBottom: 14 }}
        >
          {notice.text}
        </p>
      ) : null}

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="quick-title">
            Headline
          </label>
          <input
            id="quick-title"
            className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="What happened, in one sentence"
          />
          {errors.title ? <span className={styles.fieldError}>{errors.title}</span> : null}
        </div>

        <div className={styles.fields2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="quick-section">
              Section
            </label>
            <select
              id="quick-section"
              className={`${styles.select} ${errors.section ? styles.inputError : ''}`}
              value={form.section}
              onChange={(event) => update('section', event.target.value)}
            >
              {SECTIONS.map((section) => (
                <option key={section.slug} value={section.slug}>
                  {section.label}
                </option>
              ))}
            </select>
            {errors.section ? <span className={styles.fieldError}>{errors.section}</span> : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="quick-image">
              Lead image URL <span className={styles.hint}>(optional)</span>
            </label>
            <input
              id="quick-image"
              className={styles.input}
              value={form.coverImageUrl}
              onChange={(event) => update('coverImageUrl', event.target.value)}
              placeholder="https://…"
            />
            <ImageUpload
              value={form.coverImageUrl}
              onChange={(url) => update('coverImageUrl', url)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quick-dek">
            Standfirst
          </label>
          <textarea
            id="quick-dek"
            className={`${styles.textarea} ${errors.dek ? styles.inputError : ''}`}
            rows={2}
            value={form.dek}
            onChange={(event) => update('dek', event.target.value)}
            placeholder="One or two sentences that tell a reader why this matters"
          />
          {errors.dek ? <span className={styles.fieldError}>{errors.dek}</span> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quick-body">
            Story
          </label>
          <textarea
            id="quick-body"
            className={`${styles.textarea} ${styles.textareaBody} ${errors.body ? styles.inputError : ''}`}
            value={form.body}
            onChange={(event) => update('body', event.target.value)}
            placeholder={'Write the story.\n\nStart a line with ## for a subhead, > for a pull quote, - for a list.'}
          />
          {errors.body ? <span className={styles.fieldError}>{errors.body}</span> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quick-tags">
            Topics <span className={styles.hint}>(optional)</span>
          </label>
          <input
            id="quick-tags"
            className={styles.input}
            value={form.tags}
            onChange={(event) => update('tags', event.target.value)}
            placeholder="nairobi, public-finance"
          />
        </div>

        {errors.form ? <p className={styles.fieldError}>{errors.form}</p> : null}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnAccent}`}
            onClick={() => submit('published')}
            disabled={Boolean(pending)}
          >
            {pending === 'published' ? 'Publishing…' : 'Publish now'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => submit('draft')}
            disabled={Boolean(pending)}
          >
            {pending === 'draft' ? 'Saving…' : 'Save as draft'}
          </button>
        </div>
      </div>
    </section>
  )
}
