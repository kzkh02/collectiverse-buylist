export type CardLanguage = 'en' | 'request'
export type CardFinish = 'Normal' | 'Reverse Holo' | string

export type RequestLanguage =
  | 'ja'
  | 'ko'
  | 'zh-cn'
  | 'zh-tw'
  | 'thai'
  | 'indonesian'
  | 'other'

export type CardSet = {
  id: string
  name: string
  series?: string
  releaseDate?: string
}

export type SearchCard = {
  id: string
  source: string
  language: CardLanguage | RequestLanguage
  name: string
  setName: string
  number: string
  imageUrl: string
  rarity?: string
  finish?: CardFinish
  baseCardId?: string
  cardmarketPrice?: number | null
  tcgplayerPrice?: number | null
  buyPrice?: number | null
}

export const requestLanguageOptions = [
  { id: 'ja', label: 'Japanese', short: 'JP' },
  { id: 'ko', label: 'Korean', short: 'KR' },
  { id: 'zh-cn', label: 'Simplified Chinese', short: 'CN' },
  { id: 'zh-tw', label: 'Traditional Chinese', short: 'TW' },
  { id: 'thai', label: 'Thai', short: 'TH' },
  { id: 'indonesian', label: 'Indonesian', short: 'ID' },
  { id: 'other', label: 'Other', short: 'OTHER' },
] as const

export function languageShort(language?: string) {
  if (language === 'en') return 'EN'
  return requestLanguageOptions.find((item) => item.id === language)?.short || 'REQ'
}

function normaliseFinish(card: SearchCard): SearchCard {
  return {
    ...card,
    baseCardId: card.baseCardId || card.id,
    finish: card.finish || card.rarity || 'Normal',
  }
}

function canHaveReverseHolo(card: SearchCard) {
  const rarity = (card.rarity || '').toLowerCase()

  return (
    rarity === 'common' ||
    rarity === 'uncommon' ||
    rarity === 'rare'
  )
}

function expandReverseHolos(cards: SearchCard[]) {
  return cards.flatMap((rawCard) => {
    const card = normaliseFinish(rawCard)

    if (!canHaveReverseHolo(card)) {
      return [card]
    }

    return [
      {
        ...card,
        id: `${card.id}-normal`,
        baseCardId: card.baseCardId || card.id,
        finish: card.rarity || 'Normal',
      },
      {
        ...card,
        id: `${card.id}-reverse`,
        baseCardId: card.baseCardId || card.id,
        rarity: 'Reverse Holo',
        finish: 'Reverse Holo',
      },
    ]
  })
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed: ${response.status}`)
  }

  return response.json()
}

export async function searchCards(query: string): Promise<SearchCard[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const cards = await fetchJson<SearchCard[]>(`/api/cards/search?q=${encodeURIComponent(trimmed)}`)
  return expandReverseHolos(cards)
}

export async function getSets(): Promise<CardSet[]> {
  return fetchJson<CardSet[]>('/api/cards/sets')
}

export async function getCardsFromSet(set: CardSet): Promise<SearchCard[]> {
  const cards = await fetchJson<SearchCard[]>(`/api/cards/set/${encodeURIComponent(set.id)}`)
  return expandReverseHolos(cards)
}
