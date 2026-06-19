import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function cleanSearch(value: string) {
  return value
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-zA-Z0-9\s\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function buildQueries(search: string) {
  const cleaned = search.replace(/\//g, ' ').replace(/\s+/g, ' ').trim()

  const terms = unique(
    cleaned
      .split(' ')
      .map((term) => term.trim())
      .filter((term) => term.length > 0)
  )

  const compact = cleaned.replace(/\s+/g, '')
  const firstTerm = terms[0] || cleaned
  const isNumberSearch = /^[a-zA-Z0-9\-\/]+$/.test(search)

  const numberQueries = [
    `number:${search}`,
    `number:"${search}"`,
    `number:${cleaned}`,
    `number:"${cleaned}"`,
    `number:${firstTerm}`,
    `number:"${firstTerm}"`,
  ]

  if (/^\d+$/.test(firstTerm)) {
    numberQueries.push(`nationalPokedexNumbers:${firstTerm}`)
  }

  const nameQueries = [
    `name:"${cleaned}"`,
    terms.map((term) => `name:*${term}*`).join(' '),
  ]

  if (compact && compact !== cleaned) {
    numberQueries.push(`number:${compact}`)
    numberQueries.push(`number:"${compact}"`)
    nameQueries.push(`name:*${compact}*`)
  }

  return unique(
    isNumberSearch
      ? [...numberQueries, ...nameQueries]
      : [...nameQueries, ...numberQueries]
  ).filter(Boolean)
}

async function fetchPokemonCards(apiQuery: string) {
  const params = new URLSearchParams({
    q: apiQuery,
    orderBy: '-set.releaseDate',
    select: 'id,name,number,set,images,rarity,cardmarket,tcgplayer,nationalPokedexNumbers',
    pageSize: '80',
  })

  const response = await fetch(
    `https://api.pokemontcg.io/v2/cards?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    return []
  }

  const json = await response.json()

  return json.data || []
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q') || ''
  const query = cleanSearch(rawQuery)

  if (query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const apiQueries = buildQueries(query)
    const seen = new Set<string>()
    const cards: any[] = []

    for (const apiQuery of apiQueries) {
      const results = await fetchPokemonCards(apiQuery)

      for (const card of results) {
        if (!seen.has(card.id)) {
          seen.add(card.id)
          cards.push(card)
        }
      }

      if (cards.length >= 80) {
        break
      }
    }

    const mappedCards = cards.slice(0, 80).map((card: any) => ({
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

    return NextResponse.json(mappedCards)
  } catch (error: any) {
    console.error('Card search failed:', error)
    return NextResponse.json([])
  }
}
