import { useState } from 'react'
import { ExploreScoreModal } from './ExploreScoreModal'
import { HeroMapSvg } from './HeroMapSvg'
import { NavAuthWidgets } from './NavAuthWidgets'
import { NeighborhoodChat } from './chat/NeighborhoodChat'
import { useSubscription } from '../context/SubscriptionContext'
import { CampusDistanceCard } from './CampusDistanceCard'
import { HoaInfoCard } from './HoaInfoCard'
import {
  buildReportHtml,
  downloadReportPdf,
  fetchMapPreviewDataUrl,
  slugifyFilenamePart,
} from '../lib/reportDownload'

const RING_R = 62
const RING_C = 2 * Math.PI * RING_R

function scoreColor(earned) {
  return earned ? '#1D9E75' : '#E8A444'
}

const PLATFORM_BADGES = {
  reddit:   { title: 'Reddit',      cls: 'reddit' },
  google:   { title: 'Google Maps', cls: 'google' },
  facebook: { title: 'Facebook',    cls: 'facebook' },
  nextdoor: { title: 'Nextdoor',    cls: 'nextdoor' },
  tiktok:   { title: 'TikTok',      cls: 'tiktok' },
}

function CommunityVibeBlock({ address, communityVibe }) {
  if (!communityVibe?.sentiment || !communityVibe?.posts?.length) {
    return null
  }

  const { sentiment, posts, summary } = communityVibe
  const chartAria = `Social sentiment: ${sentiment.positive}% positive, ${sentiment.neutral}% neutral, ${sentiment.negative}% negative.`

  return (
    <div className="results-vibe results-vibe-rich">
      <p className="results-vibe-label">Community vibe</p>

      <div className="vibe-emoji-chart" role="img" aria-label={chartAria}>
        <p className="vibe-emoji-chart-heading">Social sentiment snapshot</p>
        {[
          { emoji: '😊', pct: sentiment.positive, cls: 'vibe-bar-pos', key: 'pos' },
          { emoji: '😐', pct: sentiment.neutral,  cls: 'vibe-bar-neu', key: 'neu' },
          { emoji: '😟', pct: sentiment.negative, cls: 'vibe-bar-neg', key: 'neg' },
        ].map((row) => (
          <div key={row.key} className="vibe-emoji-chart-row">
            <span className="vibe-emoji-chart-emoji" aria-hidden>{row.emoji}</span>
            <div className="vibe-emoji-chart-track">
              <div className={`vibe-emoji-chart-fill ${row.cls}`} style={{ width: `${row.pct}%` }} />
            </div>
            <span className="vibe-emoji-chart-pct">{row.pct}%</span>
          </div>
        ))}
        <p className="vibe-emoji-chart-label">{sentiment.label}</p>
      </div>

      <p className="results-vibe-text results-vibe-summary">{summary}</p>

      <p className="vibe-posts-section-label">What people are saying</p>
      <ul className="vibe-posts" aria-label={`Posts mentioning ${address}`}>
        {posts.map((p) => {
          const badge = PLATFORM_BADGES[p.platform] || { title: p.platform, cls: 'generic' }
          return (
            <li key={p.id}>
              <article className={`vibe-post vibe-post--${badge.cls}`}>
                <header className="vibe-post-head">
                  <span className="vibe-post-badge">{badge.title}</span>
                  <span className="vibe-post-channel">{p.channel}</span>
                  <span className="vibe-post-time">{p.timeAgo}</span>
                </header>
                <div className="vibe-post-meta-row">
                  {typeof p.rating === 'number' ? (
                    <span className="vibe-post-stars" aria-label={`${p.rating} of 5 stars`}>
                      {'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}
                    </span>
                  ) : null}
                  {typeof p.upvotes === 'number' ? (
                    <span className="vibe-post-upvotes">↑ {p.upvotes}</span>
                  ) : null}
                  <span className={`vibe-post-chip vibe-post-chip--${p.sentiment}`}>
                    {p.sentiment === 'positive' ? 'Mostly positive' : p.sentiment === 'mixed' ? 'Mixed' : 'Critical'} tone
                  </span>
                </div>
                <p className="vibe-post-body">{p.body}</p>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ResultsScreen({
  onBack,
  address,
  profileLabel,
  overallScore,
  pointsEarned,
  rows,
  vibeText,
  summaryLines = null,
  communityVibe = null,
  mapLat = null,
  mapLon = null,
  pictureUrl = null,
  rentData = null,
  restaurantData = null,
}) {
  const { isPaid, openPaywall } = useSubscription()
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [exploreRow, setExploreRow] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)

  const scoreNum = Math.min(10, Math.max(0, parseFloat(overallScore) || 0))
  const ringOffset = RING_C * (1 - scoreNum / 10)

  const commaIdx = address.indexOf(',')
  const streetPart = commaIdx > 0 ? address.slice(0, commaIdx) : address
  const cityPart = commaIdx > 0 ? address.slice(commaIdx + 2) : ''

  const handleDownloadReport = async () => {
    if (!isPaid) {
      openPaywall()
      return
    }
    const slug = slugifyFilenamePart(address)
    setPdfBusy(true)
    setPdfError('')
    try {
      let mapImageDataUrl = null
      if (Number.isFinite(mapLat) && Number.isFinite(mapLon)) {
        mapImageDataUrl = await fetchMapPreviewDataUrl(mapLat, mapLon)
      }
      let alternatives = null
      try {
        const altRes = await fetch('/score/alternatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        if (altRes.ok) {
          const altData = await altRes.json()
          if (Array.isArray(altData)) alternatives = altData
        }
      } catch {
        // alternatives are optional — continue without them
      }
      const html = buildReportHtml({
        address,
        profileLabel,
        overallScore,
        pointsEarned,
        rows,
        vibeText,
        communityVibe,
        alternatives,
        mapImageDataUrl,
        rentData,
        restaurantData,
      })
      await downloadReportPdf(`neighboriq-report-${slug}.pdf`, html)
    } catch (err) {
      console.error('[PDF]', err)
      setPdfError('PDF generation failed. Try again or use a different browser.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="results-page">
      <header className="results-topnav">
        <button type="button" className="results-back" onClick={onBack}>
          <span className="results-back-dot" aria-hidden />
          New search
        </button>
        <div className="results-brand">neighbor<span>IQ</span></div>
        <div className="results-topnav-auth">
          <NavAuthWidgets variant="results" />
        </div>
      </header>

      <div className="results-content">
        {/* Hero card */}
        <div className="results-hero-card">
          <div className="results-hero-card-bg" aria-hidden>
            {pictureUrl ? (
              <img src={pictureUrl} className="results-hero-card-bg-img" alt="" />
            ) : (
              <HeroMapSvg className="results-hero-card-svg" />
            )}
          </div>
          {pictureUrl ? (
            <img
              src={pictureUrl}
              className="results-hero-card-photo"
              alt={`Street view near ${address}`}
            />
          ) : null}

          {/* Score ring — top right */}
          <div className="results-score-ring-wrap">
            <svg className="results-score-ring" viewBox="0 0 160 160" aria-hidden>
              <defs>
                <linearGradient id="resultsRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0F6E56" />
                  <stop offset="100%" stopColor="#5DCAA5" />
                </linearGradient>
              </defs>
              <circle className="results-score-ring-bg" cx="80" cy="80" r={RING_R} />
              <circle
                className="results-score-ring-fg"
                cx="80"
                cy="80"
                r={RING_R}
                strokeDasharray={RING_C}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="results-score-num">
              <span className="results-score-big">{overallScore}</span>
              <span className="results-score-sep">/ 10</span>
            
            </div>
          </div>

          {/* Bottom — badge + address */}
          <div className="results-hero-card-bottom">
            <span className="results-hero-badge">Analysis complete</span>
            <h1 className="results-hero-addr-street">{streetPart}</h1>
            <p className="results-hero-addr-rest">
              {cityPart}{cityPart && profileLabel ? ' · ' : ''}{profileLabel}
            </p>
          </div>
        </div>

        {/* Summary insight lines */}
        {(() => {
          const toSentences = (str) =>
            str
              .split(/\n+/)
              .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+(?=[A-Z])/))
              .map((s) => s.trim())
              .filter(Boolean)

          const lines = (summaryLines && summaryLines.length > 0)
            ? summaryLines
            : vibeText
              ? toSentences(vibeText)
              : []

          if (!lines.length) return null
          return (
            <ul className="vibe-insight-list" aria-label="Neighborhood insights">
              {lines.map((line, i) => (
                <li key={i} className={`vibe-insight-item vibe-insight-item--${i % 5}`}>
                  <span className="vibe-insight-marker" aria-hidden />
                  <p className="vibe-insight-text">{line}</p>
                </li>
              ))}
            </ul>
          )
        })()}

        {/* Score grid — 2 columns */}
        <div className="results-score-grid">
          {rows.filter((r) => r.kind === 'score').map((row) => {
            const barPct = Math.min(100, (parseFloat(row.score) / 10) * 100)
            return (
              <div key={row.name} className="results-score-card">
                <div className="results-score-card-header">
                  <div>
                    <h2 className="results-score-card-name">{row.name}</h2>
                    <p className="results-score-card-api">{row.api}</p>
                  </div>
                  <span
                    className="results-score-card-val"
                    style={{ color: scoreColor(row.earned) }}
                  >
                    {row.score}
                  </span>
                </div>
                <div className="results-score-card-bar">
                  <div
                    className="results-score-card-bar-fill"
                    style={{
                      width: `${barPct}%`,
                      background: row.earned ? '#1D9E75' : '#E8A444',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <CampusDistanceCard searchedLat={mapLat} searchedLon={mapLon} address={address} />

        <HoaInfoCard address={address} />

        <CommunityVibeBlock address={address} communityVibe={communityVibe} />

        <div className="results-download-hint">
          {isPaid ? (
            <span className="results-download-hint-pro">Pro · PDF download unlocked</span>
          ) : (
            <span className="results-download-hint-free">
              Subscribe to download this report as a PDF for sharing or printing.
            </span>
          )}
          {pdfError && (
            <p style={{ color: '#D85A30', fontSize: '13px', marginTop: '8px' }}>{pdfError}</p>
          )}
        </div>

        <div className="results-actions">
          <button
            type="button"
            className={isPaid ? 'results-action-download' : 'results-action-download results-action-download-locked'}
            onClick={handleDownloadReport}
            disabled={isPaid && pdfBusy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 4v11m0 0l-4-4m4 4 4-4M5 19h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isPaid ? (pdfBusy ? 'Building PDF…' : 'Download PDF') : 'Download PDF · Pro'}
          </button>
          <button type="button" className="results-action-ghost" onClick={onBack}>
            Compare another address
          </button>
          <button type="button" className="results-action-ghost" onClick={() => setChatOpen(true)}>
            Neighborhood FAQ →
          </button>
        </div>
      </div>

      <ExploreScoreModal
        row={exploreRow}
        address={address}
        onClose={() => setExploreRow(null)}
      />

      <NeighborhoodChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        address={address}
        profileLabel={profileLabel}
        overallScore={overallScore}
        rows={rows}
        vibeText={vibeText}
        communityVibe={communityVibe}
      />
    </div>
  )
}
