#!/usr/bin/env node
/**
 * Removes the seeded demo archive from Firestore.
 *
 *   node scripts/purge-seeded-content.mjs --confirm
 *
 * Deletes every document in `articles` and `authors` — the two collections the
 * seed script filled with 32 invented stories and 8 invented writers. It does
 * not touch `users` (staff accounts) or `newsletter_signups` (real readers).
 *
 * Requires FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function loadEnv() {
  try {
    const raw = await readFile(path.join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // .env.local is optional.
  }
}

await loadEnv()

if (!process.argv.includes('--confirm')) {
  console.log('This deletes every document in `articles` and `authors`.')
  console.log('Re-run with --confirm to do it.')
  process.exit(0)
}

const { deleteDoc, hasAdminCredentials, readCollection } = await import(
  '../lib/desk/firestore-rest.mjs'
)

if (!hasAdminCredentials()) {
  console.error('Set FIREBASE_SERVICE_ACCOUNT (or GOOGLE_APPLICATION_CREDENTIALS) first.')
  process.exit(1)
}

for (const name of ['articles', 'authors']) {
  const documents = await readCollection(name)
  if (!documents.length) {
    console.log(`- ${name}: already empty`)
    continue
  }
  for (const document of documents) await deleteDoc(name, document.id)
  console.log(`✓ ${name}: ${documents.length} documents removed`)
}

console.log('Done. The desk is now the only source of stories.')
process.exit(0)
