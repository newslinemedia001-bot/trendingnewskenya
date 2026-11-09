'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROLES, ROLE_LABEL, ROLE_NOTE } from '@/lib/desk/roles'
import styles from './desk.module.css'

const EMPTY_FORM = { name: '', email: '', title: '', role: 'editor', password: '' }

function suggestPassword() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  const body = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
  return `${body.slice(0, 4)}-${body.slice(4, 9)}-${body.slice(9)}`
}

export default function TeamManager({ team, currentUserId }) {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [pending, setPending] = useState('')
  const [resetFor, setResetFor] = useState(null)
  const [resetValue, setResetValue] = useState('')
  const [created, setCreated] = useState(null)

  function patch(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage(null)
  }

  async function createAccount(event) {
    event.preventDefault()
    setPending('create')
    setErrors({})
    setMessage(null)

    try {
      const response = await fetch('/api/desk/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrors(data.errors || {})
        setMessage({ tone: 'error', text: data.error || 'That account could not be created.' })
        return
      }

      setCreated({ email: form.email, password: form.password })
      setForm(EMPTY_FORM)
      setMessage({
        tone: 'success',
        text: `${data.user.name} can now sign in with the password you set.`,
      })
      router.refresh()
    } catch {
      setMessage({ tone: 'error', text: 'Could not reach the server.' })
    } finally {
      setPending('')
    }
  }

  async function updateMember(id, patchBody, label) {
    setPending(`${label}:${id}`)
    setMessage(null)
    try {
      const response = await fetch(`/api/desk/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({ tone: 'error', text: data.error || data.errors?.form || 'That change failed.' })
        return
      }
      setMessage({ tone: 'success', text: 'Saved.' })
      router.refresh()
    } catch {
      setMessage({ tone: 'error', text: 'Could not reach the server.' })
    } finally {
      setPending('')
    }
  }

  async function removeMember(member) {
    setPending(`delete:${member.id}`)
    setMessage(null)
    try {
      const response = await fetch(`/api/desk/team/${member.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({ tone: 'error', text: data.error || 'That account could not be removed.' })
        return
      }
      setMessage({ tone: 'success', text: `${member.name} has been removed.` })
      router.refresh()
    } catch {
      setMessage({ tone: 'error', text: 'Could not reach the server.' })
    } finally {
      setPending('')
    }
  }

  return (
    <>
      {message ? (
        <p
          className={`${styles.notice} ${message.tone === 'success' ? styles.noticeSuccess : ''}`}
          role="status"
          style={{ marginBottom: 18 }}
        >
          {message.text}
        </p>
      ) : null}

      {created ? (
        <p className={styles.notice} style={{ marginBottom: 18 }}>
          Pass this on to the new starter now — it is the only time it is shown: <strong>{created.email}</strong>{' '}
          / <strong>{created.password}</strong>
        </p>
      ) : null}

      <div className={styles.columns}>
        <section className={styles.panel} aria-label="Staff">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Staff ({team.length})</h2>
          </div>

          <div className={styles.team}>
            {team.map((member) => {
              const isSelf = member.id === currentUserId
              return (
                <div
                  key={member.id}
                  className={`${styles.member} ${member.active ? '' : styles.inactive}`}
                >
                  <div>
                    <p className={styles.memberName}>
                      {member.name}
                      {isSelf ? <span className={styles.muted}> (you)</span> : null}
                    </p>
                    <p className={styles.memberMeta}>
                      {member.email} · {member.stories}{' '}
                      {member.stories === 1 ? 'story' : 'stories'}
                      {member.active ? '' : ' · deactivated'}
                    </p>

                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        className={`${styles.select} ${styles.btnSmall}`}
                        value={member.role}
                        onChange={(event) =>
                          updateMember(member.id, { role: event.target.value }, 'role')
                        }
                        disabled={Boolean(pending)}
                        aria-label={`Role for ${member.name}`}
                        style={{ width: 150, padding: '6px 8px', fontSize: 12 }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                      <span className={styles.muted}>{member.title || ROLE_NOTE[member.role]}</span>
                    </div>

                    {resetFor === member.id ? (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          className={styles.input}
                          style={{ maxWidth: 240 }}
                          value={resetValue}
                          onChange={(event) => setResetValue(event.target.value)}
                          placeholder="New password (8+ characters)"
                          aria-label={`New password for ${member.name}`}
                        />
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                          onClick={async () => {
                            await updateMember(member.id, { password: resetValue }, 'password')
                            setResetFor(null)
                            setResetValue('')
                          }}
                          disabled={Boolean(pending)}
                        >
                          Set password
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => {
                            setResetFor(null)
                            setResetValue('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.memberActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      onClick={() => {
                        setResetFor(resetFor === member.id ? null : member.id)
                        setResetValue('')
                      }}
                    >
                      Password
                    </button>

                    {!isSelf ? (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() =>
                          updateMember(member.id, { active: !member.active }, 'active')
                        }
                        disabled={Boolean(pending)}
                      >
                        {member.active ? 'Deactivate' : 'Restore'}
                      </button>
                    ) : null}

                    {!isSelf && member.stories === 0 ? (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => removeMember(member)}
                        disabled={Boolean(pending)}
                      >
                        {pending === `delete:${member.id}` ? 'Removing…' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className={styles.panel} aria-label="Add a staff account">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Add an account</h2>
          </div>

          <form className={styles.form} onSubmit={createAccount}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                value={form.name}
                onChange={(event) => patch('name', event.target.value)}
                autoComplete="off"
              />
              {errors.name ? <span className={styles.fieldError}>{errors.name}</span> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                value={form.email}
                onChange={(event) => patch('email', event.target.value)}
                autoComplete="off"
              />
              {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="title">
                Job title
              </label>
              <input
                id="title"
                className={styles.input}
                value={form.title}
                onChange={(event) => patch('title', event.target.value)}
                placeholder="Political correspondent"
              />
              <span className={styles.hint}>Shown as the byline role on published stories.</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="role">
                Role
              </label>
              <select
                id="role"
                className={styles.select}
                value={form.role}
                onChange={(event) => patch('role', event.target.value)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>{ROLE_NOTE[form.role]}</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                First password
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  value={form.password}
                  onChange={(event) => patch('password', event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => patch('password', suggestPassword())}
                >
                  Suggest
                </button>
              </div>
              {errors.password ? (
                <span className={styles.fieldError}>{errors.password}</span>
              ) : null}
            </div>

            {errors.form ? <p className={styles.fieldError}>{errors.form}</p> : null}

            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={Boolean(pending)}>
              {pending === 'create' ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
