'use client'

import { useState } from 'react'
import { SiteFooter, SiteHeader } from '../../components/SiteChrome'

type SubmissionCard = {
  card_name: string
  set_name: string | null
  card_number: string | null
  quantity: number
  condition: string | null
  review_status: string
  offer_amount: number | null
}

type SubmissionResult = {
  id: string
  customer_email: string
  customer_name: string | null
  status: string
  offer_total: number | null
  created_at: string
  admin_notes?: string | null
  buy_submission_cards?: SubmissionCard[]
}

const statusLabels: Record<string, string> = {
  pending_review: 'Pending Review',
  offer_sent: 'Offer Ready',
  accepted: 'Offer Accepted',
  paid: 'Paid',
  completed: 'Completed',
  rejected: 'Rejected',
  declined: 'Offer Declined',
}

const statusMessages: Record<string, string> = {
  pending_review: 'We have received your submission and are currently reviewing your cards.',
  offer_sent: 'Your offer is ready. Review the breakdown below, then accept or decline your offer.',
  accepted: 'Thank you. Your offer has been accepted. We will confirm the next steps for safely sending your cards.',
  paid: 'Your payment has been sent successfully.',
  completed: 'This submission has been completed.',
  rejected: 'Unfortunately we are unable to make an offer for this submission.',
  declined: 'This submission has been closed because the offer was not accepted.',
}

const progressSteps = [
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'offer_sent', label: 'Offer Ready' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'paid', label: 'Paid' },
  { key: 'completed', label: 'Completed' },
]

function money(value: any) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(value || 0))
}

function bannerClass(status: string) {
  if (status === 'paid' || status === 'completed') return 'status-banner-green'
  if (status === 'offer_sent' || status === 'accepted') return 'status-banner-amber'
  if (status === 'rejected' || status === 'declined') return 'status-banner-red'
  return 'status-banner-blue'
}

function progressIndex(status: string) {
  if (status === 'completed') return 4
  if (status === 'paid') return 3
  if (status === 'accepted') return 2
  if (status === 'offer_sent') return 1
  return 0
}

function nextStepText(status: string) {
  if (status === 'pending_review') return 'We are reviewing your cards. Your offer will appear here once it is ready.'
  if (status === 'offer_sent') return 'Review your offer breakdown and choose Accept Offer or Decline Offer.'
  if (status === 'accepted') return 'Your offer has been accepted. We will confirm how to send your cards safely.'
  if (status === 'paid') return 'Your payment has been sent. This submission will be marked completed after final checks.'
  if (status === 'completed') return 'This submission is complete. Thank you for selling to Collectiverse.'
  if (status === 'declined') return 'This offer has been declined and the submission is now closed.'
  if (status === 'rejected') return 'This submission has been reviewed and we are unable to make an offer.'
  return 'Check your status above for the latest update.'
}

export default function SubmissionsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reference, setReference] = useState('')
  const [submissions, setSubmissions] = useState<SubmissionResult[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [respondingId, setRespondingId] = useState('')

  async function searchSubmissions() {
    if (!email.trim() || !password.trim()) {
      setMessage('Enter your email and password.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const params = new URLSearchParams()
      params.set('email', email.trim())
      params.set('password', password)
      if (reference.trim()) params.set('reference', reference.trim())

      const response = await fetch(`/api/customer-submissions?${params.toString()}`)
      const data = await response.json()

      setSubmissions(data.submissions || [])

      if (!data.submissions?.length) {
        setMessage('No submissions found. Check the email, password and reference exactly as submitted.')
      }
    } catch {
      setMessage('Could not fetch submissions.')
    } finally {
      setLoading(false)
    }
  }

  async function respondToOffer(
    submission: SubmissionResult,
    decision: 'accepted' | 'declined'
  ) {
    setRespondingId(submission.id)
    setMessage('')

    try {
      const response = await fetch('/api/customer-submissions/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          email: submission.customer_email,
          password,
          decision,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Could not update your offer response.')
      }

      setSubmissions((current) =>
        current.map((item) =>
          item.id === submission.id ? { ...item, status: decision } : item
        )
      )

      setMessage(
        decision === 'accepted'
          ? 'Offer accepted. We will confirm the next steps.'
          : 'Offer declined. Your submission has been closed.'
      )
    } catch (error: any) {
      setMessage(error?.message || 'Could not update your offer response.')
    } finally {
      setRespondingId('')
    }
  }

  return (
    <>
      <SiteHeader active="sell" />

      <main className="status-page">
        <section className="site-container status-panel">
          <h1>Track Submission</h1>

          <p>
            Enter your email address and password to securely check your
            submission status.
          </p>

          <div className="status-search">
            <div>
              <label className="label">Email Address</label>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>

            <div>
              <label className="label">Submission Reference</label>
              <input
                className="input"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <button
              className="primary-btn"
              onClick={searchSubmissions}
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </div>

          {message && <div className="message-line">{message}</div>}

          <div className="submission-results">
            {submissions.map((submission) => {
              const currentProgress = progressIndex(submission.status)
              const cards = submission.buy_submission_cards || []
              const offeredCards = cards.filter(
                (card) =>
                  card.review_status === 'accepted' ||
                  Number(card.offer_amount || 0) > 0
              )

              return (
                <article key={submission.id} className="customer-submission-card">
                  <div className={`customer-status-banner ${bannerClass(submission.status)}`}>
                    <span className="customer-status-kicker">
                      Submission {submission.id}
                    </span>

                    <h2>{statusLabels[submission.status] || submission.status}</h2>
                    <p>{statusMessages[submission.status]}</p>
                  </div>

                  <div className="customer-progress-wrap">
                    <div className="customer-progress">
                      {progressSteps.map((step, index) => (
                        <div
                          key={step.key}
                          className={`customer-progress-step ${
                            index <= currentProgress ? 'active' : ''
                          }`}
                        >
                          <span>{index + 1}</span>
                          <strong>{step.label}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="customer-meta">
                    <div>
                      <span>Reference</span>
                      <strong>{submission.id}</strong>
                    </div>

                    <div>
                      <span>Submitted</span>
                      <strong>{new Date(submission.created_at).toLocaleString('en-GB')}</strong>
                    </div>

                    <div>
                      <span>Current Offer</span>
                      <strong>{money(submission.offer_total)}</strong>
                    </div>
                  </div>

                  {(submission.status === 'offer_sent' || submission.status === 'accepted') && (
                    <div className="customer-offer-actions">
                      <div>
                        <span>Total Offer</span>
                        <strong>{money(submission.offer_total)}</strong>
                      </div>

                      {submission.status === 'offer_sent' && (
                        <div className="customer-offer-buttons">
                          <button
                            className="primary-btn"
                            disabled={respondingId === submission.id}
                            onClick={() => respondToOffer(submission, 'accepted')}
                          >
                            {respondingId === submission.id ? 'Updating...' : 'Accept Offer'}
                          </button>

                          <button
                            className="danger-btn"
                            disabled={respondingId === submission.id}
                            onClick={() => respondToOffer(submission, 'declined')}
                          >
                            Decline Offer
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="customer-next-step">
                    <span>Next Step</span>
                    <p>{nextStepText(submission.status)}</p>
                  </div>

                  {submission.admin_notes && (
                    <div className="customer-note">
                      <h3>Message from Collectiverse</h3>
                      <p>{submission.admin_notes}</p>
                    </div>
                  )}

                  {cards.length > 0 && (
                    <div className="customer-breakdown">
                      <div className="customer-breakdown-header">
                        <h3>{offeredCards.length > 0 ? 'Offer Breakdown' : 'Submitted Cards'}</h3>
                        <span>{cards.length} card line(s)</span>
                      </div>

                      <div className="status-card-list">
                        {cards.map((card, index) => (
                          <div key={index} className="customer-card-row">
                            <div>
                              <strong>Card {index + 1} — {card.card_name}</strong>

                              <span>
                                {card.card_number ? `${card.card_number} - ` : ''}
                                {card.set_name || 'Manual request'}
                                {' • Qty '}
                                {card.quantity}
                                {' • '}
                                {card.condition || 'Unknown'}
                              </span>
                            </div>

                            <strong className="customer-card-offer">
                              {Number(card.offer_amount || 0) > 0
                                ? money(card.offer_amount)
                                : 'Pending'}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
