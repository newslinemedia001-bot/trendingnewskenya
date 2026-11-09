'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SECTIONS, readingTime, sectionLabel } from '@/lib/site'
import ImageUpload from './ImageUpload'
import styles from './desk.module.css'

const EMPTY = {
  title: '',
  dek: '',
  section: 'kenya',
  tags: '',
  body: '',
  coverImageUrl: '',
  imageAlt: '',
  imageCaption: '',
  imageCredit: '',
  isFeatured: false,
  isBreaking: false,
}

function toForm(story) {
  if (!story) return EMPTY
  return {
    title: story.title || '',
    dek: story.dek || '',
    section: story.section || 'kenya',
    tags: (story.tags || []).join(', '),
    body: story.body || '',
    coverImageUrl: story.coverImageUrl || '',
    imageAlt: story.imageAlt || '',
    imageCaption: story.imageCaption || '',
    imageCredit: story.imageCredit || '',
    isFeatured: Boolean(story.isFeatured),
    isBreaking: Boolean(story.isBreaking),
  }
}

/** A tiny live preview of the article's own block syntax. */
function PreviewBody({ body }) {
  const blocks = useMemo(() => {
    const out = []
    for (const raw of String(body || '').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line) continue
      if (line.startsWith('## ')) out.push({ type: 'h4', text: line.slice(3) })
      else if (line.startsWith('> ')) out.push({ type: 'quote', text: line.slice(2) })
      else if (line.startsWith('- ')) out.push({ type: 'li', text: line.slice(2) })
      else out.push({ type: 'p', text: line })
    }
    return out
  }, [body])

  if (!blocks.length) return <p className={styles.previewEmpty}>The story starts here.</p>

  return (
    <div className={styles.previewBody}>
      {blocks.map((block, index) => {
        if (block.type === 'h4') return <h4 key={index}>{block.text}</h4>
        if (block.type === 'quote') {
          return (
            <p key={index} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10, fontStyle: 'italic' }}>
              {block.text}
            </p>
          )
        }
        if (block.type === 'li') {
          return (
            <p key={index} style={{ paddingLeft: 14, textIndent: -8 }}>
              — {block.text}
            </p>
          )
        }
        return <p key={index}>{block.text}</p>
      })}
    </div>
  )
}

export default function StoryEditor({ user, story, editable, deletable, canPublishStory, isAdmin }) {
  const router = useRouter()
  const [form, setForm] = useState(() => toForm(story))
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState('')
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState(story?.status || 'draft')
  const [slug, setSlug] = useState(story?.slug || '')
  const [savedAt, setSavedAt] = useState(story?.updatedAt || null)
  const deleting = useRef(false)

  const canPublish = Boolean(canPublishStory)
  const words = form.body.trim() ? form.body.trim().split(/\s+/).length : 0
  const minutes = readingTime(form.body)
  const bodyTooShort = status === 'published' && form.body.trim().length < 200

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setDirty(true)
    setNotice(null)
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function payload(nextStatus) {
    return {
      ...form,
      tags: form.tags,
      status: nextStatus,
    }
  }

  async function submit(nextStatus, { requiresPublish = false } = {}) {
    if (requiresPublish && !canPublish) return
    setPending(nextStatus || 'save')
    setErrors({})
    setNotice(null)

    try {
      const response = await fetch(
        story?.id ? `/api/desk/stories/${story.id}` : '/api/desk/stories',
        {
          method: story?.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload(nextStatus)),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrors(data.errors || {})
        setNotice({ tone: 'error', text: data.error || 'That did not save. Try again.' })
        setPending('')
        return
      }

      const saved = data.story
      setStatus(saved.status)
      setSlug(saved.slug)
      setSavedAt(saved.updatedAt)
      setDirty(false)
      setNotice({
        tone: 'success',          text:
          saved.status === 'published'
            ? 'Published. It is on the front page.'
            : 'Draft saved.',
      })

      if (!story?.id) {
        router.replace(`/desk/stories/${saved.id}`)
      }
      router.refresh()
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Check your connection.' })
    } finally {
      setPending('')
    }
  }

  async function remove() {
    if (!story?.id || deleting.current) return
    deleting.current = true
    setPending('delete')
    try {
      const response = await fetch(`/api/desk/stories/${story.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setNotice({ tone: 'error', text: data.error || 'That story could not be deleted.' })
        return
      }
      router.push('/desk/stories')
      router.refresh()
    } finally {
      deleting.current = false
      setPending('')
    }
  }

  const disabled = !editable || Boolean(pending)

  return (
    <div className={styles.editorGrid}>
      <div>
        <div className={styles.saveState} style={{ marginBottom: 12 }}>
          {dirty ? 'Unsaved changes' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString('en-KE')}` : 'Not saved yet'}
          {slug && !dirty ? (
            <>
              {' · '}
              <Link href={`/news/${slug}`} target="_blank" rel="noreferrer">
                /news/{slug}
              </Link>
            </>
          ) : null}
        </div>

        {!editable ? (
          <p className={styles.notice} style={{ marginBottom: 14 }}>
            {status === 'published'
              ? 'This story is published. Only its author or an administrator can change it.'
              : 'This story belongs to another editor. Ask an administrator if you need to change it.'}
          </p>
        ) : null}

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
            <label className={styles.label} htmlFor="title">
              Headline
            </label>
            <input
              id="title"
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="What happened, in one sentence"
              disabled={disabled}
            />
            {errors.title ? <span className={styles.fieldError}>{errors.title}</span> : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="dek">
              Standfirst
            </label>
            <textarea
              id="dek"
              className={`${styles.textarea} ${errors.dek ? styles.inputError : ''}`}
              value={form.dek}
              onChange={(event) => update('dek', event.target.value)}
              placeholder="One or two sentences that tell a reader why this matters"
              rows={2}
              disabled={disabled}
            />
            <span className={styles.counter}>{form.dek.length} characters</span>
            {errors.dek ? <span className={styles.fieldError}>{errors.dek}</span> : null}
          </div>

          <div className={styles.fields2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="section">
                Section
              </label>
              <select
                id="section"
                className={`${styles.select} ${errors.section ? styles.inputError : ''}`}
                value={form.section}
                onChange={(event) => update('section', event.target.value)}
                disabled={disabled}
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
              <label className={styles.label} htmlFor="tags">
                Topics
              </label>
              <input
                id="tags"
                className={styles.input}
                value={form.tags}
                onChange={(event) => update('tags', event.target.value)}
                placeholder="public-finance, nairobi"
                disabled={disabled}
              />
              <span className={styles.hint}>Comma separated. These become topic pages.</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="body">
              Story
            </label>
            <textarea
              id="body"
              className={`${styles.textarea} ${styles.textareaBody} ${errors.body ? styles.inputError : ''}`}
              value={form.body}
              onChange={(event) => update('body', event.target.value)}
              placeholder={'Write the story.\n\nStart a line with ## for a subhead, > for a pull quote, - for a list.'}
              disabled={disabled}
            />
            <span className={`${styles.counter} ${bodyTooShort ? styles.counterLow : ''}`}>
              {words} {words === 1 ? 'word' : 'words'} · {minutes} min read
              {bodyTooShort ? ' · too short to publish' : ''}
            </span>
            {errors.body ? <span className={styles.fieldError}>{errors.body}</span> : null}
          </div>

          <div className={styles.fields2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="coverImageUrl">
                Lead image URL
              </label>
              <input
                id="coverImageUrl"
                className={styles.input}
                value={form.coverImageUrl}
                onChange={(event) => update('coverImageUrl', event.target.value)}
                placeholder="https://…"
                disabled={disabled}
              />
              <ImageUpload
                value={form.coverImageUrl}
                onChange={(url) => update('coverImageUrl', url)}
                disabled={disabled}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="imageCredit">
                Photo credit
              </label>
              <input
                id="imageCredit"
                className={styles.input}
                value={form.imageCredit}
                onChange={(event) => update('imageCredit', event.target.value)}
                placeholder="Name / agency (licence)"
                disabled={disabled}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="imageAlt">
              Image description
            </label>
            <input
              id="imageAlt"
              className={styles.input}
              value={form.imageAlt}
              onChange={(event) => update('imageAlt', event.target.value)}
              placeholder="What the photograph shows, for screen readers and search"
              disabled={disabled}
            />
          </div>

          {isAdmin ? (
            <div className={styles.fields2}>
              <label className={styles.toggle} htmlFor="isFeatured">
                <input
                  id="isFeatured"
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => update('isFeatured', event.target.checked)}
                  disabled={disabled}
                />
                Lead the front page
              </label>
              <label className={styles.toggle} htmlFor="isBreaking">
                <input
                  id="isBreaking"
                  type="checkbox"
                  checked={form.isBreaking}
                  onChange={(event) => update('isBreaking', event.target.checked)}
                  disabled={disabled}
                />
                Mark as breaking
              </label>
            </div>
          ) : null}

          {editable ? (
            <div className={styles.actionBarInner} style={{ borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => submit(status === 'published' ? 'published' : 'draft')}
                  disabled={Boolean(pending)}
                >
                  {pending === 'draft' || pending === 'published'
                    ? 'Saving…'
                    : status === 'published'
                      ? 'Save changes'
                      : 'Save draft'}
                </button>

                {status !== 'published' && canPublish ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnAccent}`}
                    onClick={() => submit('published', { requiresPublish: true })}
                    disabled={Boolean(pending)}
                  >
                    {pending === 'published' ? 'Publishing…' : 'Publish'}
                  </button>
                ) : null}

                {status === 'published' && canPublish ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => submit('draft')}
                    disabled={Boolean(pending)}
                  >
                    {pending === 'draft' ? 'Unpublishing…' : 'Unpublish'}
                  </button>
                ) : null}


              </div>

              {deletable && story?.id ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                  onClick={remove}
                  disabled={Boolean(pending)}
                >
                  {pending === 'delete' ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <aside className={styles.editorSide}>
        <div className={styles.preview}>
          <p className={styles.previewKicker}>{sectionLabel(form.section)}</p>
          <h2 className={styles.previewHeadline}>{form.title || 'Untitled story'}</h2>
          {form.dek ? <p className={styles.previewDek}>{form.dek}</p> : null}
          <PreviewBody body={form.body} />
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>This story</h2>
          </div>
          <dl className={styles.metaList}>
            <div>
              <dt>Status</dt>
              <dd>{status === 'published' ? 'Published' : 'Draft'}</dd>
            </div>
            <div>
              <dt>Byline</dt>
              <dd>{story?.authorName || user.name}</dd>
            </div>
            <div>
              <dt>URL</dt>
              <dd>{slug ? `/news/${slug}` : 'from the headline'}</dd>
            </div>
            <div>
              <dt>Words</dt>
              <dd>{words}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  )
}
