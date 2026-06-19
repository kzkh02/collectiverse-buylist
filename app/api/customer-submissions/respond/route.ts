import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: 'Missing Supabase environment variables.',
        },
        { status: 500 }
      )
    }

    if (!body.id || !body.email || !body.password) {
      return NextResponse.json(
        {
          error: 'Email, password and submission reference are required.',
        },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const decision =
      body.decision === 'accepted'
        ? 'accepted'
        : 'declined'

    const customerPasswordHash = await hashPassword(String(body.password))

    const { data, error } = await supabase
      .from('buy_submissions')
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('customer_email', String(body.email).trim().toLowerCase())
      .eq('customer_password', customerPasswordHash)
      .select('id')
      .single()

    if (error || !data) {
      return NextResponse.json(
        {
          error: 'Could not update submission. Check your email and password.',
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Could not update submission.',
      },
      { status: 500 }
    )
  }
}
