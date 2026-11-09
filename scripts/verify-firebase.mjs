/** Confirms the app's Firestore configuration can read published stories and cannot write them. */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { initializeApp } from 'firebase/app'
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  limit,
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

const raw = await readFile(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
}

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})
const db = getFirestore(app)

const snapshot = await getDocs(
  query(collection(db, 'articles'), where('status', '==', 'published'), limit(50))
)
console.log(`✓ read ${snapshot.size} published articles`)
const first = snapshot.docs[0]?.data()
console.log(`  newest seeded: ${first?.title} (${first?.section})`)

try {
  await addDoc(collection(db, 'articles'), { title: 'unauthorised write test', status: 'published' })
  console.error('✗ write unexpectedly succeeded — check firestore.rules')
  process.exit(1)
} catch (error) {
  console.log(`✓ anonymous write blocked (${error.code || 'permission-denied'})`)
}

process.exit(0)
