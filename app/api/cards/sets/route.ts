import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await fetch(
      'https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250',
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

    const sets = (json.data || []).map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.series || '',
      releaseDate: set.releaseDate || '',
    }))

    return NextResponse.json(sets)
  } catch (error: any) {
    return new NextResponse(error?.message || 'Failed to load sets', { status: 500 })
  }
}
