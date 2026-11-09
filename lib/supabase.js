/**
 * Supabase access for the newsroom.
 *
 * Everything in the app is read and written on the server: pages, route
 * handlers and the wire sync all go through this module. The browser never
 * talks to Supabase, so the only key used here is the secret (service-role)
 * one, which bypasses row-level security and must never be exposed with a
 * NEXT_PUBLIC_ prefix.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY      secret key from Project Settings -> API Keys
 *
 * Tables live in the `public` schema with a `tnk_` prefix (see
 * scripts/supabase-schema.sql) so they cannot collide with the project's
 * legacy tables.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Public URL of the project, or null when it is not configured. */
export function supabaseUrl() {
  return url ? String(url).replace(/\/+$/, '') : null
}

export function supabaseConfigured() {
  return Boolean(url && serviceKey)
}

let client = null

/**
 * Service-role client (server only). Cached per process so a page that reads
 * several tables opens one connection pool rather than one per query.
 */
export function supabaseAdmin() {
  if (!supabaseConfigured()) return null
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'trending-news' } },
    })
  }
  return client
}

/** Storage bucket that holds lead images. Created as a public bucket. */
export const IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'covers'

/** Turn a PostgREST/storage error into something worth showing an editor. */
export function describeError(error, fallback = 'The database request failed.') {
  if (!error) return fallback
  const message = error.message || String(error)
  if (error.code === '42P01') {
    return `The tnk_ tables are missing. Run the schema SQL in scripts/supabase-schema.sql.`
  }
  if (/Invalid API key|JWT/i.test(message)) {
    return 'Supabase rejected the key. Check SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  }
  return message
}
