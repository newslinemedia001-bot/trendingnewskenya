/**
 * Editorial accounts, stored in Firestore (`users`) with scrypt password
 * hashes. Nothing in here may run in the browser: it touches password hashes.
 *
 * A separate public `authors` document carries the byline (name and job title)
 * so the site can render author pages without exposing the private record.
 */
import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { deleteDoc, readCollection, readDoc, writeDoc } from '@/lib/desk/store'
import { ROLES, ROLE_LABEL, ROLE_ORDER } from '@/lib/desk/roles'

const scrypt = promisify(scryptCallback)

export { ROLES, ROLE_LABEL, ROLE_NOTE } from '@/lib/desk/roles'

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 }

/** `scrypt$N$r$p$salt$hash`, all base64url. */
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(String(password), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 128 * 1024 * 1024,
  })
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [scheme, N, r, p, saltValue, hashValue] = String(stored).split('$')
  if (scheme !== 'scrypt' || !saltValue || !hashValue) return false
  try {
    const expected = Buffer.from(hashValue, 'base64url')
    const derived = await scrypt(String(password), Buffer.from(saltValue, 'base64url'), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * 1024 * 1024,
    })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function bylineSlug(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** The shape that is safe to hand to a page or an API response. */
export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    slug: user.slug,
    title: user.title || '',
    role: user.role,
    active: user.active !== false,
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
  }
}

export async function listUsers() {
  const users = await readCollection('users')
  return users.sort((a, b) => {
    const roleDiff = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
    if (roleDiff !== 0) return roleDiff
    return String(a.name).localeCompare(String(b.name))
  })
}

export async function getUser(id) {
  if (!id) return null
  return readDoc('users', id)
}

export async function findUserByEmail(email) {
  const target = normalizeEmail(email)
  if (!target) return null
  const users = await readCollection('users')
  return users.find((user) => normalizeEmail(user.email) === target) || null
}

export async function countActiveAdmins() {
  const users = await readCollection('users')
  return users.filter((user) => user.role === 'admin' && user.active !== false).length
}

function validate({ email, name, password, role }, { requirePassword = true } = {}) {
  const errors = {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeEmail(email))) {
    errors.email = 'Enter a valid email address.'
  }
  if (String(name || '').trim().length < 2) errors.name = 'Enter the staff member’s name.'
  if (!ROLES.includes(role)) errors.role = 'Choose a role.'
  if (requirePassword && String(password || '').length < 8) {
    errors.password = 'Use at least 8 characters.'
  }
  return errors
}

/** Mirrors the byline into the public `authors` collection. */
async function syncByline(user) {
  await writeDoc(
    'authors',
    user.slug,
    {
      name: user.name,
      role: user.title || ROLE_LABEL[user.role],
      bio: user.bio || '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

export async function createUser({ email, name, title, role, password, actor }) {
  const errors = validate({ email, name, password, role })
  if (Object.keys(errors).length) return { ok: false, errors }

  const cleanEmail = normalizeEmail(email)
  if (await findUserByEmail(cleanEmail)) {
    return { ok: false, errors: { email: 'That email already has a desk account.' } }
  }

  let slug = bylineSlug(name) || `staff-${Date.now()}`
  const taken = await readDoc('authors', slug)
  if (taken) slug = `${slug}-${randomBytes(2).toString('hex')}`

  const now = new Date().toISOString()
  const user = {
    id: randomUUID(),
    email: cleanEmail,
    name: String(name).trim(),
    slug,
    title: String(title || '').trim(),
    role,
    active: true,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
    createdBy: actor?.email || '',
    lastLoginAt: null,
  }

  await writeDoc('users', user.id, user, { merge: false })
  await syncByline(user)
  return { ok: true, user: publicUser(user) }
}

export async function updateUser(id, patch, actor) {
  const existing = await getUser(id)
  if (!existing) return { ok: false, errors: { form: 'That account no longer exists.' } }

  const next = {
    name: patch.name !== undefined ? String(patch.name).trim() : existing.name,
    email: patch.email !== undefined ? normalizeEmail(patch.email) : existing.email,
    title: patch.title !== undefined ? String(patch.title).trim() : existing.title || '',
    role: patch.role !== undefined ? patch.role : existing.role,
  }

  const errors = validate({ ...next, password: 'placeholder' }, { requirePassword: false })
  if (Object.keys(errors).length) return { ok: false, errors }

  if (next.email !== existing.email) {
    const clash = await findUserByEmail(next.email)
    if (clash && clash.id !== id) {
      return { ok: false, errors: { email: 'That email already has a desk account.' } }
    }
  }

  if (next.role !== 'admin' && existing.role === 'admin') {
    const admins = await countActiveAdmins()
    if (admins <= 1) {
      return { ok: false, errors: { role: 'There must be at least one administrator.' } }
    }
  }

  const updated = {
    ...existing,
    ...next,
    updatedAt: new Date().toISOString(),
    updatedBy: actor?.email || '',
  }

  await writeDoc('users', id, updated, { merge: true })
  await syncByline(updated)
  return { ok: true, user: publicUser(updated) }
}

export async function setPassword(id, password) {
  if (String(password || '').length < 8) {
    return { ok: false, errors: { password: 'Use at least 8 characters.' } }
  }
  const existing = await getUser(id)
  if (!existing) return { ok: false, errors: { form: 'That account no longer exists.' } }

  await writeDoc(
    'users',
    id,
    { passwordHash: await hashPassword(password), updatedAt: new Date().toISOString() },
    { merge: true }
  )
  return { ok: true }
}

export async function setActive(id, active, actor) {
  const existing = await getUser(id)
  if (!existing) return { ok: false, errors: { form: 'That account no longer exists.' } }

  if (!active && existing.role === 'admin') {
    const admins = await countActiveAdmins()
    if (admins <= 1) {
      return { ok: false, errors: { form: 'There must be at least one active administrator.' } }
    }
  }

  await writeDoc(
    'users',
    id,
    { active: Boolean(active), updatedAt: new Date().toISOString(), updatedBy: actor?.email || '' },
    { merge: true }
  )
  return { ok: true }
}

/** Accounts are removed only when they have never filed a story. */
export async function deleteUser(id, { storyCount = 0 } = {}) {
  const existing = await getUser(id)
  if (!existing) return { ok: false, errors: { form: 'That account no longer exists.' } }

  if (storyCount > 0) {
    return {
      ok: false,
      errors: {
        form: `This account has ${storyCount} ${storyCount === 1 ? 'story' : 'stories'} on file. Deactivate it instead so the bylines stay intact.`,
      },
    }
  }

  if (existing.role === 'admin') {
    const admins = await countActiveAdmins()
    if (admins <= 1) {
      return { ok: false, errors: { form: 'There must be at least one administrator.' } }
    }
  }

  await deleteDoc('users', id)
  await deleteDoc('authors', existing.slug)
  return { ok: true }
}

export async function markLogin(id) {
  await writeDoc('users', id, { lastLoginAt: new Date().toISOString() }, { merge: true })
}

/** Authenticates an email and password. Returns the user record or null. */
export async function authenticate(email, password) {
  const user = await findUserByEmail(email)
  if (!user) {
    // Spend the same time on unknown addresses so timing does not reveal which
    // accounts exist.
    await verifyPassword(String(password || ''), 'scrypt$16384$8$1$c2FsdA$aGFzaA')
    return null
  }
  if (user.active === false) return { blocked: true }
  const valid = await verifyPassword(password, user.passwordHash)
  return valid ? user : null
}

export function canManageTeam(user) {
  return user?.role === 'admin' && user.active !== false
}
