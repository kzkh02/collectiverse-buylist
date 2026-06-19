export type CardLanguage = 'en' | 'ja' | 'ko' | 'zh-cn' | 'zh-tw'

export type TcgDexCard = {
  id: string
  name: string
  image?: string
  localId?: string
  set?: {
    name?: string
    id?: string
  }
  language?: CardLanguage
}

export const cardLanguages: { id: CardLanguage; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ja', label: 'Japanese', short: 'JP' },
  { id: 'ko', label: 'Korean', short: 'KR' },
  { id: 'zh-cn', label: 'Simplified Chinese', short: 'CN' },
  { id: 'zh-tw', label: 'Traditional Chinese', short: 'TW' },
]

const BASE_URL = process.env.NEXT_PUBLIC_TCGDEX_BASE_URL || 'https://api.tcgdex.net/v2'

function endpointFor(language: CardLanguage) {
  return `${BASE_URL}/${language}`
}

export async function searchCards(query: string, language: CardLanguage): Promise<TcgDexCard[]> {
  const trimmed = query.trim()

  if (trimmed.length < 2) return []

  const response = await fetch(
    `${endpointFor(language)}/cards?name=${encodeURIComponent(trimmed)}`
  )

  if (!response.ok) {
    throw new Error(`Card search failed for ${language}`)
  }

  const data = await response.json()

  return (data || []).slice(0, 24).map((card: TcgDexCard) => ({
    ...card,
    language,
  }))
}

export async function searchCardsAcrossLanguages(
  query: string,
  languages: CardLanguage[]
): Promise<TcgDexCard[]> {
  const results = await Promise.allSettled(
    languages.map((language) => searchCards(query, language))
  )

  return results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .slice(0, 40)
}

export function getCardImage(card: TcgDexCard) {
  if (!card.image) return ''
  return `${card.image}/high.webp`
}

export function languageLabel(language?: string) {
  return cardLanguages.find((item) => item.id === language)?.label || 'English'
}

export function languageShort(language?: string) {
  return cardLanguages.find((item) => item.id === language)?.short || 'EN'
}
