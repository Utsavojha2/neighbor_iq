import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import { HeroMapSvg } from '../components/HeroMapSvg'
import { MapLoadingScreen } from '../components/MapLoadingScreen'
import { ResultsScreen } from '../components/ResultsScreen'
import { buildFakeReport } from '../lib/fakeRatings'
import { NavAuthWidgets } from '../components/NavAuthWidgets'
import { useSubscription } from '../context/SubscriptionContext'

/** Single audience: international students searching for housing in the US. */
const INTERNATIONAL_STUDENT_PROFILE_ID = 'international_student'
const INTERNATIONAL_STUDENT_PROFILE_LABEL = 'International student'

const reportCats = [
  { emoji: '🔒', name: 'Crime safety', api: 'CrimeGrade · SpotCrime' },
  { emoji: '🛒', name: 'Amenities', api: 'Google Places' },
  { emoji: '⚡', name: 'Disaster risk', api: 'FEMA NRI' },
  { emoji: '🚇', name: 'Transit', api: 'Walk Score' },
  { emoji: '💰', name: 'Cost', api: 'RentCast' },
  { emoji: '🌙', name: 'Nightlife', api: 'Yelp Fusion' },
  { emoji: '💬', name: 'Community', api: 'Claude · Reddit' },
]

const LOADING_MS = 2800

function MainPage() {
  const {
    isPaid,
    cancelSubscription,
    stripeCheckoutEnabled,
    stripeCustomerId,
    openBillingPortal,
  } = useSubscription()
  const [address, setAddress] = useState('')
  const [phase, setPhase] = useState('browse')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [localFeed, setLocalFeed] = useState(null)

  const canSubmit = address.trim().length > 3
  const profileLabel = INTERNATIONAL_STUDENT_PROFILE_LABEL


  useEffect(() => {
    if (phase !== 'loading') return undefined
    const t = window.setTimeout(() => {
      setPhase('results')
    }, LOADING_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'loading') return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'results') {
      window.scrollTo(0, 0)
    }
  }, [phase])

  const handleHeroAnalyze = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setAnalysisResult(buildFakeReport(address.trim(), INTERNATIONAL_STUDENT_PROFILE_ID))
    setLocalFeed({ loading: true })
    setPhase('loading')
    const q = encodeURIComponent(address.trim())
    fetch(`/api/local-feed?address=${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('feed'))))
      .then((data) => setLocalFeed({ loading: false, ...data }))
      .catch(() =>
        setLocalFeed({
          loading: false,
          ok: false,
          error: 'network',
          news: [],
          crimes: [],
          geo: null,
        }),
      )
  }

  const handleBackFromResults = () => {
    setLocalFeed(null)
    setPhase('browse')
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }

  if (phase === 'results') {
    const snapshot =
      analysisResult ?? buildFakeReport(address.trim(), INTERNATIONAL_STUDENT_PROFILE_ID)
    /** Local news first, then crime → amenities → transit → cost → community → disaster → nightlife */
    const RESULT_LAYOUT = [
      { kind: 'news' },
      { kind: 'crimes' },
      { kind: 'score', catIndex: 0 },
      { kind: 'score', catIndex: 1 },
      { kind: 'score', catIndex: 3 },
      { kind: 'score', catIndex: 4 },
      { kind: 'score', catIndex: 6 },
      { kind: 'score', catIndex: 2 },
      { kind: 'score', catIndex: 5 },
    ]
    const resultRows = RESULT_LAYOUT.map((slot) => {
      if (slot.kind === 'news') return { kind: 'news', id: 'results-news-slot' }
      if (slot.kind === 'crimes') return { kind: 'crimes', id: 'results-crimes-slot' }
      const c = reportCats[slot.catIndex]
      const i = slot.catIndex
      return {
        kind: 'score',
        emoji: c.emoji,
        name: c.name,
        api: c.api,
        earned: Boolean(snapshot.earned[i]),
        score: snapshot.scores[i],
      }
    })
    return (
      <ResultsScreen
        onBack={handleBackFromResults}
        address={address}
        profileLabel={profileLabel}
        overallScore={snapshot.overallScore}
        pointsEarned={snapshot.pointsEarned}
        rows={resultRows}
        vibeText={snapshot.vibeText}
        communityVibe={snapshot.communityVibe}
        localFeed={localFeed}
      />
    )
  }

  return (
    <>
      <nav>
        <a href="#hero" className="nav-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="nav-logo-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3.5" stroke="#fff" strokeWidth="1.5" />
              <path d="M8 9.5v5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="nav-logo-text">
            neighbor<span>IQ</span>
          </div>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#scores">Scores</a>
          <a href="#sentiment">Community</a>
          <a href="#profiles">For students</a>
        </div>
        <div className="nav-cta-group">
          <NavAuthWidgets />
          {isPaid ? (
            <>
              <span
                className="nav-pro-pill"
                title={
                  stripeCustomerId
                    ? 'NeighborIQ Pro (billing). Separate from Google: Log out only signs you out of Google; use Manage for Stripe or to remove Pro on this device.'
                    : 'Pro on this browser. Log out (Google) does not cancel Pro — use Manage to clear Pro here.'
                }
              >
                Pro
              </span>
              <button
                type="button"
                className="nav-text-btn"
                onClick={() => {
                  void (async () => {
                    if (stripeCheckoutEnabled && stripeCustomerId) {
                      const ok = await openBillingPortal()
                      if (ok) return
                    }
                    if (
                      window.confirm(
                        stripeCustomerId
                          ? 'Could not open the billing portal. Remove Pro access on this device only? You can subscribe again later.'
                          : 'Remove Pro access on this device? You will need to subscribe again to download PDFs.',
                      )
                    ) {
                      cancelSubscription()
                    }
                  })()
                }}
              >
                Manage
              </button>
            </>
          ) : (
            <>
              <Link to="/subscribe" className="nav-cta nav-cta-secondary">
                Upgrade
              </Link>
              <a href="#hero" className="nav-cta">
                Try free
              </a>
            </>
          )}
        </div>
      </nav>

      <section className="hero" id="hero">
        <HeroMapSvg className="hero-map" />
        <div className="hero-content">
          <div className="hero-tag">Built for international students</div>
          <h1 className="hero-h1">
            Pick housing
            <br />
            <em>with confidence</em>
            <br />
            in 10 seconds
          </h1>
          <p className="hero-sub">
            Studying in the US? Enter a lease candidate address and get a 7-point neighborhood score tuned
            for student life—transit, cost, safety, and real community sentiment.
          </p>
          <form className="hero-input-wrap" onSubmit={handleHeroAnalyze}>
            <div className="hero-ac-wrap">
              <AddressAutocomplete
                id="hero-addr"
                aria-label="US street address"
                value={address}
                onChange={setAddress}
                placeholder="Enter any US address…"
                inputClassName="hero-input"
              />
            </div>
            <button
              type="submit"
              className="hero-btn"
              disabled={!canSubmit || phase === 'loading'}
            >
              {phase === 'loading' ? 'Mapping…' : 'Analyze →'}
            </button>
          </form>
          <p className="hero-sub" style={{ marginTop: '14px', fontSize: '13px', opacity: 0.85 }}>
            Scores are weighted for <strong>international students</strong>—not families or commuters.
          </p>
        </div>
        <a href="#how" className="hero-scroll">
          <span>SCROLL</span>
          <div className="scroll-arrow" />
        </a>
      </section>

      <section className="how" id="how">
        <div className="container">
          <div className="section-tag">HOW IT WORKS</div>
          <h2 className="section-h2">
            From address to insight
            <br />
            in three steps
          </h2>
          <p className="section-sub">
            No spreadsheets, no tab-hopping. One search, one score, instant clarity.
          </p>
          <div className="steps">
            <div className="step">
              <div className="step-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="9" r="2.5" stroke="#1D9E75" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <div className="step-num">1</div>
                <h3 className="step-title" style={{ marginTop: '12px' }}>
                  Enter any US address
                </h3>
                <p className="step-desc">
                  Type any address or neighborhood. NeighborIQ instantly pulls live data from 7 trusted
                  sources in the background.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="#1D9E75" strokeWidth="1.5" />
                  <path d="M8 10h8M8 14h5" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="step-num">2</div>
                <h3 className="step-title" style={{ marginTop: '12px' }}>
                  Student-focused weights
                </h3>
                <p className="step-desc">
                  Every report uses weights tuned for international students: transit, rent, daily
                  amenities, and campus-adjacent living—not a generic mover profile.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="step-num">3</div>
                <h3 className="step-title" style={{ marginTop: '12px' }}>
                  Get your score &amp; report
                </h3>
                <p className="step-desc">
                  Receive a full breakdown across 7 dimensions, a community vibe summary, and a shareable
                  report — all in under 10 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="scores">
        <div className="container">
          <div className="section-tag">THE 7 DIMENSIONS</div>
          <h2 className="section-h2">Every angle, one score</h2>
          <p className="section-sub">
            Each category is powered by a live, authoritative data source — not cached averages or guesses.
          </p>
          <div className="cats-grid">
            <div className="cat-card">
              <div className="cat-emoji">🔒</div>
              <div className="cat-name">Crime safety</div>
              <div className="cat-source">SpotCrime API</div>
              <div className="cat-bar">
                <div className="cat-fill" style={{ width: '72%' }} />
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-emoji">🛒</div>
              <div className="cat-name">Nearby amenities</div>
              <div className="cat-source">Google Places</div>
              <div className="cat-bar">
                <div className="cat-fill" style={{ width: '91%' }} />
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-emoji">⚡</div>
              <div className="cat-name">Disaster risk</div>
              <div className="cat-source">FEMA National Risk Index</div>
              <div className="cat-bar">
                <div className="cat-fill" style={{ width: '88%' }} />
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-emoji">🚇</div>
              <div className="cat-name">Transit &amp; walkability</div>
              <div className="cat-source">Walk Score API</div>
              <div className="cat-bar">
                <div className="cat-fill" style={{ width: '94%' }} />
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-emoji">💰</div>
              <div className="cat-name">Cost of living</div>
              <div className="cat-source">RentCast API</div>
              <div className="cat-bar">
                <div className="cat-fill" style={{ width: '58%' }} />
              </div>
            </div>
            <div className="cat-card">
              <div className="cat-emoji">🌙</div>
              <div className="cat-name">Nightlife &amp; social</div>
              <div className="cat-source">Yelp Fusion API</div>
              <div className="cat-bar">
                <div className="cat-fill" style={{ width: '80%' }} />
              </div>
            </div>
            <div
              className="cat-card"
              style={{
                gridColumn: 'span 2',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                background: 'var(--green-light)',
                borderColor: 'rgba(29,158,117,0.2)',
              }}
            >
              <div style={{ fontSize: '28px' }}>💬</div>
              <div style={{ flex: 1 }}>
                <div className="cat-name" style={{ color: 'var(--green-dark)' }}>
                  Community sentiment
                </div>
                <div className="cat-source" style={{ color: 'var(--green)' }}>
                  Reddit · Facebook · Claude AI — our unique differentiator
                </div>
                <div className="cat-bar" style={{ marginTop: '12px', background: 'rgba(29,158,117,0.2)' }}>
                  <div className="cat-fill" style={{ width: '84%', background: 'var(--green-dark)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sentiment" id="sentiment">
        <div className="container">
          <div className="section-tag">COMMUNITY SENTIMENT</div>
          <h2 className="section-h2">The local friend you never had</h2>
          <p className="section-sub">
            Our AI reads hundreds of Reddit posts, local Facebook threads, and neighborhood forums — then
            distills them into plain English.
          </p>
          <div className="sent-demo">
            <div className="sent-card">
              <div className="sent-header">
                <div className="sent-title">AI vibe summary</div>
                <div className="sent-badge">Vibe 8.4 / 10</div>
              </div>
              <div className="sent-body">
                Residents consistently highlight the walkability and historic charm of the area. Several
                Reddit threads praise the proximity to transit and local coffee shops, though some note
                that parking is nearly impossible on weekends. The neighborhood feels safe and lively,
                with a strong sense of community around local parks and farmers markets.
              </div>
              <div className="sent-tags">
                {['walkable', 'historic charm', 'lively', 'no parking', 'safe', 'community feel'].map(
                  (t) => (
                    <div key={t} className="sent-tag">
                      {t}
                    </div>
                  ),
                )}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.3)',
                  marginBottom: '12px',
                  letterSpacing: '0.06em',
                }}
              >
                SOURCE POSTS ANALYZED
              </div>
              <div className="reddit-feed">
                <div className="reddit-post">
                  <div className="reddit-meta">r/boston · 847 upvotes · 3 weeks ago</div>
                  <div className="reddit-text">
                    &quot;Moved to Beacon Hill 6 months ago — honestly the best decision I made. Everything
                    is walkable and the neighborhood is super safe at night.&quot;
                  </div>
                  <div className="reddit-badge reddit-pos">Positive signal</div>
                </div>
                <div className="reddit-post">
                  <div className="reddit-meta">r/moving · 214 upvotes · 1 month ago</div>
                  <div className="reddit-text">
                    &quot;Great location but don&apos;t even think about having a car. Street parking is a
                    nightmare on weekends.&quot;
                  </div>
                  <div className="reddit-badge reddit-neg">Mixed signal</div>
                </div>
                <div className="reddit-post">
                  <div className="reddit-meta">r/bostonhousing · 512 upvotes · 2 weeks ago</div>
                  <div className="reddit-text">
                    &quot;Farmers market every Saturday, great coffee shops, and I&apos;ve never felt unsafe
                    walking home late. Worth every penny.&quot;
                  </div>
                  <div className="reddit-badge reddit-pos">Positive signal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="profiles">
        <div className="container">
          <div className="section-tag">INTERNATIONAL STUDENTS</div>
          <h2 className="section-h2">Housing search, without the guesswork</h2>
          <p className="section-sub">
            Lease listings rarely tell you what it feels like to live somewhere—especially from abroad.
            NeighborIQ is built around what matters when you are new to a city: getting to campus, stretching
            your budget, and staying safe after dark.
          </p>
          <div className="profiles-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '520px' }}>
            <div className="profile-card">
              <div className="profile-avatar" style={{ background: '#E1F5EE' }}>
                🌍
              </div>
              <div className="profile-name">International student profile</div>
              <div className="profile-desc">
                Emphasizes affordable rent, transit and walkability to class, groceries and pharmacies
                nearby, and a read on how locals talk about the block—so you can shortlist housing with
                fewer surprises.
              </div>
              <div className="profile-weights">
                <div className="weight-row">
                  <div className="weight-label">Transit</div>
                  <div className="weight-bar">
                    <div className="weight-fill" style={{ width: '90%', background: 'var(--green)' }} />
                  </div>
                  <div className="weight-pct">25%</div>
                </div>
                <div className="weight-row">
                  <div className="weight-label">Cost</div>
                  <div className="weight-bar">
                    <div className="weight-fill" style={{ width: '90%', background: 'var(--green)' }} />
                  </div>
                  <div className="weight-pct">25%</div>
                </div>
                <div className="weight-row">
                  <div className="weight-label">Crime</div>
                  <div className="weight-bar">
                    <div className="weight-fill" style={{ width: '72%', background: 'var(--green)' }} />
                  </div>
                  <div className="weight-pct">20%</div>
                </div>
                <div className="weight-row">
                  <div className="weight-label">Nightlife</div>
                  <div className="weight-bar">
                    <div className="weight-fill" style={{ width: '36%', background: 'var(--green)' }} />
                  </div>
                  <div className="weight-pct">10%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="report-section" id="report">
        <div className="container">
          <div className="section-tag">SAMPLE REPORT</div>
          <h2 className="section-h2">What you actually get</h2>
          <p className="section-sub">
            A full compatibility breakdown you can share with roommates or your housing office — no account
            required.
          </p>
          <div className="report-wrap">
            <div className="report-top">
              <div className="report-score">8.1</div>
              <div className="report-meta">
                <div className="report-profile-badge">International student</div>
                <div className="report-addr">47 Beacon St, Boston MA 02108</div>
                <div className="report-note">Strong match · Beacon Hill · Live data · Updated just now</div>
              </div>
            </div>
            <div className="report-body">
              <div className="report-cats">
                <div className="report-cat">
                  <div className="report-cat-icon">🔒</div>
                  <div className="report-cat-name">Crime safety</div>
                  <div className="report-cat-score" style={{ color: '#EF9F27' }}>
                    7.2
                  </div>
                </div>
                <div className="report-cat">
                  <div className="report-cat-icon">🛒</div>
                  <div className="report-cat-name">Amenities</div>
                  <div className="report-cat-score" style={{ color: '#1D9E75' }}>
                    9.1
                  </div>
                </div>
                <div className="report-cat">
                  <div className="report-cat-icon">⚡</div>
                  <div className="report-cat-name">Disaster risk</div>
                  <div className="report-cat-score" style={{ color: '#1D9E75' }}>
                    8.8
                  </div>
                </div>
                <div className="report-cat">
                  <div className="report-cat-icon">🚇</div>
                  <div className="report-cat-name">Transit</div>
                  <div className="report-cat-score" style={{ color: '#1D9E75' }}>
                    9.4
                  </div>
                </div>
                <div className="report-cat">
                  <div className="report-cat-icon">💰</div>
                  <div className="report-cat-name">Cost</div>
                  <div className="report-cat-score" style={{ color: '#D85A30' }}>
                    5.8
                  </div>
                </div>
                <div className="report-cat">
                  <div className="report-cat-icon">🌙</div>
                  <div className="report-cat-name">Nightlife</div>
                  <div className="report-cat-score" style={{ color: '#1D9E75' }}>
                    8.0
                  </div>
                </div>
                <div className="report-cat">
                  <div className="report-cat-icon">💬</div>
                  <div className="report-cat-name">Community</div>
                  <div className="report-cat-score" style={{ color: '#1D9E75' }}>
                    8.4
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div className="report-vibe">
                &quot;Residents consistently highlight walkability and historic charm. Several threads
                praise transit access, though parking is near-impossible on weekends. The area feels safe
                and lively with a strong community around local parks.&quot;
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    fontSize: '12px',
                    padding: '7px 16px',
                    background: 'var(--green)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Share report
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '12px',
                    padding: '7px 16px',
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                  }}
                >
                  Compare address
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '12px',
                    padding: '7px 16px',
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                  }}
                >
                  Ask a question →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-h2">
          Ready to find your
          <br />
          <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: 'italic' }}>
            next place?
          </em>
        </div>
        <p className="cta-sub">Any US address you are considering. Student-tuned scores in 10 seconds.</p>
        <div className="cta-input-wrap">
          <a href="#hero" className="cta-btn">
            Get my score →
          </a>
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          neighbor<span>IQ</span>
        </div>
        <div className="footer-note">Built for the Clark University Tech Innovation Challenge · 2025</div>
      </footer>

      {phase === 'loading' ? (
        <MapLoadingScreen address={address} profileLabel={profileLabel} />
      ) : null}
    </>
  )
}

export default MainPage
