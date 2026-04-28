import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import { HeroMapSvg } from '../components/HeroMapSvg'
import { MapLoadingScreen } from '../components/MapLoadingScreen'
import { ResultsScreen } from '../components/ResultsScreen'
import { buildFakeReport } from '../lib/fakeRatings'
import { fetchNeighborhoodReport } from '../lib/neighborhoodApi'
import { NavAuthWidgets } from '../components/NavAuthWidgets'
import { useSubscription } from '../context/SubscriptionContext'

/** Single audience: international students searching for housing in the US. */
const INTERNATIONAL_STUDENT_PROFILE_ID = 'international_student'
const INTERNATIONAL_STUDENT_PROFILE_LABEL = 'International student'

const reportCats = [
  { emoji: '🔒', name: 'Crime safety', api: 'CRIMEGRADE' },
  { emoji: '🛒', name: 'Amenities', api: 'Google Places' },
  { emoji: '⚡', name: 'Disaster risk', api: 'FEMA' },
  { emoji: '🚇', name: 'Transit', api: 'Walk Score' },
  { emoji: '💰', name: 'Cost', api: 'RentCast' },
  { emoji: '🌙', name: 'Nightlife', api: 'YELP' },
  { emoji: '💬', name: 'Community', api: 'Claude · Reddit' },
]

const MIN_LOADING_MS = 1800

function MainPage() {
  const { isPaid, cancelSubscription } = useSubscription()
  const [address, setAddress] = useState('')
  const [phase, setPhase] = useState('browse')
  const [analysisResult, setAnalysisResult] = useState(null)

  const canSubmit = address.trim().length > 3
  const profileLabel = INTERNATIONAL_STUDENT_PROFILE_LABEL


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

  useEffect(() => {
    if (phase === 'results') return undefined
    const targets = document.querySelectorAll('.reveal')
    if (!targets.length) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [phase])

  const handleHeroAnalyze = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    const addr = address.trim()
    setAnalysisResult(null)
    setPhase('loading')

    // Minimum display time so the loading animation isn't jarring
    const minWait = new Promise((r) => setTimeout(r, MIN_LOADING_MS))

    // Real API — falls back to fake automatically if unreachable
    const reportPromise = fetchNeighborhoodReport(addr, INTERNATIONAL_STUDENT_PROFILE_ID)

    // Transition to results only after real scores + min wait are both done
    Promise.all([reportPromise, minWait])
      .then(([report]) => {
        setAnalysisResult(report)
        setPhase('results')
      })
      .catch(() => {
        setAnalysisResult(buildFakeReport(addr, INTERNATIONAL_STUDENT_PROFILE_ID))
        setPhase('results')
      })
  }

  const handleTryFreeClick = (e) => {
    e.preventDefault()
    const hero = document.getElementById('hero')
    if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const input = document.getElementById('hero-addr')
    if (!input) return
    input.classList.remove('shake')
    void input.offsetWidth
    input.classList.add('shake')
    input.focus({ preventScroll: true })
    setTimeout(() => input.classList.remove('shake'), 600)
  }

  const handleBackFromResults = () => {
    setAddress('')
    setAnalysisResult(null)
    setPhase('browse')
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      const input = document.getElementById('hero-addr')
      if (!input) return
      input.classList.remove('shake')
      void input.offsetWidth
      input.classList.add('shake')
      input.focus({ preventScroll: true })
      setTimeout(() => input.classList.remove('shake'), 600)
    })
  }

  if (phase === 'results') {
    const snapshot =
      analysisResult ?? buildFakeReport(address.trim(), INTERNATIONAL_STUDENT_PROFILE_ID)
    /** Local news first, then crime → amenities → transit → cost → community → disaster → nightlife */
    const RESULT_LAYOUT = [
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
        summaryLines={snapshot.summaryLines ?? null}
        communityVibe={snapshot.communityVibe}
        mapLat={snapshot.mapLat ?? null}
        mapLon={snapshot.mapLon ?? null}
        pictureUrl={snapshot.pictureUrl ?? null}
        pictures={snapshot.pictures ?? []}
        rentData={snapshot.rentData ?? null}
        restaurantData={snapshot.restaurantData ?? null}
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
        <div className="nav-cta-group">
          <NavAuthWidgets />
          {isPaid ? (
            <button type="button" className="nav-cta nav-cta-pro" disabled>
              Pro
            </button>
          ) : (
            <Link to="/subscribe" className="nav-cta nav-cta-secondary">
              Upgrade
            </Link>
          )}
        </div>
      </nav>

      <section className="hero" id="hero">
        <HeroMapSvg className="hero-map" />

        {/* Ripple rings */}
        <div className="hero-ripples" aria-hidden>
          <div className="hero-ripple-ring" />
          <div className="hero-ripple-ring" />
          <div className="hero-ripple-ring" />
          <div className="hero-ripple-ring" />
        </div>

        {/* Floating location dots */}
        <div className="hero-dots" aria-hidden>
          {[
            { top: '18%', left: '12%',  delay: '0s',    dur: '3.8s' },
            { top: '30%', left: '82%',  delay: '0.7s',  dur: '4.2s' },
            { top: '62%', left: '22%',  delay: '1.4s',  dur: '3.5s' },
            { top: '72%', left: '74%',  delay: '0.3s',  dur: '4.6s' },
            { top: '14%', left: '58%',  delay: '2.1s',  dur: '3.9s' },
            { top: '50%', left: '6%',   delay: '1.0s',  dur: '4.0s' },
            { top: '80%', left: '45%',  delay: '1.8s',  dur: '3.6s' },
            { top: '40%', left: '91%',  delay: '2.5s',  dur: '4.3s' },
          ].map((d, i) => (
            <div
              key={i}
              className="hero-dot"
              style={{ top: d.top, left: d.left, animationDelay: d.delay, animationDuration: d.dur }}
            >
              <div className="hero-dot-core" style={{ animationDelay: d.delay }} />
            </div>
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-tag">Built for international students</div>
          <h1 className="hero-h1">
            Pick housing
            <br />
            <em>with confidence</em>
            <br />
            in seconds
          </h1>
          <p className="hero-sub">
            Relocating in the US? Enter any US address and get a 7-point neighborhood score tuned
            especially for you in one click.
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
            Scores are weighted for <strong>international students</strong>.
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
          <p className="section-sub" style={{ whiteSpace: 'nowrap' }}>
            No spreadsheets, no tab-hopping. One search, one score, instant clarity.
          </p>
          <div className="steps">
            <div className="step reveal">
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
            <div className="step reveal">
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
            <div className="step reveal">
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
                  report — all in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-h2 reveal">
          Ready to find your
          <br />
          <em style={{ fontFamily: "'DM Serif Display',serif", fontStyle: 'italic' }}>
            next place?
          </em>
        </div>
        <p className="cta-sub reveal" style={{ transitionDelay: '0.14s' }}>You&apos;re one click away from knowing your next neighborhood.</p>
        <div className="cta-input-wrap reveal" style={{ justifyContent: 'center', transitionDelay: '0.26s' }}>
          <a href="#hero" className="cta-btn" onClick={handleTryFreeClick}>
            Get my score →
          </a>
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          neighbor<span>IQ</span>
        </div>
      </footer>

      {phase === 'loading' ? (
        <MapLoadingScreen address={address} profileLabel={profileLabel} />
      ) : null}
    </>
  )
}

export default MainPage
