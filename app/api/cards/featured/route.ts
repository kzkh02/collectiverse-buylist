import { NextResponse } from 'next/server'

const PAGE_SIZE = 36
const API_TOTAL_PAGES_ESTIMATE = 560

function mapCard(card: any) {
  return {
    id: card.id,
    source: 'pokemon-tcg-api',
    language: 'en',
    name: card.name,
    number: card.number || '',
    setName: card.set?.name || '',
    imageUrl: card.images?.small || card.images?.large || '',
    rarity: card.rarity || '',
  }
}

function getMixedApiPage(displayPage: number) {
  return ((displayPage * 37) % API_TOTAL_PAGES_ESTIMATE) + 1
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const displayPage = Math.max(1, Number(searchParams.get('page') || 1))
    const apiPage = getMixedApiPage(displayPage)

    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?page=${apiPage}&pageSize=${PAGE_SIZE}&select=id,name,number,set,images,rarity`,
      {
        headers: {
          Accept: 'application/json',
          ...(process.env.POKEMON_TCG_API_KEY
            ? { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY }
            : {}),
        },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      throw new Error('Pokémon TCG API failed.')
    }

    const json = await response.json()
    const cards = Array.isArray(json.data) ? json.data : []
    const totalCount = Number(json.totalCount || 0)

    return NextResponse.json({
      data: cards.map(mapCard),
      page: displayPage,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      showingFrom: (displayPage - 1) * PAGE_SIZE + 1,
      showingTo: Math.min(displayPage * PAGE_SIZE, totalCount),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Could not load featured cards.',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}