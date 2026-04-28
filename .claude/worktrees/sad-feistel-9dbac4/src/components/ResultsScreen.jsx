import { useState } from 'react'
import { ExploreScoreModal } from './ExploreScoreModal'
import { HeroMapSvg } from './HeroMapSvg'
import { NavAuthWidgets } from './NavAuthWidgets'
import { useSubscription } from '../context/SubscriptionContext'
import {
  buildReportHtml,
  downloadReportPdf,
  fetchMapPreviewDataUrl,
  slugifyFilenamePart,
} from '../lib/reportDownload'

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

function scoreColor(earned) {
  return earned ? '#1D9E75' : '#D85A30'
}

function formatFeedDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const PLATFORM_BADGES = {
  reddit: { title: 'Reddit', cls: 'reddit' },
  google: { title: 'Google Maps', cls: 'google' },
  facebook: { title: 'Facebook', cls: 'facebook' },
  nextdoor: { title: 'Nextdoor', cls: 'nextdoor' },
  tiktok: { title: 'TikTok', cls: 'tiktok' },
}

function emojiPile(emoji, pct) {
  const n = Math.min(10, Math.max(0, Math.round(pct / 10)))
  if (n === 0) return '—'
  return Array.from({ length: n }, () => emoji).join('')
}

function CommunityVibeBlock({ address, vibeText, communityVibe }) {
  if (!communityVibe?.sentiment || !communityVibe?.posts?.length) {
    return (
      <div className="results-vibe">
        <p className="results-vibe-label">Community vibe</p>
        <p className="results-vibe-text">{vibeText}</p>
      </div>
    )
  }

  const { sentiment, posts, summary } = communityVibe
  const chartAria = `Demo social sentiment for this search: ${sentiment.positive}% positive, ${sentiment.neutral}% neutral, ${sentiment.negative}% negative.`

  return (
    <div className="results-vibe results-vibe-rich">
      <p className="results-vibe-label">Community vibe</p>
      <p className="results-vibe-sub">
        Demo mix of Reddit threads, Google Maps-style reviews, Facebook groups, Nextdoor, and short-form
        clips — stable for your address (not live API pulls yet).
      </p>

      <div className="vibe-emoji-chart" role="img" aria-label={chartAria}>
        <p className="vibe-emoji-chart-heading">Social sentiment snapshot</p>
        {[
          { emoji: '😊', pct: sentiment.positive, cls: 'vibe-bar-pos', key: 'pos' },
          { emoji: '😐', pct: sentiment.neutral, cls: 'vibe-bar-neu', key: 'neu' },
          { emoji: '😟', pct: sentiment.negative, cls: 'vibe-bar-neg', key: 'neg' },
        ].map((row) => (
          <div key={row.key} className="vibe-emoji-chart-row">
            <span className="vibe-emoji-chart-emoji" aria-hidden>
              {row.emoji}
            </span>
            <div className="vibe-emoji-chart-track">
              <div className={`vibe-emoji-chart-fill ${row.cls}`} style={{ width: `${row.pct}%` }} />
            </div>
            <span className="vibe-emoji-chart-pct">{row.pct}%</span>
          </div>
        ))}
        <p className="vibe-emoji-chart-label">{sentiment.label}</p>
        <div className="vibe-emoji-piles" aria-hidden>
          <div className="vibe-emoji-pile-row">
            <span className="vibe-emoji-pile-emoji">😊</span>
            <span className="vibe-emoji-pile-chars">{emojiPile('😊', sentiment.positive)}</span>
          </div>
          <div className="vibe-emoji-pile-row">
            <span className="vibe-emoji-pile-emoji">😐</span>
            <span className="vibe-emoji-pile-chars vibe-emoji-pile-muted">{emojiPile('😐', sentiment.neutral)}</span>
          </div>
          <div className="vibe-emoji-pile-row">
            <span className="vibe-emoji-pile-emoji">😟</span>
            <span className="vibe-emoji-pile-chars vibe-emoji-pile-warn">{emojiPile('😟', sentiment.negative)}</span>
          </div>
        </div>
      </div>

      <p className="results-vibe-text results-vibe-summary">{summary}</p>

      <p className="vibe-posts-section-label">What people are saying</p>
      <ul className="vibe-posts" aria-label={`Example posts mentioning ${address}`}>
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
                      {'★'.repeat(p.rating)}
                      {'☆'.repeat(5 - p.rating)}
                    </span>
                  ) : null}
                  {typeof p.upvotes === 'number' ? (
                    <span className="vibe-post-upvotes">↑ {p.upvotes}</span>
                  ) : null}
                  <span
                    className={`vibe-post-chip vibe-post-chip--${p.sentiment}`}
                  >{`${p.sentiment === 'positive' ? 'Mostly positive' : p.sentiment === 'mixed' ? 'Mixed' : 'Critical'} tone`}</span>
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

function NewsMarqueeCard({ localFeed }) {
  const loading = Boolean(localFeed?.loading)
  const items = (localFeed?.news || []).filter((n) => n?.url && n?.title)
  const staticMessage = loading
    ? 'Loading local headlines…'
    : localFeed?.ok === false && localFeed?.error === 'network'
      ? 'Connect the local API (npm run dev:full) to load headlines.'
      : localFeed?.ok === true && !loading
        ? 'No headlines returned for this area in the last ~90 days.'
        : 'Headlines will appear here after the feed loads.'
  const source =
    localFeed?.newsSource === 'newsapi'
      ? 'NewsAPI'
      : localFeed?.newsSource === 'gdelt'
        ? 'GDELT'
        : 'Live feed'

  return (
    <article className="results-card results-card-news" aria-labelledby="results-news-title">
      <p id="results-news-title" className="results-news-marquee-title">
        Local news
      </p>
      <p className="results-news-marquee-api">
        {source} · ~90 days{localFeed?.newsGeo?.radiusMiles != null ? ` · ~${localFeed.newsGeo.radiusMiles} mi focus` : ''}
      </p>
      {localFeed?.newsGeo?.note ? (
        <p className="results-news-marquee-note">{localFeed.newsGeo.note}</p>
      ) : null}
      {items.length > 0 ? (
        <div
          className="results-news-marquee-wrap"
          role="region"
          aria-label="Scrolling local news headlines — each title is a link"
        >
          <div className="results-news-marquee-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="results-news-marquee-group"
                {...(copy === 1 ? { 'aria-hidden': true } : {})}
              >
                {items.map((n, idx) => (
                  <span key={`${copy}-${idx}-${n.url}`} className="results-news-marquee-item">
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="results-news-marquee-link"
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      {n.title}
                    </a>
                    {n.publishedAt ? (
                      <span className="results-news-marquee-meta"> · {formatFeedDate(n.publishedAt)}</span>
                    ) : null}
                    <span className="results-news-sep" aria-hidden>
                      {' '}
                      ·{' '}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="results-news-marquee-wrap results-news-marquee-wrap-static">
          <p className="results-news-marquee-static">{staticMessage}</p>
        </div>
      )}
    </article>
  )
}

function CrimeMarqueeCard({ localFeed }) {
  const loading = Boolean(localFeed?.loading)
  const items = (localFeed?.crimes || []).filter((c) => c?.title)
  const staticMessage = loading
    ? 'Loading safety and incident-style items…'
    : localFeed?.ok === false && localFeed?.error === 'network'
      ? 'Connect the local API (npm run dev:full) to load this feed.'
      : localFeed?.ok === false && localFeed?.error === 'geocode'
        ? 'Address could not be geocoded; no local context.'
        : localFeed?.ok === true && !loading && items.length === 0
          ? 'No incident-style items returned for this area.'
          : 'Items will appear here after the feed loads.'
  const sourceLabel =
    localFeed?.crimeSource === 'demo' ? 'Demo data · illustrative only' : 'Live feed'

  function renderPrimary(c, copy) {
    if (c.url) {
      return (
        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="results-crime-marquee-link"
          tabIndex={copy === 1 ? -1 : undefined}
        >
          {c.title}
        </a>
      )
    }
    return <span className="results-crime-marquee-text">{c.title}</span>
  }

  return (
    <article className="results-card results-card-crime" aria-labelledby="results-crime-title">
      <p id="results-crime-title" className="results-crime-marquee-title">
        Crime & safety
      </p>
      <p className="results-crime-marquee-api">{sourceLabel} · ~90 days</p>
      {items.length > 0 ? (
        <div
          className="results-crime-marquee-wrap"
          role="region"
          aria-label="Scrolling safety and incident items — linked when a source URL is available"
        >
          <div className="results-crime-marquee-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="results-crime-marquee-group"
                {...(copy === 1 ? { 'aria-hidden': true } : {})}
              >
                {items.map((c, idx) => (
                  <span key={`${copy}-${idx}-${c.id || c.title}`} className="results-crime-marquee-item">
                    {renderPrimary(c, copy)}
                    <span className="results-crime-marquee-meta">
                      {c.category ? ` · ${c.category}` : ''}
                      {c.date ? ` · ${formatFeedDate(c.date)}` : ''}
                    </span>
                    <span className="results-crime-sep" aria-hidden>
                      {' '}
                      ·{' '}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="results-crime-marquee-wrap results-crime-marquee-wrap-static">
          <p className="results-crime-marquee-static">{staticMessage}</p>
        </div>
      )}
    </article>
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
  communityVibe = null,
  localFeed = null,
}) {
  const { isPaid, openPaywall } = useSubscription()
  const [pdfBusy, setPdfBusy] = useState(false)
  const [exploreRow, setExploreRow] = useState(null)
  const scoreNum = Math.min(10, Math.max(0, parseFloat(overallScore) || 0))
  const ringOffset = RING_C * (1 - scoreNum / 10)

  const handleDownloadReport = async () => {
    if (!isPaid) {
      openPaywall()
      return
    }
    const feedForExport =
      localFeed && !localFeed.loading
        ? {
            ok: localFeed.ok,
            geo: localFeed.geo,
            news: localFeed.news || [],
            crimes: localFeed.crimes || [],
            newsSource: localFeed.newsSource,
            newsGeo: localFeed.newsGeo,
            crimeSource: localFeed.crimeSource,
            message: localFeed.message,
            error: localFeed.error,
          }
        : null
    const slug = slugifyFilenamePart(address)
    setPdfBusy(true)
    try {
      let mapImageDataUrl = null
      const g = feedForExport?.geo
      if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) {
        mapImageDataUrl = await fetchMapPreviewDataUrl(g.lat, g.lon)
      }
      const html = buildReportHtml({
        address,
        profileLabel,
        overallScore,
        pointsEarned,
        rows,
        vibeText,
        communityVibe,
        localFeed: feedForExport,
        mapImageDataUrl,
      })
      await downloadReportPdf(`neighboriq-report-${slug}.pdf`, html)
    } catch (err) {
      console.error(err)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="results-page">
      <header className="results-topnav">
        <button type="button" className="results-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          New search
        </button>
        <div className="results-brand">
          neighbor<span>IQ</span>
        </div>
        <div className="results-topnav-auth">
          <NavAuthWidgets variant="results" />
        </div>
      </header>

      <section className="results-hero">
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }} aria-hidden>
          <HeroMapSvg className="hero-map" />
        </div>
        <div className="results-hero-inner">
          <span className="results-hero-badge">Analysis complete</span>
          <h1 className="results-hero-addr">{address}</h1>
          <p className="results-hero-meta">
            {profileLabel} · {pointsEarned} of 7 dimensions ≥ 7.0 · Fake ratings (stable per address)
          </p>

          {localFeed &&
          !localFeed.loading &&
          localFeed.geo &&
          Number.isFinite(localFeed.geo.lat) &&
          Number.isFinite(localFeed.geo.lon) ? (
            <div className="results-hero-map">
              <img
                src={`/api/map-preview?lat=${encodeURIComponent(localFeed.geo.lat)}&lon=${encodeURIComponent(localFeed.geo.lon)}&w=440&h=200&zoom=16`}
                alt={`Map preview near ${address.slice(0, 120)}`}
                className="results-hero-map-img"
                decoding="async"
              />
              <p className="results-hero-map-caption">
                Map preview · © OpenStreetMap contributors (approximate location)
              </p>
            </div>
          ) : null}

          <div className="results-hero-row">
            <div className="results-score-ring-wrap">
              <svg className="results-score-ring" viewBox="0 0 120 120" aria-hidden>
                <defs>
                  <linearGradient id="resultsRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0F6E56" />
                    <stop offset="100%" stopColor="#5DCAA5" />
                  </linearGradient>
                </defs>
                <circle className="results-score-ring-bg" cx="60" cy="60" r={RING_R} />
                <circle
                  className="results-score-ring-fg"
                  cx="60"
                  cy="60"
                  r={RING_R}
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="results-score-num">
                <span className="results-score-big">{overallScore}</span>
                <span className="results-score-of">compat · /10</span>
              </div>
            </div>
            <div className="results-summary">
              <p className="results-summary-title">Neighborhood snapshot</p>
              <p className="results-summary-text">
                Strong signals on walkability, amenities, and community sentiment. Cost of living is
                the main watch-out for this profile — tune weights when APIs are live.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="results-body">
        <div className="results-cards">
          {rows.map((row) => {
            if (row.kind === 'news') {
              return <NewsMarqueeCard key={row.id} localFeed={localFeed} />
            }
            if (row.kind === 'crimes') {
              return <CrimeMarqueeCard key={row.id} localFeed={localFeed} />
            }
            const barPct = Math.min(100, (parseFloat(row.score) / 10) * 100)
            return (
              <article key={row.name} className="results-card">
                <div className="results-card-top">
                  <span className="results-card-emoji">{row.emoji}</span>
                  <span
                    className="results-card-score"
                    style={{ color: scoreColor(row.earned) }}
                  >
                    {row.score}
                  </span>
                </div>
                <h2 className="results-card-name">{row.name}</h2>
                <p className="results-card-api">{row.api}</p>
                <div className="results-card-bar">
                  <div
                    className="results-card-bar-fill"
                    style={{
                      width: `${barPct}%`,
                      background: row.earned ? '#1D9E75' : '#D85A30',
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="results-card-explore"
                  onClick={() => setExploreRow(row)}
                >
                  Explore more
                </button>
              </article>
            )
          })}
        </div>

        <CommunityVibeBlock address={address} vibeText={vibeText} communityVibe={communityVibe} />

        <section className="results-feed" aria-label="Recent news and local incidents">
          <p className="results-feed-head">Local context (~90 days)</p>
          {localFeed?.loading ? (
            <p className="results-feed-muted">Loading news and incident-style items…</p>
          ) : null}
          {!localFeed?.loading && localFeed?.error === 'network' ? (
            <p className="results-feed-warn">
              Could not reach the local feed API. Run <code>npm run dev:full</code> so Vite proxies{' '}
              <code>/api</code> to the Express server.
            </p>
          ) : null}
          {!localFeed?.loading && localFeed && localFeed.ok === false && localFeed.error === 'geocode' ? (
            <p className="results-feed-warn">{localFeed.message || 'Address could not be geocoded.'}</p>
          ) : null}
          {!localFeed?.loading && localFeed?.ok && localFeed.geo?.displayName ? (
            <p className="results-feed-geo">{localFeed.geo.displayName}</p>
          ) : null}
        </section>

        <div className="results-download-hint">
          {isPaid ? (
            <span className="results-download-hint-pro">Pro · PDF download unlocked</span>
          ) : (
            <span className="results-download-hint-free">
              Subscribe to download this report as a PDF for sharing or printing.
            </span>
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
          <button type="button" className="results-action-ghost">
            Ask a question →
          </button>
        </div>
      </div>

      <ExploreScoreModal
        row={exploreRow}
        address={address}
        onClose={() => setExploreRow(null)}
      />
    </div>
  )
}
