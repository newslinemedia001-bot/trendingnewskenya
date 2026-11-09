import { readFile } from 'node:fs/promises'
const raw = await readFile('.env.local', 'utf8').catch(() => '')
const env = {}
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { initializeApp } = await import('firebase/app')
const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore')
const db = getFirestore(initializeApp({ apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: env.NEXT_PUBLIC_FIREBASE_APP_ID }))
const pub = await getDocs(query(collection(db, 'articles'), where('status', '==', 'published')))
console.log('published docs in Firestore:', pub.size)
pub.forEach((d) => console.log(' -', d.data().title, '| by', d.data().authorName))
const authors = await getDocs(collection(db, 'authors'))
console.log('public bylines:', authors.docs.map((d) => d.id).join(', '))
const users = await getDocs(collection(db, 'users')).catch((e) => ({ docs: [], denied: e.code }))
console.log('users collection readable by client?', users.denied ? 'no (' + users.denied + ')' : 'YES — rules leak!')
process.exit(0)
