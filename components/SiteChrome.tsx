import Link from 'next/link'

type SiteHeaderProps = {
  active?: 'home' | 'sell' | 'how' | 'faq' | 'contact' | 'admin'
  cartCount?: number
}

export function SiteHeader({ active = 'home', cartCount = 0 }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-container site-nav">
        <Link href="/" className="site-logo-link" aria-label="Collectiverse home">
          <img src="/logo.png" alt="Collectiverse" className="site-logo" />
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <Link className={`nav-link ${active === 'home' ? 'active' : ''}`} href="/">
            Home
          </Link>
          <Link className={`nav-link ${active === 'sell' ? 'active' : ''}`} href="/sell">
            Sell Cards
          </Link>
          <Link className={`nav-link ${active === 'how' ? 'active' : ''}`} href="/#how-it-works">
            How It Works
          </Link>
          <Link className={`nav-link ${active === 'faq' ? 'active' : ''}`} href="/#faq">
            FAQ
          </Link>
          <Link className={`nav-link ${active === 'contact' ? 'active' : ''}`} href="/#contact">
            Contact
          </Link>
        </nav>

        <div className="header-actions">
          <Link href="/sell" className="cart-wrap" aria-label="Basket">
            🛒
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>

          <Link href="/submissions" className="outline-btn">
            My Submissions
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="site-container footer-grid">
        <div className="footer-item">
          <div className="footer-icon">🔒</div>
          <div>
            <div className="footer-title">Safe & Secure</div>
            <div className="footer-text">You only ship after accepting our offer.</div>
          </div>
        </div>

        <div className="footer-item">
          <div className="footer-icon">⚡</div>
          <div>
            <div className="footer-title">Fast Payments</div>
            <div className="footer-text">Paid after cards are received and verified.</div>
          </div>
        </div>

        <div className="footer-item">
          <div className="footer-icon">⭐</div>
          <div>
            <div className="footer-title">Fair Offers</div>
            <div className="footer-text">Every submission is manually reviewed.</div>
          </div>
        </div>

        <div className="footer-item">
          <div className="footer-icon">💬</div>
          <div>
            <div className="footer-title">Support</div>
            <div className="footer-text">Questions answered before you post anything.</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
