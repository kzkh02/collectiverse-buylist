import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  try {
   const safeQuery = query
  .trim()
  .replace(/["'():/\\]/g, ' ')
  .replace(/\s+/g, ' ')

const url =
  'https://api.pokemontcg.io/v2/cards' +
  '?q=name:*' + encodeURIComponent(safeQuery) + '*' +
  '&orderBy=-set.releaseDate' +
  '&select=id,name,number,set,images,rarity,cardmarket,tcgplayer' +
  '&pageSize=80'

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

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
  rarity: card.rarity || '',

  cardmarketPrice: card.cardmarket?.prices?.trendPrice || null,

  tcgplayerPrice:
    card.tcgplayer?.prices?.holofoil?.market ||
    card.tcgplayer?.prices?.reverseHolofoil?.market ||
    card.tcgplayer?.prices?.normal?.market ||
    null,
}))

    return NextResponse.json(cards)
  } catch (error: any) {
    return new NextResponse(error?.message || 'Failed to search cards', { status: 500 })
  }
}
