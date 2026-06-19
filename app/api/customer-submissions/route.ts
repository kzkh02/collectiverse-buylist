import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: 'Missing Supabase environment variables.',
        },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)

    const email = searchParams.get('email')?.trim().toLowerCase()
    const password = searchParams.get('password')?.trim()
    const reference = searchParams.get('reference')?.trim()

    if (!email || !password) {
      return NextResponse.json({
        submissions: [],
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const customerPasswordHash = await hashPassword(password)

    let query = supabase
      .from('buy_submissions')
      .select(`
        id,
        customer_email,
        customer_name,
        status,
        offer_total,
        created_at,
        admin_notes,
        buy_submission_cards (
          card_name,
          set_name,
          card_number,
          quantity,
          condition,
          review_status,
          offer_amount
        )
      `)
      .eq('customer_email', email)
      .eq('customer_password', customerPasswordHash)
      .order('created_at', { ascending: false })

    if (reference) {
      query = query.eq('id', reference)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        {
          error: 'Could not fetch submissions.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      submissions: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Could not fetch submissions.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
