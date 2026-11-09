/**
 * Lead-image upload.
 *
 * The browser posts a file here; this route checks the session, sniffs the
 * real image type from the bytes, and puts the object in Supabase Storage with
 * the service-role key. The public URL is returned for the story's
 * coverImageUrl, so the desk never needs an external image host.
 */
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { apiUser } from '@/lib/desk/guard'
import { IMAGE_BUCKET, describeError, supabaseAdmin, supabaseConfigured } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024

/** Accepted types, keyed by the signature we look for in the first bytes. */
function detectType(bytes) {
  if (bytes.length < 12) return null
  const hex = bytes.subarray(0, 12).toString('hex').toLowerCase()
  if (hex.startsWith('ffd8ff')) return { mime: 'image/jpeg', ext: 'jpg' }
  if (hex.startsWith('89504e47')) return { mime: 'image/png', ext: 'png' }
  if (hex.startsWith('47494638')) return { mime: 'image/gif', ext: 'gif' }
  if (hex.startsWith('52494646') && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' }
  }
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = bytes.subarray(8, 12).toString('ascii')
    if (brand === 'avif' || brand === 'avis') return { mime: 'image/avif', ext: 'avif' }
  }
  return null
}

export async function POST(request) {
  const { response } = await apiUser()
  if (response) return response

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { error: 'Image uploads need SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
      { status: 503 }
    )
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Choose an image file.' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'That file is empty.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Images must be 8 MB or smaller. Resize it and try again.' },
      { status: 413 }
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const detected = detectType(bytes)
  if (!detected) {
    return NextResponse.json(
      { error: 'That is not a JPEG, PNG, WebP, AVIF or GIF image.' },
      { status: 415 }
    )
  }

  const key = `articles/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${detected.ext}`
  const storage = supabaseAdmin().storage.from(IMAGE_BUCKET)

  const { error } = await storage.upload(key, bytes, {
    contentType: detected.mime,
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) {
    console.error('image upload failed:', describeError(error))
    return NextResponse.json(
      {
        error: /bucket/i.test(error.message)
          ? `The "${IMAGE_BUCKET}" storage bucket does not exist yet. Create it in Supabase -> Storage (public bucket).`
          : describeError(error, 'The image could not be uploaded.'),
      },
      { status: 500 }
    )
  }

  const { data } = storage.getPublicUrl(key)
  return NextResponse.json({
    url: data.publicUrl,
    path: key,
    bytes: bytes.length,
    type: detected.mime,
  })
}
