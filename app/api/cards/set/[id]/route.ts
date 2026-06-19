import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json([])
  }

  try {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${encodeURIComponent(id)}&orderBy=number&select=id,name,number,set,images&pageSize=250`,
      {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return new NextResponse(`Pokemon TCG API error: ${response.status}`, { status: 502 })
    }

    const json = await response.json()

    const cards = (json.data || []).map((card: any) => ({
      id: card.id,
      source: 'pokemon-tcg-api',
      language: 'en',
      name: card.name,
      setName: card.set?.name || '',
      number: card.number || '',
      imageUrl: card.images?.large || card.images?.small || '',
    }))

    return NextResponse.json(cards)
  } catch (error: any) {
    return new NextResponse(error?.message || 'Failed to load set cards', { status: 500 })
  }
}
