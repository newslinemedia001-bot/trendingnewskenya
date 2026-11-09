import { NextResponse } from 'next/server'
import { describeError, supabaseAdmin, supabaseConfigured } from '@/lib/supabase'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function POST(request) {
  // Same-origin only: the form is the only intended caller.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }
  }

  const payload = await request.json().catch(() => null)
  const email = String(payload?.email || '').trim().toLowerCase()
  const source = String(payload?.source || 'site').slice(0, 40)

  if (!EMAIL.test(email) || email.length > 320) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { error: 'Newsletter signup is not connected yet. Please try again later.' },
      { status: 503 }
    )
  }

  try {
    const { error } = await supabaseAdmin()
      .from('tnk_newsletter_signups')
      .insert({ email, source })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('newsletter signup failed:', describeError(error))
    return NextResponse.json(
      { error: 'We could not save your address. Please try again.' },
      { status: 500 }
    )
  }
}
