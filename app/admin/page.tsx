'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SiteHeader, SiteFooter } from '../../components/SiteChrome'

const ADMIN_PASSWORD = 'trinkoXx123!'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')

  function login() {
    if (password === ADMIN_PASSWORD) {
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect password.')
    }
  }

  if (!unlocked) {
    return (
      <>
        <SiteHeader active="admin" />

        <main className="admin-login">
          <div className="login-card">
            <img src="/logo.png" alt="Collectiverse" />
            <h1>Admin Login</h1>

            <input
              className="input"
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') login()
              }}
            />

            {error && <div className="message-line">{error}</div>}

            <button className="primary-btn full-width" onClick={login}>
              Login
            </button>
          </div>
        </main>

        <SiteFooter />
      </>
    )
  }

  return (
    <>
      <SiteHeader active="admin" />

      <main className="admin-main">
        <div className="site-container">
          <h1>Admin</h1>

          <div className="admin-home-grid">
            <Link href="/admin/buy-cards" className="admin-card">
              <h2>Buy Cards</h2>
              <p>Review customer submissions, accept/reject cards, request photos and prepare offers.</p>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
