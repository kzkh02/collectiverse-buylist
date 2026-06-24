import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type PokemonApiCard = {
  id: string
  name: string
  number?: string
  set?: {
    id?: string
    name?: string
    series?: string
  }
  images?: {
    small?: string
    large?: string
  }
  rarity?: string
  cardmarket?: {
    prices?: {
      trendPrice?: number
    }
  }
  tcgplayer?: {
    prices?: {
      holofoil?: { market?: number }
      reverseHolofoil?: { market?: number }
      normal?: { market?: number }
      '1stEditionHolofoil'?: { market?: number }
      '1stEditionNormal'?: { market?: number }
    }
  }
}

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
    numberParts[0]?.split(/[\/-]/)[0]?.replace(/^0+/, '')?.trim() || ''

  return {
    parts,
    nameParts,
    numberParts,
    firstCardNumber,
    compact: search.replace(/\s+/g, ''),
  }
}

function promoCodeQueries(search: string) {
  const compact = search.replace(/[\s\-\/]/g, '').toLowerCase()
  const match = compact.match(/^([a-z]{2,5})(\d{1,4})$/)

  if (!match) return []

  const prefix = match[1]
  const number = String(Number(match[2]))

  const possibleSetIds = unique([
    prefix,
    `${prefix}p`,
    prefix.replace(/p$/, ''),
  ])

  return possibleSetIds.flatMap((setId) => [
    `set.id:${setId} number:${number}`,
    `set.id:${setId} number:"${number}"`,
    `set.id:${setId} number:*${number}*`,
  ])
}

function buildQueries(search: string) {
  const { parts, nameParts, firstCardNumber, compact } = splitSearch(search)

  const nameSearch = nameParts.join(' ').trim()
  const nameWildcard = nameParts
    .map((part) => `name:*${part}*`)
    .join(' ')

  const setWildcard = parts
    .map((part) => `set.name:*${part}*`)
    .join(' ')

  const queries: string[] = []

  queries.push(...promoCodeQueries(search))

  // Example: "charizard 199/165" -> name:*charizard* number:199
  if (nameWildcard && firstCardNumber) {
    queries.push(`${nameWildcard} number:${firstCardNumber}`)
    queries.push(`${nameWildcard} number:"${firstCardNumber}"`)
    queries.push(`${nameWildcard} number:*${firstCardNumber}*`)
  }

  // Example: "scarlet violet promo charizard" -> set.name:*promo* name:*charizard*
  if (nameWildcard && setWildcard && /promo|promos|black|star|scarlet|violet|sword|shield|sun|moon|xy|mega/i.test(search)) {
    queries.push(`${nameWildcard} ${setWildcard}`)
  }

  // Example: "charizard" / "rampardos gl"
  if (nameSearch) {
    queries.push(`name:"${nameSearch}"`)
    queries.push(nameWildcard)
  }

  // Example: "mega evolution promos" / "scarlet violet promos"
  if (setWildcard) {
    queries.push(setWildcard)
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
    queries.push(`set.name:*${compact}*`)
  }

  // Fallback for mixed or unusual searches.
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
    pageSize: '120',
  })

  const response = await fetch(
    `https://api.pokemontcg.io/v2/cards?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        ...(process.env.POKEMON_TCG_API_KEY
          ? { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY }
          : {}),
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

function scoreCard(card: PokemonApiCard, search: string) {
  const normalisedSearch = search.toLowerCase()
  const { nameParts, firstCardNumber } = splitSearch(search)

  let score = 0

  const cardName = String(card.name || '').toLowerCase()
  const cardNumber = String(card.number || '').toLowerCase()
  const setName = String(card.set?.name || '').toLowerCase()
  const setId = String(card.set?.id || '').toLowerCase()

  for (const part of nameParts) {
    const lowered = part.toLowerCase()

    if (cardName.includes(lowered)) score += 25
    if (setName.includes(lowered)) score += 15
    if (setId.includes(lowered)) score += 15
  }

  if (firstCardNumber && cardNumber === firstCardNumber.toLowerCase()) {
    score += 60
  }

  if (cardName === normalisedSearch) {
    score += 100
  }

  if (/promo|promos|svp|swshp|smp|xyp|bwp|basep/i.test(search)) {
    if (setName.includes('promo') || setId.endsWith('p') || setId.includes('svp')) {
      score += 35
    }
  }

  return score
}

function mapCard(card: PokemonApiCard) {
  return {
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
      card.tcgplayer?.prices?.['1stEditionHolofoil']?.market ||
      card.tcgplayer?.prices?.['1stEditionNormal']?.market ||
      null,
  }
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
    const cards: PokemonApiCard[] = []

    for (const apiQuery of apiQueries) {
      const results = await fetchPokemonCards(apiQuery)

      for (const card of results) {
        if (!seen.has(card.id)) {
          seen.add(card.id)
          cards.push(card)
        }
      }

      if (cards.length >= 160) {
        break
      }
    }

    const sortedCards = cards
      .sort((a, b) => scoreCard(b, query) - scoreCard(a, query))
      .slice(0, 120)

    return NextResponse.json(sortedCards.map(mapCard))
  } catch (error: any) {
    console.error('Card search failed:', error)
    return NextResponse.json([])
  }
}
