import Link from 'next/link'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'

export default function HomePage() {
  return (
    <>
      <SiteHeader active="home" />

      <main className="home-main">
        <section className="site-container home-hero">
          <div className="hero-copy">
            <h1>Sell Your Pokémon Cards to Collectiverse</h1>

            <p>
              Get fast, fair offers on your Pokémon cards from a trusted UK buyer.
            </p>

            <div className="hero-actions">
              <Link href="/sell" className="primary-btn">
                Start Selling
              </Link>

              <Link href="/how-it-works" className="secondary-btn">
                How It Works
              </Link>
            </div>

            <p className="hero-trust">
              Trusted by 26,000+ collectors on Whatnot.
            </p>
          </div>

          <div className="hero-panel whatnot-panel">
            <img
              src="/whatnot-logo.png"
              alt="Whatnot"
              className="whatnot-logo"
            />

            <div className="premier-badge">
              ✓ VERIFIED WHATNOT PREMIER SHOP
            </div>

            <h2>Collectiverse_</h2>

            <div className="trust-stat">👥 <strong>26,000+ Followers</strong></div>
            <div className="trust-stat">⭐ <strong>4.9 Rating</strong></div>
            <div className="trust-stat">💬 <strong>3,700+ Reviews</strong></div>
            <div className="trust-stat">📦 <strong>50,000+ Items Sold</strong></div>

            <a
              href="https://www.whatnot.com/user/collectiverse_"
              target="_blank"
              rel="noopener noreferrer"
              className="whatnot-btn"
            >
              View Whatnot Profile
            </a>
          </div>
        </section>

        <section className="site-container process-section">
          <div className="process-card">
            <div className="process-icon">🔍</div>
            <h3>Search Cards</h3>
            <p>Find your cards using our Pokémon database.</p>
          </div>

          <div className="process-card">
            <div className="process-icon">🛒</div>
            <h3>Build Basket</h3>
            <p>Select quantity and condition before checkout.</p>
          </div>

          <div className="process-card">
            <div className="process-icon">📤</div>
            <h3>Submit Collection</h3>
            <p>Send us your card list and photos.</p>
          </div>

          <div className="process-card">
            <div className="process-icon">💷</div>
            <h3>Receive Offer</h3>
            <p>Accept or decline your offer with one click.</p>
          </div>
        </section>
      </main>
	  
	  <section id="how-it-works" className="site-container how-it-works-section">
  <h2>How It Works</h2>

  <div className="how-grid">
    <div>
      <span>1</span>
      <h3>Search Your Cards</h3>
      <p>Search Pokémon cards using our database.</p>
    </div>

    <div>
      <span>2</span>
      <h3>Build Your Basket</h3>
      <p>Add quantities and card conditions.</p>
    </div>

    <div>
      <span>3</span>
      <h3>Submit Collection</h3>
      <p>Send us your submission for review.</p>
    </div>

    <div>
      <span>4</span>
      <h3>Receive Offer</h3>
      <p>We manually review and send an offer.</p>
    </div>

    <div>
      <span>5</span>
      <h3>Send Your Cards</h3>
      <p>Only send cards once you're happy to accept.</p>
    </div>

    <div>
      <span>6</span>
      <h3>Get Paid</h3>
      <p>Payment is sent after verification.</p>
    </div>
  </div>
</section>

<section id="faq" className="site-container faq-section">
  <h2>FAQ</h2>

  <div className="faq-grid">
    <article>
      <h3>Do I need to send my cards before accepting?</h3>
      <p>No. You only send your cards after we review your submission and you accept our offer.</p>
    </article>

    <article>
      <h3>How are offers calculated?</h3>
      <p>Every submission is manually reviewed based on card, condition, demand and current resale value.</p>
    </article>

    <article>
      <h3>Do you buy Japanese or other language cards?</h3>
      <p>Yes. Use Request Other Card for Japanese, Korean, Chinese, Thai, Indonesian or anything missing from search.</p>
    </article>

    <article>
      <h3>What condition cards do you accept?</h3>
      <p>We accept Near Mint, Excellent, Good, Played and Damaged cards, but condition affects the final offer.</p>
    </article>

    <article>
      <h3>How quickly do I get paid?</h3>
      <p>Payment is sent after your cards arrive and have been checked against your accepted submission.</p>
    </article>

    <article>
      <h3>Can I decline an offer?</h3>
      <p>Yes. There is no obligation. You can accept or decline once your offer has been sent.</p>
    </article>
  </div>
</section>

<section id="contact" className="site-container contact-section">
  <h2>Contact Us</h2>

  <p className="contact-intro">
    Have a question about your collection or a submission? Get in touch and we'll be happy to help.
  </p>

  <div className="contact-grid">
    <div className="contact-card">
      <h3>📧 Email</h3>
      <p>collectiversetcg@gmail.com</p>
    </div>

    <div className="contact-card">
      <h3>🟡 Whatnot</h3>
      <p>@Collectiverse_</p>

      <a
        href="https://www.whatnot.com/user/collectiverse_"
        target="_blank"
        rel="noopener noreferrer"
        className="secondary-btn"
      >
        View Profile
      </a>
    </div>

    <div className="contact-card">
      <h3>⏱ Response Time</h3>
      <p>Most enquiries are answered within 24 hours.</p>
    </div>
  </div>
</section>

      <SiteFooter />
    </>
  )
}