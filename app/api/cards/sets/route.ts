import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type PokemonApiSet = {
  id: string
  name: string
  series?: string
  releaseDate?: string
  printedTotal?: number
  total?: number
}

function mapSet(set: PokemonApiSet) {
  return {
    id: set.id,
    name: set.name,
    series: set.series || '',
    releaseDate: set.releaseDate || '',
  }
}

function sortSets(a: PokemonApiSet, b: PokemonApiSet) {
  const aDate = a.releaseDate || ''
  const bDate = b.releaseDate || ''

  if (aDate !== bDate) {
    return bDate.localeCompare(aDate)
  }

  return a.name.localeCompare(b.name)
}

export async function GET() {
  try {
    const pageSize = 250
    let page = 1
    let totalCount = Infinity
    const allSets: PokemonApiSet[] = []

    while (allSets.length < totalCount) {
      const params = new URLSearchParams({
        orderBy: '-releaseDate',
        page: String(page),
        pageSize: String(pageSize),
      })

      const response = await fetch(
        `https://api.pokemontcg.io/v2/sets?${params.toString()}`,
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
        return new NextResponse(`Pokemon TCG API error: ${response.status}`, { status: 502 })
      }

      const json = await response.json()
      const sets = Array.isArray(json.data) ? json.data : []

      allSets.push(...sets)
      totalCount = Number(json.totalCount || allSets.length)

      if (sets.length === 0 || page > 20) {
        break
      }

      page += 1
    }

    const uniqueSets = Array.from(
      new Map(allSets.map((set) => [set.id, set])).values()
    ).sort(sortSets)

    return NextResponse.json(uniqueSets.map(mapSet))
  } catch (error: any) {
    return new NextResponse(error?.message || 'Failed to load sets', { status: 500 })
  }
}
