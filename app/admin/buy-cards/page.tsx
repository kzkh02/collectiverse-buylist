'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SiteHeader, SiteFooter } from '../../../components/SiteChrome'

type SubmissionCard = {
  id: string
  submission_id: string
  tcg_id: string | null
  source: string | null
  card_language: string | null
  card_name: string
  set_name: string | null
  card_number: string | null
  image_url: string | null
  front_photo_url: string | null
  back_photo_url: string | null
  quantity: number
  condition: string | null
  condition_note: string | null
  review_status: string
  offer_amount: number | null
  rejection_reason: string | null
  created_at: string
}

type Submission = {
  id: string
  customer_email: string
  customer_name: string | null
  payment_method: string | null
  payment_details: string | null
  customer_message: string | null
  admin_notes: string | null
  status: string
  offer_total: number | null
  created_at: string
  updated_at: string
  buy_submission_cards: SubmissionCard[]
}

const statusOptions = [
  ['pending_review', 'Pending Review'],
  ['offer_sent', 'Offer Sent'],
  ['accepted', 'Accepted'],
  ['paid', 'Paid'],
  ['completed', 'Completed'],
  ['rejected', 'Rejected'],
  ['declined', 'Declined'],
]

const reviewOptions = [
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['request_photos', 'More Photos'],
]

function money(value: any) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(value || 0))
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function statusLabel(value: string) {
  return statusOptions.find(([id]) => id === value)?.[1] || value
}

function reviewLabel(value: string) {
  return reviewOptions.find(([id]) => id === value)?.[1] || value
}

export default function BuyCardsAdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('pending_review')

  const filteredSubmissions = submissions.filter(
  (submission) => submission.status === activeTab
)

const selectedSubmission =
  filteredSubmissions.find((item) => item.id === selectedId) ||
  filteredSubmissions[0] ||
  null
  const selectedCards = selectedSubmission?.buy_submission_cards || []

  const totals = useMemo(() => {
    return selectedCards.reduce(
      (sum, card) => {
        const quantity = Number(card.quantity || 1)
        sum.quantity += quantity

        if (card.review_status === 'accepted') {
          sum.accepted += quantity
          sum.offer += Number(card.offer_amount || 0)
        }

        if (card.review_status === 'rejected') sum.rejected += quantity
        if (card.review_status === 'request_photos') sum.morePhotos += quantity

        return sum
      },
      { quantity: 0, accepted: 0, rejected: 0, morePhotos: 0, offer: 0 }
    )
  }, [selectedCards])

  async function adminFetch(body?: any, method = 'GET') {
    const response = await fetch('/api/admin/buy-submissions', {
      method,
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.details || data?.error || 'Admin request failed.')
    }

    return data
  }

  async function loadData() {
    setLoading(true)
    setMessage('Loading submissions...')

    try {
      const data = await adminFetch()
      const rows = data.submissions || []
      setSubmissions(rows)

      if (!selectedId && rows[0]?.id) {
        setSelectedId(rows[0].id)
      }

      setMessage(rows.length ? '' : 'No submissions yet.')
    } catch (error: any) {
      setMessage(error.message || 'Could not load submissions.')
    } finally {
      setLoading(false)
    }
  }

 useEffect(() => {
  loadData()
}, [])

useEffect(() => {
  setSelectedId('')
}, [activeTab])

  async function updateCard(cardId: string, patch: Partial<SubmissionCard>) {
    try {
      await adminFetch({ action: 'update_card', cardId, patch }, 'PATCH')

      setSubmissions((current) =>
        current.map((submission) => ({
          ...submission,
          buy_submission_cards: submission.buy_submission_cards.map((card) =>
            card.id === cardId ? { ...card, ...patch } : card
          ),
        }))
      )
    } catch (error: any) {
      setMessage(error.message || 'Could not update card.')
    }
  }

  async function updateSubmission(patch: Partial<Submission>) {
    if (!selectedSubmission) return

    try {
      await adminFetch(
        {
          action: 'update_submission',
          submissionId: selectedSubmission.id,
          patch,
        },
        'PATCH'
      )

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === selectedSubmission.id ? { ...submission, ...patch } : submission
        )
      )
    } catch (error: any) {
      setMessage(error.message || 'Could not update submission.')
    }
  }

  async function deleteCard(cardId: string) {
    if (!confirm('Delete this card from the submission?')) return

    try {
      await adminFetch({ action: 'delete_card', cardId }, 'PATCH')

      setSubmissions((current) =>
        current.map((submission) => ({
          ...submission,
          buy_submission_cards: submission.buy_submission_cards.filter((card) => card.id !== cardId),
        }))
      )
    } catch (error: any) {
      setMessage(error.message || 'Could not delete card.')
    }
  }

  async function deleteSubmission() {
    if (!selectedSubmission) return
    if (!confirm('Delete this full submission?')) return

    try {
      await adminFetch(
        {
          action: 'delete_submission',
          submissionId: selectedSubmission.id,
        },
        'PATCH'
      )

      setSubmissions((current) => current.filter((submission) => submission.id !== selectedSubmission.id))
      setSelectedId('')
    } catch (error: any) {
      setMessage(error.message || 'Could not delete submission.')
    }
  }

  async function saveOfferTotalAndStatus(status = 'offer_sent') {
    if (!selectedSubmission) return

    const offerTotal = selectedCards.reduce((sum, card) => {
      if (card.review_status !== 'accepted') return sum
      return sum + Number(card.offer_amount || 0)
    }, 0)

    await updateSubmission({
      status,
      offer_total: offerTotal,
      updated_at: new Date().toISOString(),
    })

    setMessage(`Submission marked as ${statusLabel(status)}.`)
  }

  function submissionLink() {
    if (!selectedSubmission) return ''

    return `${window.location.origin}/submissions?email=${encodeURIComponent(
      selectedSubmission.customer_email
    )}&reference=${selectedSubmission.id}`
  }

  function generateEmail(status: string) {
    if (!selectedSubmission) return ''

    const name = selectedSubmission.customer_name
      ? ` ${selectedSubmission.customer_name}`
      : ''

    const total = money(selectedSubmission.offer_total || totals.offer)
    const link = submissionLink()

    switch (status) {
      case 'offer_sent':
        return [
          `Hi${name},`,
          '',
          'Thank you for submitting your Pokémon cards to Collectiverse.',
          '',
          "We've now completed our review and your offer is ready.",
          '',
          `Total Offer: ${total}`,
          '',
          'You can view your full offer breakdown, including individual card values, here:',
          '',
          link,
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          'From there you can:',
          '',
          '• Review your card-by-card offer',
          '• Accept your offer',
          '• Decline your offer',
          '• Track the status of your submission',
          '',
          "If you have any questions, simply reply to this email and we'll be happy to help.",
          '',
          'Thank you for choosing Collectiverse.',
          '',
          'Kind regards,',
          '',
          'Collectiverse',
        ].join('\n')

      case 'accepted':
        return [
          `Hi${name},`,
          '',
          'Thank you for accepting your Collectiverse offer.',
          '',
          'Your submission has now been marked as accepted and we are ready to receive your cards.',
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          'Please package your cards securely to prevent damage during transit.',
          '',
          'Send your cards to:',
          '',
          'Collectiverse LTD',
          '5 Rosina Way',
          'Penwithick',
          'PL26 8TS',
          '',
          'We strongly recommend using a tracked postal service.',
          '',
          'Once your cards arrive, we will verify them against your accepted submission and process payment as quickly as possible.',
          '',
          'You can continue to track your submission here:',
          '',
          link,
          '',
          'If you have any questions before sending your cards, simply reply to this email.',
          '',
          'Thank you,',
          '',
          'Collectiverse',
        ].join('\n')

      case 'paid':
        return [
          `Hi${name},`,
          '',
          'Good news — your cards have been verified and payment has now been sent.',
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          `Amount Paid: ${total}`,
          '',
          `Payment Method: ${selectedSubmission.payment_method || 'Not supplied'}`,
          '',
          'Thank you for selling your Pokémon cards to Collectiverse.',
          '',
          'We appreciate your support and look forward to helping with future collections.',
          '',
          'Kind regards,',
          '',
          'Collectiverse',
        ].join('\n')

      case 'completed':
        return [
          `Hi${name},`,
          '',
          'Your submission has now been completed.',
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          'Thank you for choosing Collectiverse.',
          '',
          'We appreciate your support and hope to work with you again in the future.',
          '',
          'Kind regards,',
          '',
          'Collectiverse',
        ].join('\n')

      case 'rejected':
        return [
          `Hi${name},`,
          '',
          'Thank you for submitting your Pokémon cards to Collectiverse.',
          '',
          'Unfortunately, after reviewing your submission, we are unable to make an offer at this time.',
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          "If you believe something has been missed, please reply to this email and we'll happily take another look.",
          '',
          'Kind regards,',
          '',
          'Collectiverse',
        ].join('\n')

      case 'declined':
        return [
          `Hi${name},`,
          '',
          'Your submission has been marked as declined and is now closed.',
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          'Thank you for considering Collectiverse. We hope to help with future collections.',
          '',
          'Kind regards,',
          '',
          'Collectiverse',
        ].join('\n')

      default:
        return [
          `Hi${name},`,
          '',
          'Thank you for submitting your Pokémon cards to Collectiverse.',
          '',
          'Your submission has been received and is currently being reviewed.',
          '',
          `Submission Reference: ${selectedSubmission.id}`,
          '',
          'We will be in touch as soon as our review is complete.',
          '',
          'You can track your submission here:',
          '',
          link,
          '',
          'Thank you,',
          '',
          'Collectiverse',
        ].join('\n')
    }
  }

  const emailStatus = selectedSubmission?.status || 'pending_review'

  const emailSubjectMap: Record<string, string> = {
    pending_review: 'Collectiverse Submission Received',
    offer_sent: 'Your Collectiverse Offer Is Ready',
    accepted: 'Offer Accepted - Shipping Instructions',
    paid: 'Payment Sent - Collectiverse',
    completed: 'Submission Completed - Collectiverse',
    rejected: 'Submission Review Complete',
    declined: 'Submission Closed',
  }

  const mailto = selectedSubmission
    ? `mailto:${selectedSubmission.customer_email}?subject=${encodeURIComponent(
        emailSubjectMap[emailStatus] || 'Collectiverse Submission Update'
      )}&body=${encodeURIComponent(generateEmail(emailStatus))}`
    : '#'


  return (
    <>
      <SiteHeader active="admin" />

      <main className="admin-main">
        <div className="site-container">
          <div className="admin-top">
            <div>
              <h1>Buylist Admin</h1>
              <p>Review submissions, price cards, send offers and update customer status.</p>
            </div>

            <div>
              <button className="secondary-btn" onClick={loadData} disabled={loading}>
                Refresh
              </button>
              <Link className="secondary-btn" href="/admin">
                Admin Home
              </Link>
            </div>
          </div>

          {message && <div className="message-line">{message}</div>}
		  
		  <div className="admin-tabs">
  {statusOptions.map(([status, label]) => {
    const count = submissions.filter(
      (submission) => submission.status === status
    ).length

    return (
      <button
        key={status}
        className={`admin-tab ${activeTab === status ? 'active' : ''}`}
        onClick={() => setActiveTab(status)}
      >
        {label}
        <span>{count}</span>
      </button>
    )
  })}
</div>

          <section className="admin-layout">
            <aside className="submissions">
              <h2>Submissions</h2>

             {filteredSubmissions.map((submission) => {
                const count = submission.buy_submission_cards?.length || 0

                return (
                  <button
                    key={submission.id}
                    className={`submission ${selectedSubmission?.id === submission.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(submission.id)}
                  >
                    <strong>{submission.customer_email}</strong>
                    <span>{shortId(submission.id)} · {count} card(s)</span>
                    <span>{statusLabel(submission.status)}</span>
                    <span>{new Date(submission.created_at).toLocaleString('en-GB')}</span>
                  </button>
                )
              })}
            </aside>

            <section className="review">
              {!selectedSubmission ? (
                <p>Select a submission.</p>
              ) : (
                <>
                  <div className="review-header">
                    <div>
                      <h2>{selectedSubmission.customer_email}</h2>
                      <p>
                        {selectedSubmission.customer_name || 'No name supplied'} · {selectedSubmission.payment_method || 'No payment method'} · Ref {selectedSubmission.id}
                      </p>
                      {selectedSubmission.customer_message && <p>Customer note: {selectedSubmission.customer_message}</p>}

                      <div className="admin-payment-details">
                        <strong>Payment Details</strong>
                        <p>
                          Method: {selectedSubmission.payment_method || 'No payment method'}
                        </p>
                        <pre>
                          {selectedSubmission.payment_details || 'No payment details supplied'}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <label className="label">Submission Status</label>
                      <select
                        className="select"
                        value={selectedSubmission.status}
                        onChange={(event) => updateSubmission({ status: event.target.value, updated_at: new Date().toISOString() })}
                      >
                        {statusOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="stats">
                    <div><span>Total Qty</span><b>{totals.quantity}</b></div>
                    <div><span>Accepted</span><b>{totals.accepted}</b></div>
                    <div><span>Rejected</span><b>{totals.rejected}</b></div>
                    <div><span>More Photos</span><b>{totals.morePhotos}</b></div>
                    <div><span>Offer Total</span><b>{money(totals.offer)}</b></div>
                  </div>

                  <div className="actions">
  <a
    className="primary-btn"
    href={mailto}
    onClick={() => {
      if (selectedSubmission?.status === 'pending_review') {
        saveOfferTotalAndStatus('offer_sent')
      }
    }}
  >
    Generate Email
  </a>

  <button
    className="secondary-btn"
    onClick={() => saveOfferTotalAndStatus('accepted')}
  >
    Customer Accepted
  </button>

  <button
    className="secondary-btn"
    onClick={() => saveOfferTotalAndStatus('paid')}
  >
    Paid
  </button>

  <button
    className="secondary-btn"
    onClick={() => saveOfferTotalAndStatus('completed')}
  >
    Complete
  </button>

  <button
    className="danger-btn"
    onClick={() => saveOfferTotalAndStatus('declined')}
  >
    Customer Declined
  </button>

  <button className="danger-btn" onClick={deleteSubmission}>
    Delete Submission
  </button>
</div>

                  <label className="label admin-notes-label">Admin Notes</label>
                  <textarea
                    className="textarea"
                    value={selectedSubmission.admin_notes || ''}
                    onChange={(event) => updateSubmission({ admin_notes: event.target.value })}
                    placeholder="Internal notes only"
                  />

                  <div className="cards">
                    {selectedCards.map((card) => (
                      <article className="review-card" key={card.id}>
                        <div className="review-img">
                          {card.image_url ? <img src={card.image_url} alt={card.card_name} /> : <span>Request</span>}
                        </div>

                        <div className="review-card-main">
                          <h3>{card.card_name}</h3>
                          <p>
                            {card.card_number ? `${card.card_number} - ` : ''}
                            {card.set_name || 'Manual request'}
                          </p>
                          <p>Qty: {card.quantity || 1} · Condition: {card.condition || 'Unknown'}</p>
                          {card.condition_note && <p>Condition note: {card.condition_note}</p>}

                          <div className="photo-links">
                            {card.front_photo_url ? <a className="secondary-btn" href={card.front_photo_url} target="_blank">Front Photo</a> : <span className="status">No front photo</span>}
                            {card.back_photo_url ? <a className="secondary-btn" href={card.back_photo_url} target="_blank">Back Photo</a> : <span className="status">No back photo</span>}
                          </div>

                          <span className={`status status-${card.review_status}`}>
                            {reviewLabel(card.review_status)}
                          </span>
                        </div>

                        <div className="review-actions">
                          <label className="label">Review Status</label>
                          <select
                            className="select"
                            value={card.review_status}
                            onChange={(event) => updateCard(card.id, { review_status: event.target.value })}
                          >
                            {reviewOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>

                          <label className="label">Offer Amount</label>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={card.offer_amount ?? ''}
                            onChange={(event) =>
                              updateCard(card.id, {
                                offer_amount: event.target.value === '' ? null : Number(event.target.value),
                              })
                            }
                          />

                         <button
  className="primary-btn"
  onClick={async () => {
    if (!card.offer_amount || card.offer_amount <= 0) {
      setMessage('Enter an offer amount first.')
      return
    }

    await updateCard(card.id, {
      review_status: 'accepted',
    })

    await saveOfferTotalAndStatus('offer_sent')

    setActiveTab('offer_sent')
    setMessage('Card accepted and offer sent.')
  }}
>
  Accept & Send Offer
</button>

                         <button
  className="secondary-btn"
  onClick={() =>
    updateCard(card.id, {
      review_status: 'request_photos',
    })
  }
>
  Request Photos
</button>

                          <label className="label">Reject Reason</label>
                          <textarea
                            className="textarea"
                            value={card.rejection_reason || ''}
                            onChange={(event) => updateCard(card.id, { rejection_reason: event.target.value })}
                            placeholder="Optional"
                          />

                         <button
  className="danger-btn"
  onClick={async () => {
    await updateCard(card.id, {
      review_status: 'rejected',
      offer_amount: 0,
    })

    const otherCards = selectedCards.filter(
      (item) => item.id !== card.id
    )

    const allRejected = otherCards.every(
      (item) => item.review_status === 'rejected'
    )

    if (allRejected) {
      await saveOfferTotalAndStatus('rejected')
      setActiveTab('rejected')
    }

    setMessage('Card rejected.')
  }}
>
  Reject
</button>

                          <button className="danger-btn" onClick={() => deleteCard(card.id)}>
                            Delete Card
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
