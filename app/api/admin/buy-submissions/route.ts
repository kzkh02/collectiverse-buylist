import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('buy_submissions')
      .select(`
        *,
        buy_submission_cards (
          *
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          error: 'Could not load submissions.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ submissions: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Could not load submissions.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    if (body.action === 'update_card') {
      const { cardId, patch } = body

      const allowedPatch = {
        review_status: patch.review_status,
        offer_amount: patch.offer_amount,
        rejection_reason: patch.rejection_reason,
      }

      const { error } = await supabase
        .from('buy_submission_cards')
        .update(allowedPatch)
        .eq('id', cardId)

      if (error) {
        return NextResponse.json(
          {
            error: 'Could not update card.',
            details: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (body.action === 'update_submission') {
      const { submissionId, patch } = body

     const allowedPatch: any = {
  status: patch.status,
  offer_total: patch.offer_total,
  admin_notes: patch.admin_notes,
  updated_at: new Date().toISOString(),
}

if (patch.status === 'paid') {
  allowedPatch.paid_at = new Date().toISOString()
}

      const { error } = await supabase
        .from('buy_submissions')
        .update(allowedPatch)
        .eq('id', submissionId)

      if (error) {
        return NextResponse.json(
          {
            error: 'Could not update submission.',
            details: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (body.action === 'delete_card') {
      const { error } = await supabase
        .from('buy_submission_cards')
        .delete()
        .eq('id', body.cardId)

      if (error) {
        return NextResponse.json(
          {
            error: 'Could not delete card.',
            details: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true })
    }

    if (body.action === 'delete_submission') {
      const { error } = await supabase
        .from('buy_submissions')
        .delete()
        .eq('id', body.submissionId)

      if (error) {
        return NextResponse.json(
          {
            error: 'Could not delete submission.',
            details: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      {
        error: 'Unknown admin action.',
      },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Admin update failed.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
