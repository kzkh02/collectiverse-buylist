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

function splitSearch(search: string) {
  const parts = search
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const numberParts = parts.filter((part) =>
    /^\d+[a-zA-Z]?([\/-]\d+[a-zA-Z]?)?$/.test(part)
  )

  const nameParts = parts.filter(
    (part) =>
      !/^\d+[a-zA-Z]?([\/-]\d+[a-zA-Z]?)?$/.test(part)
  )

  const firstCardNumber =
    numberParts[0]?.split(/[\/-]/)[0]?.trim() || ''

  return {
    parts,
    nameParts,
    numberParts,
    firstCardNumber,
    compact: search.replace(/\s+/g, ''),
  }
}

function buildQueries(search: string) {
  const { parts, nameParts, firstCardNumber, compact } = splitSearch(search)

  const nameSearch = nameParts.join(' ').trim()
  const nameWildcard = nameParts
    .map((part) => `name:*${part}*`)
    .join(' ')

  const queries: string[] = []

  // Example: "charizard 199/165" -> name:*charizard* number:199
  if (nameWildcard && firstCardNumber) {
    queries.push(`${nameWildcard} number:${firstCardNumber}`)
    queries.push(`${nameWildcard} number:"${firstCardNumber}"`)
  }

  // Example: "charizard" / "rampardos gl"
  if (nameSearch) {
    queries.push(`name:"${nameSearch}"`)
    queries.push(nameWildcard)
  }

  // Example: "199", "199/165", "TG01", "GG44", "SVP001"
  if (firstCardNumber) {
    queries.push(`number:${firstCardNumber}`)
    queries.push(`number:"${firstCardNumber}"`)
    queries.push(`number:*${firstCardNumber}*`)
  }

  if (compact && compact !== search) {
    queries.push(`number:${compact}`)
    queries.push(`number:*${compact}*`)
    queries.push(`name:*${compact}*`)
  }

  // Fallback for mixed or unusual searches
  if (parts.length > 0) {
    queries.push(parts.map((part) => `name:*${part}*`).join(' '))
  }

  return unique(queries.filter(Boolean))
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

function scoreCard(card: any, search: string) {
  const normalisedSearch = search.toLowerCase()
  const { nameParts, firstCardNumber } = splitSearch(search)

  let score = 0

  const cardName = String(card.name || '').toLowerCase()
  const cardNumber = String(card.number || '').toLowerCase()

  for (const part of nameParts) {
    if (cardName.includes(part.toLowerCase())) {
      score += 20
    }
  }

  if (firstCardNumber && cardNumber === firstCardNumber.toLowerCase()) {
    score += 50
  }

  if (cardName === normalisedSearch) {
    score += 100
  }

  return score
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

      if (cards.length >= 120) {
        break
      }
    }

    const sortedCards = cards
      .sort((a, b) => scoreCard(b, query) - scoreCard(a, query))
      .slice(0, 80)

    const mappedCards = sortedCards.map((card: any) => ({
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
