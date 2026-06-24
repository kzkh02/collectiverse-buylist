'use client'

import { useEffect, useMemo, useState } from 'react'
import { SiteFooter, SiteHeader } from '../../components/SiteChrome'
import {
  CardSet,
  RequestLanguage,
  SearchCard,
  getCardsFromSet,
  getSets,
  languageShort,
  requestLanguageOptions,
  searchCards,
} from '../../lib/cards'

type CartCard = {
  uid: string
  tcg_id: string
  source: string
  card_language: string
  card_name: string
  set_name: string
  card_number: string
  image_url: string
  quantity: number
  condition: string
  finish: string
  condition_note: string
}

type CheckoutPhoto = {
  front: File | null
  back: File | null
}

const conditions = ['Near Mint', 'Excellent', 'Good', 'Played', 'Damaged', 'Unsure']
const paymentMethods = ['Bank Transfer']
const SETS_PER_PAGE = 60


function makeUid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isManualCard(card: CartCard) {
  return card.source === 'request' || card.card_language !== 'en'
}

function getDisplayRarity(rarity?: string) {
  const value = (rarity || '').toLowerCase()

  if (value === 'common') return 'Common'
  if (value === 'uncommon') return 'Uncommon'
  if (value === 'rare') return 'Rare'
  if (value.includes('reverse')) return 'Reverse Holo'

  return rarity ? 'Holofoil' : ''
}

function toCartCard(card: SearchCard, quantity: number, condition: string): CartCard {
  return {
    uid: makeUid(),
    tcg_id: card.id,
    source: card.source,
    card_language: card.language,
    card_name: card.name,
    set_name: card.setName || '',
    card_number: card.number || '',
    image_url: card.imageUrl || '',
    quantity,
    condition,
    finish: (card as any).finish || (card as any).rarity || 'Normal',
    condition_note: '',
  }
}


function paymentDetailsPlaceholder() {
  return 'Account name:\nSort code:\nAccount number:'
}


async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject

    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()

    img.onload = () => resolve(img)
    img.onerror = reject

    img.src = dataUrl
  })

  const maxSize = 1400
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.72)
  )

  if (!blob) return file

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
  })
}

export default function SellPage() {
  const [mode, setMode] = useState<'search' | 'sets' | 'request'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCard[]>([])
  const [sets, setSets] = useState<CardSet[]>([])
  const [setSearch, setSetSearch] = useState('')
  const [setPage, setSetPage] = useState(1)
  const [selectedSetId, setSelectedSetId] = useState('')
  const [setCards, setSetCards] = useState<SearchCard[]>([])
  const [featuredPage, setFeaturedPage] = useState(1)
  const [featuredTotal, setFeaturedTotal] = useState(0)

  const [cart, setCart] = useState<CartCard[]>([])
  const [resultQty, setResultQty] = useState<Record<string, number>>({})
  const [resultCondition, setResultCondition] = useState<Record<string, string>>({})

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [paymentDetails, setPaymentDetails] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [photos, setPhotos] = useState<Record<string, CheckoutPhoto>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [basketOpen, setBasketOpen] = useState(false)

  const [message, setMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submittedId, setSubmittedId] = useState('')

  const [requestLanguage, setRequestLanguage] = useState<RequestLanguage>('ja')
  const [requestName, setRequestName] = useState('')
  const [requestSet, setRequestSet] = useState('')
  const [requestNumber, setRequestNumber] = useState('')
  const [requestCondition, setRequestCondition] = useState('Near Mint')
  const [requestQty, setRequestQty] = useState(1)

  const cartCount = cart.reduce((sum, card) => sum + card.quantity, 0)

  const canCheckout = useMemo(() => {
    if (!email.trim().includes('@') || password.length < 6 || password !== confirmPassword || !paymentDetails.trim() || cart.length === 0 || loading) return false

    return cart.every((card) => {
      if (!isManualCard(card)) return true
      const cardPhotos = photos[card.uid]
      return Boolean(cardPhotos?.front && cardPhotos?.back)
    })
  }, [email, password, confirmPassword, paymentDetails, cart, photos, loading])

  const filteredSets = sets.filter((set) => {
    const search = setSearch.toLowerCase().trim()
    if (!search) return true
    return `${set.name} ${set.series || ''}`.toLowerCase().includes(search)
  })

  const totalSetPages = Math.max(1, Math.ceil(filteredSets.length / SETS_PER_PAGE))

  const visibleSets = filteredSets.slice(
    (setPage - 1) * SETS_PER_PAGE,
    setPage * SETS_PER_PAGE
  )

  useEffect(() => {
    setSetPage(1)
  }, [setSearch])



  async function loadFeaturedCards(page = 1) {
    try {
      const response = await fetch(`/api/cards/featured?page=${page}`)
      const data = await response.json()

      setResults(data.data || [])
      setFeaturedPage(data.page || page)
      setFeaturedTotal(data.totalCount || 0)
    } catch {
      setMessage('Could not load featured cards.')
    }
  }

  useEffect(() => {
    loadFeaturedCards(1)
  }, [])

  useEffect(() => {
    async function loadSets() {
      if (mode !== 'sets' || sets.length > 0) return
      setMessage('Loading English sets...')
      const data = await getSets()
      setSets(data)
      setMessage('')
    }

    loadSets()
  }, [mode, sets.length])

  function resultKey(card: SearchCard) {
    return `${card.source}-${card.id}`
  }

  function getQty(card: SearchCard) {
    return resultQty[resultKey(card)] || 1
  }

  function getCondition(card: SearchCard) {
    return resultCondition[resultKey(card)] || 'Near Mint'
  }

  function setQtyForCard(card: SearchCard, quantity: number) {
    setResultQty((current) => ({
      ...current,
      [resultKey(card)]: Math.max(1, quantity),
    }))
  }

  async function runSearch() {
    if (query.trim().length < 2) {
      setMessage('Search for an English card name or number first.')
      return
    }

    try {
      setSearching(true)
      setMessage('')
      const cards = await searchCards(query)
      setResults(cards)
      if (cards.length === 0) setMessage('No English cards found. Use Request Other Card if needed.')
    } catch (error: any) {
      setMessage(error.message || 'Card search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function loadSetCards(setId: string) {
    const selected = sets.find((item) => item.id === setId)
    if (!selected) return

    setSelectedSetId(setId)
    setMessage('Loading cards from set...')
    try {
      const cards = await getCardsFromSet(selected)
      setSetCards(cards)
    } catch (error: any) {
      setMessage(error.message || 'Could not load cards from set.')
    } finally {
      setMessage('')
    }
  }

  function addEnglishCard(card: SearchCard) {
    const quantity = getQty(card)
    const condition = getCondition(card)
    const finish = (card as any).finish || (card as any).rarity || 'Normal'

    setCart((current) => {
      const existing = current.find(
        (item) =>
          item.tcg_id === card.id &&
          item.condition === condition &&
          item.finish === finish &&
          item.source !== 'request'
      )

      if (existing) {
        return current.map((item) =>
          item.uid === existing.uid ? { ...item, quantity: item.quantity + quantity } : item
        )
      }

      return [
        ...current,
        {
          ...toCartCard(card, quantity, condition),
          finish,
        },
      ]
    })

    setMessage(`${card.name} added to your basket.`)
    setBasketOpen(true)
  }

  function addRequestCard() {
    const nameValue = requestName.trim() || query.trim()

    if (!nameValue) {
      setMessage('Enter the card name first.')
      return
    }

    setCart((current) => [
      ...current,
      {
        uid: makeUid(),
        tcg_id: 'request',
        source: 'request',
        card_language: requestLanguage,
        card_name: nameValue,
        set_name: requestSet.trim(),
        card_number: requestNumber.trim(),
        image_url: '',
        quantity: requestQty,
        condition: requestCondition,
        finish: 'Normal',
        condition_note: '',
      },
    ])

    setRequestName('')
    setRequestSet('')
    setRequestNumber('')
    setRequestQty(1)
    setMessage('Request card added to your basket. Front and back photos will be required at checkout.')
    setBasketOpen(true)
  }

  function updateCartCard(uid: string, patch: Partial<CartCard>) {
    setCart((current) => current.map((card) => (card.uid === uid ? { ...card, ...patch } : card)))
  }

  function removeCartCard(uid: string) {
    setCart((current) => current.filter((card) => card.uid !== uid))
    setPhotos((current) => {
      const copy = { ...current }
      delete copy[uid]
      return copy
    })
  }

  function clearCart() {
    setCart([])
    setPhotos({})
    setCheckoutOpen(false)
  }

  async function updatePhoto(uid: string, side: 'front' | 'back', file: File | null) {
    if (!file) {
      setPhotos((current) => ({
        ...current,
        [uid]: {
          front: current[uid]?.front || null,
          back: current[uid]?.back || null,
          [side]: null,
        },
      }))
      return
    }

    try {
      setMessage('Optimising photo...')
      const optimisedFile = await compressImage(file)

      setPhotos((current) => ({
        ...current,
        [uid]: {
          front: current[uid]?.front || null,
          back: current[uid]?.back || null,
          [side]: optimisedFile,
        },
      }))
    } finally {
      setMessage('')
    }
  }

  async function submitCollection() {
    if (!email.trim().includes('@')) {
      setMessage('Enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (!paymentDetails.trim()) {
      setMessage('Enter your bank transfer details.')
      return
    }

    if (!canCheckout) {
      setMessage('Add your email, create a password, enter payment details and upload front/back photos for any requested non-English or missing cards.')
      return
    }

    setLoading(true)
    setMessage('Submitting your collection...')

    try {
      const payload = {
        customer_email: email.trim(),
        customer_password: password,
        customer_name: name.trim() || null,
        payment_method: paymentMethod,
        payment_details: paymentDetails.trim(),
        customer_message: customerMessage.trim() || null,
        cards: cart.map((card) => ({
          uid: card.uid,
          tcg_id: card.tcg_id,
          source: card.source,
          card_language: card.card_language,
          card_name: card.card_name,
          set_name: card.set_name,
          card_number: card.card_number,
          image_url: card.image_url,
          quantity: card.quantity,
          condition: card.condition,
          finish: card.finish,
          condition_note: card.condition_note,
        })),
      }

      const formData = new FormData()
      formData.append('payload', JSON.stringify(payload))

      cart.forEach((card) => {
        const cardPhotos = photos[card.uid]
        if (cardPhotos?.front) formData.append(`front_${card.uid}`, cardPhotos.front)
        if (cardPhotos?.back) formData.append(`back_${card.uid}`, cardPhotos.back)
      })

      const response = await fetch('/api/buy-submissions', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.details || data?.error || 'Could not create submission.')
      }

      setSubmittedId(data.id)
      setMessage('')
      clearCart()
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setName('')
      setPaymentDetails('')
      setCustomerMessage('')
      setResults([])
      setSetCards([])
      setQuery('')
    } catch (error: any) {
      setMessage(error.message || 'Could not create submission.')
    } finally {
      setLoading(false)
    }
  }


  function CardResults({ cards }: { cards: SearchCard[] }) {
    return (
      <div className="results-grid">
        {cards.map((card) => (
          <article className="buy-card" key={`${card.source}-${card.id}`}>
            <div className="buy-card-image">
              {(card as any).rarity && (
  <span className="finish-tag">
    {getDisplayRarity((card as any).rarity)}
  </span>
)}
              {card.imageUrl ? <img src={card.imageUrl} alt={card.name} /> : <span>No image</span>}
            </div>

            <div className="buy-card-body">
              <h3>{card.name}</h3>
              <p className="card-number-line">
                {card.number ? `${card.number} - ` : ''}
                {card.setName || 'Unknown set'}
              </p>
 <p className="muted-small">English Pokémon card</p>
              <select
                className="condition-select"
                value={getCondition(card)}
                onChange={(event) =>
                  setResultCondition((current) => ({
                    ...current,
                    [resultKey(card)]: event.target.value,
                  }))
                }
              >
                {conditions.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>


            </div>

            <div className="buy-card-actions">
              <div className="qty-mini">
                <button type="button" onClick={() => setQtyForCard(card, getQty(card) - 1)}>
                  -
                </button>
                <span>{getQty(card)}</span>
                <button type="button" onClick={() => setQtyForCard(card, getQty(card) + 1)}>
                  +
                </button>
              </div>

              <button className="add-card-btn" type="button" onClick={() => addEnglishCard(card)}>
                Add Card
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <>
      <SiteHeader active="sell" cartCount={cartCount} />

      <button
        type="button"
        className="mobile-basket-toggle"
        onClick={() => setBasketOpen(true)}
      >
        🛒 Basket {cartCount > 0 ? `(${cartCount})` : ''}
      </button>

      {basketOpen && (
        <button
          type="button"
          className="basket-overlay"
          aria-label="Close basket"
          onClick={() => setBasketOpen(false)}
        />
      )}

      <main className="sell-shell">
        <div className="sell-main">
          {submittedId ? (
            <section className="success-box">
              <h1>Submission received.</h1>
              <p>
                We&apos;ll review your cards and email you a manual offer. Reference: <b>{submittedId}</b>
              </p>
              <button className="primary-btn" onClick={() => setSubmittedId('')}>
                Submit More Cards
              </button>
            </section>
          ) : (
            <>
              <section className="sell-heading">
                <div>
                  <h1>Sell Cards</h1>
                  <p>Search English cards, choose condition, add to your basket, then checkout when ready.</p>
                </div>

                <button className="request-top-btn" onClick={() => setMode('request')}>
                  Request Other Card
                </button>
              </section>

              <section className="search-panel">
                <div className="search-bar">
                  <span>⌕</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runSearch()
                    }}
                    placeholder="Search English Pokémon cards..."
                  />
                  <button onClick={runSearch} disabled={searching}>
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="mode-row">
                  <button className={mode === 'search' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('search')}>
                    English Search
                  </button>
                  <button className={mode === 'sets' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('sets')}>
                    Browse English Sets
                  </button>
                  <button className={mode === 'request' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('request')}>
                    Request Other Card
                  </button>

                  {query.trim() && (
                    <div className="filter-chip">
                      Name: {query.trim()}
                      <button
                        onClick={() => {
                          setQuery('')
                          loadFeaturedCards(1)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {message && <div className="message-line">{message}</div>}
              {mode === 'search' && !query.trim() && results.length > 0 && (
                <p className="muted-small">
                  Popular cards collectors are currently selling to Collectiverse.
                </p>
              )}


              {mode === 'sets' && (
                <section className="utility-panel">
                  <input
                    className="input"
                    value={setSearch}
                    onChange={(event) => setSetSearch(event.target.value)}
                    placeholder="Search English set name..."
                  />

                  <div className="set-pagination">
                    <p>
                      Showing {filteredSets.length === 0 ? 0 : (setPage - 1) * SETS_PER_PAGE + 1}–
                      {Math.min(setPage * SETS_PER_PAGE, filteredSets.length)} of {filteredSets.length} English sets
                    </p>

                    <div>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={setPage <= 1}
                        onClick={() => setSetPage((page) => Math.max(1, page - 1))}
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={setPage >= totalSetPages}
                        onClick={() => setSetPage((page) => Math.min(totalSetPages, page + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="set-grid">
                    {visibleSets.map((set) => (
                      <button
                        key={set.id}
                        className={`set-card ${selectedSetId === set.id ? 'active' : ''}`}
                        onClick={() => loadSetCards(set.id)}
                      >
                        <strong>{set.name}</strong>
                        <span>
                          {set.series || 'English'} {set.releaseDate ? `• ${set.releaseDate}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {mode === 'request' && (
                <section className="utility-panel">
                  <h2>Request Other Card</h2>
                  <p className="muted">
                    Use this for Japanese, Korean, Chinese, Thai, Indonesian or anything missing from English search.
                    Front and back photos are required at checkout for requested cards.
                  </p>

                  <div className="form-grid">
                    <div>
                      <label className="label">Language</label>
                      <select
                        className="select"
                        value={requestLanguage}
                        onChange={(event) => setRequestLanguage(event.target.value as RequestLanguage)}
                      >
                        {requestLanguageOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Card Name</label>
                      <input
                        className="input"
                        value={requestName}
                        onChange={(event) => setRequestName(event.target.value)}
                        placeholder="Card name"
                      />
                    </div>

                    <div>
                      <label className="label">Set Name</label>
                      <input
                        className="input"
                        value={requestSet}
                        onChange={(event) => setRequestSet(event.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="label">Card Number</label>
                      <input
                        className="input"
                        value={requestNumber}
                        onChange={(event) => setRequestNumber(event.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="label">Condition</label>
                      <select className="select" value={requestCondition} onChange={(event) => setRequestCondition(event.target.value)}>
                        {conditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Quantity</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={requestQty}
                        onChange={(event) => setRequestQty(Math.max(1, Number(event.target.value || 1)))}
                      />
                    </div>
                  </div>

                  <button className="primary-btn full-width" onClick={addRequestCard}>
                    Add Request Card
                  </button>
                </section>
              )}
			  
			  {mode === 'search' && !query.trim() && results.length > 0 && (
  <div className="featured-pagination">
    <p>
      Showing {(featuredPage - 1) * 36 + 1}–
      {Math.min(featuredPage * 36, featuredTotal)} of{' '}
      {featuredTotal.toLocaleString()} English Pokémon cards
    </p>

    <div>
      <button
        className="secondary-btn"
        disabled={featuredPage <= 1}
        onClick={() => loadFeaturedCards(featuredPage - 1)}
      >
        Previous
      </button>

      <button
        className="secondary-btn"
        onClick={() => loadFeaturedCards(featuredPage + 1)}
      >
        Next
      </button>
    </div>
  </div>
)}

              {mode === 'sets' ? <CardResults cards={setCards} /> : <CardResults cards={results} />}
            </>
          )}
        </div>

        <aside className={`side-basket ${basketOpen ? 'basket-open' : ''}`}>
          <button
            type="button"
            className="basket-close"
            onClick={() => setBasketOpen(false)}
          >
            ×
          </button>

          <div className="basket-header">
            <div>
              <h2>Basket</h2>
              <p>{cartCount === 1 ? '1 card added' : `${cartCount} cards added`}</p>
            </div>
            {cart.length > 0 && (
              <button className="text-btn" onClick={clearCart}>
                Clear
              </button>
            )}
          </div>

          <div className="basket-items">
            {cart.length === 0 ? (
              <div className="empty-basket">
                <strong>Your basket is empty.</strong>
                <p>Add cards from the search results to start your submission.</p>
              </div>
            ) : (
              cart.map((card) => (
                <article className="basket-item" key={card.uid}>
                  <div className="basket-thumb">
                    {card.image_url ? <img src={card.image_url} alt={card.card_name} /> : <span>{languageShort(card.card_language)}</span>}
                  </div>

                  <div className="basket-info">
                    <strong>{card.card_name}</strong>
                    <span>
                      {card.card_number ? `${card.card_number} - ` : ''}
                      {card.set_name || 'Manual request'}
                    </span>
                    <span>{card.finish}</span>

                    <select
                      className="basket-select"
                      value={card.condition}
                      onChange={(event) => updateCartCard(card.uid, { condition: event.target.value })}
                    >
                      {conditions.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>

                    <div className="basket-controls">
                      <div className="qty-micro">
                        <button onClick={() => updateCartCard(card.uid, { quantity: Math.max(1, card.quantity - 1) })}>-</button>
                        <span>{card.quantity}</span>
                        <button onClick={() => updateCartCard(card.uid, { quantity: card.quantity + 1 })}>+</button>
                      </div>

                      <button className="remove-btn" onClick={() => removeCartCard(card.uid)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="checkout-box">
              {!checkoutOpen ? (
                <button className="primary-btn full-width" onClick={() => setCheckoutOpen(true)}>
                  Proceed to Checkout
                </button>
              ) : (
                <>
                  <h3>Checkout</h3>
                  <p className="muted-small">
                    Create a password so only you can view and respond to this submission later.
                  </p>

                  <div className="checkout-grid">
                    <div>
                      <label className="label">Your Name</label>
                      <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
                    </div>

                    <div>
                      <label className="label">Email Address</label>
                      <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                    </div>

                    <div>
                      <label className="label">Password</label>
                      <input
                        className="input"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Create a password"
                      />
                    </div>

                    <div>
                      <label className="label">Confirm Password</label>
                      <input
                        className="input"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm password"
                      />
                    </div>

                    <div>
                      <label className="label">Preferred Payment</label>
                      <select
                        className="select"
                        value={paymentMethod}
                        onChange={(event) => {
                          setPaymentMethod(event.target.value)
                          setPaymentDetails('')
                        }}
                      >
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Bank Details</label>
                      <textarea
                        className="textarea"
                        value={paymentDetails}
                        onChange={(event) => setPaymentDetails(event.target.value)}
                        placeholder={paymentDetailsPlaceholder()}
                      />
                    </div>

                    <div>
                      <label className="label">Message</label>
                      <textarea
                        className="textarea"
                        value={customerMessage}
                        onChange={(event) => setCustomerMessage(event.target.value)}
                        placeholder="Optional: anything we should know?"
                      />
                    </div>
                  </div>

                  <div className="photos-section">
                    <h4>Photos</h4>
                    <p>Optional for English search cards. Required for requested or non-English cards.</p>

                    {cart.map((card) => (
                      <div className="photo-card" key={card.uid}>
                        <strong>
                          {card.card_name}
                          {isManualCard(card) ? ' *' : ''}
                        </strong>

                        <label className="label">Front</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) => updatePhoto(card.uid, 'front', event.target.files?.[0] || null)}
                        />

                        <label className="label">Back</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) => updatePhoto(card.uid, 'back', event.target.files?.[0] || null)}
                        />
                      </div>
                    ))}
                  </div>

                  <button className="primary-btn full-width" disabled={!canCheckout} onClick={submitCollection}>
                    {loading ? 'Submitting...' : 'Submit Collection'}
                  </button>
                </>
              )}
            </div>
          )}
        </aside>
      </main>

      <SiteFooter />
    </>
  )
}
