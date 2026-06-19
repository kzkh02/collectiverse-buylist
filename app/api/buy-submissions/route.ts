import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

type PayloadCard = {
  uid: string
  tcg_id?: string
  source?: string
  card_language?: string
  card_name: string
  set_name?: string
  card_number?: string
  image_url?: string
  quantity?: number
  condition?: string
  finish?: string
  condition_note?: string
}

function isManualCard(card: PayloadCard) {
  return card.source === 'request' || card.card_language !== 'en'
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-')
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: 'Missing Supabase environment variables.',
          details:
            'Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local, then restart npm run dev.',
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const formData = await request.formData()
    const rawPayload = formData.get('payload')

    if (!rawPayload || typeof rawPayload !== 'string') {
      return NextResponse.json(
        { error: 'Invalid submission payload.' },
        { status: 400 }
      )
    }

    const payload = JSON.parse(rawPayload) as {
      customer_email?: string
      customer_password?: string
      customer_name?: string | null
      payment_method?: string | null
      payment_details?: string | null
      customer_message?: string | null
      cards?: PayloadCard[]
    }

    if (!payload.customer_email || !payload.customer_email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    if (!payload.customer_password || payload.customer_password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    if (!payload.payment_method || payload.payment_method !== 'Bank Transfer') {
      return NextResponse.json(
        { error: 'Choose Bank Transfer or PayPal as your payment method.' },
        { status: 400 }
      )
    }

    if (!payload.payment_details?.trim()) {
      return NextResponse.json(
        {
          error:
            payload.payment_method === 'PayPal'
              ? 'PayPal email address is required.'
              : 'Bank details are required.',
        },
        { status: 400 }
      )
    }

    if (!payload.cards || payload.cards.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one card before submitting.' },
        { status: 400 }
      )
    }

    for (const card of payload.cards) {
      if (!card.card_name?.trim()) {
        return NextResponse.json(
          { error: 'Every card needs a card name.' },
          { status: 400 }
        )
      }

      if (isManualCard(card)) {
        const front = formData.get(`front_${card.uid}`)
        const back = formData.get(`back_${card.uid}`)

        if (
          !(front instanceof File) ||
          front.size === 0 ||
          !(back instanceof File) ||
          back.size === 0
        ) {
          return NextResponse.json(
            {
              error: `Front and back photos are required for ${card.card_name}.`,
            },
            { status: 400 }
          )
        }
      }
    }

    const submissionId = crypto.randomUUID()
    const customerPasswordHash = await hashPassword(payload.customer_password)

    const insertResult = await supabase.from('buy_submissions').insert({
      id: submissionId,
      customer_email: payload.customer_email.trim().toLowerCase(),
      customer_password: customerPasswordHash,
      customer_name: payload.customer_name || null,
      payment_method: payload.payment_method || null,
      payment_details: payload.payment_details.trim(),
      customer_message: payload.customer_message || null,
      status: 'pending_review',
      offer_total: 0,
    })

    if (insertResult.error) {
      return NextResponse.json(
        {
          error: 'Could not create submission.',
          details: insertResult.error.message,
        },
        { status: 500 }
      )
    }

    for (const card of payload.cards) {
      let frontPhotoUrl: string | null = null
      let backPhotoUrl: string | null = null

      for (const side of ['front', 'back'] as const) {
        const file = formData.get(`${side}_${card.uid}`)

        if (file instanceof File && file.size > 0) {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${submissionId}/${safeFileName(card.uid)}-${side}.${safeFileName(ext)}`

          const uploadResult = await supabase.storage
            .from('buy-card-photos')
            .upload(path, file, {
              upsert: true,
              contentType: file.type || 'image/jpeg',
            })

          if (uploadResult.error) {
            return NextResponse.json(
              {
                error: `Could not upload ${side} photo for ${card.card_name}.`,
                details: uploadResult.error.message,
              },
              { status: 500 }
            )
          }

          const publicUrl = supabase.storage
            .from('buy-card-photos')
            .getPublicUrl(path).data.publicUrl

          if (side === 'front') frontPhotoUrl = publicUrl
          if (side === 'back') backPhotoUrl = publicUrl
        }
      }

      const cardResult = await supabase.from('buy_submission_cards').insert({
        submission_id: submissionId,
        tcg_id: card.tcg_id || null,
        source: card.source || 'pokemon_tcg_api',
        card_language: card.card_language || 'en',
        card_name: card.card_name,
        set_name: card.set_name || null,
        card_number: card.card_number || null,
        image_url: card.image_url || null,
        front_photo_url: frontPhotoUrl,
        back_photo_url: backPhotoUrl,
        quantity: Math.max(1, Number(card.quantity || 1)),
        condition: card.condition || 'Near Mint',
        condition_note: card.condition_note || null,
        review_status: 'accepted',
      })

      if (cardResult.error) {
        return NextResponse.json(
          {
            error: `Could not save card: ${card.card_name}.`,
            details: cardResult.error.message,
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ id: submissionId })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Submission failed.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}