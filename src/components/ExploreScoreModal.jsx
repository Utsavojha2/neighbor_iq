import { useEffect, useMemo } from 'react'
import { getExplorePanel } from '../lib/exploreScoreContent'

function barClass(variant) {
  if (variant === 'good') return 'explore-bar-fill explore-bar-fill--good'
  if (variant === 'low') return 'explore-bar-fill explore-bar-fill--low'
  return 'explore-bar-fill explore-bar-fill--mid'
}

/**
 * @param {{ name: string, emoji: string, api: string, score: string, earned: boolean } | null} row
 * @param {string} address
 * @param {() => void} onClose
 */
export function ExploreScoreModal({ row, address, onClose }) {
  const panel = useMemo(() => (row ? getExplorePanel(address, row) : null), [row, address])

  useEffect(() => {
    if (!row) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [row, onClose])

  if (!panel) return null

  return (
    <div
      className="explore-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explore-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="explore-modal">
        <button type="button" className="explore-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="explore-modal-head">
          <span className="explore-modal-emoji" aria-hidden>
            {panel.emoji}
          </span>
          <div>
            <h2 id="explore-modal-title" className="explore-modal-title">
              {panel.headline}
            </h2>
            <p className="explore-modal-api">{panel.api}</p>
          </div>
        </div>
        <p className="explore-modal-addr">{panel.address}</p>
        <div className="explore-modal-score-row">
          <span className="explore-modal-score-label">Category score</span>
          <span
            className={`explore-modal-score-num${panel.earned ? ' explore-modal-score-num--earned' : ''}`}
          >
            {panel.score}
            <span className="explore-modal-score-of">/10</span>
          </span>
        </div>
        <p className="explore-modal-intro">{panel.intro}</p>

        <p className="explore-modal-chart-label">Factor weights (demo)</p>
        <div className="explore-modal-chart" role="img" aria-label="Bar chart of simulated score factors">
          {panel.bars.map((b) => (
            <div key={b.label} className="explore-bar-row">
              <span className="explore-bar-label">{b.label}</span>
              <div className="explore-bar-track">
                <div className={barClass(b.variant)} style={{ width: `${b.pct}%` }} />
              </div>
              <span className="explore-bar-pct">{b.pct}%</span>
            </div>
          ))}
        </div>

        {panel.listItems?.length ? (
          <>
            <p className="explore-modal-list-title">{panel.listTitle}</p>
            <ul className="explore-modal-list">
              {panel.listItems.map((item) => (
                <li key={item.title}>
                  <span className="explore-modal-list-title-text">{item.title}</span>
                  {item.meta ? <span className="explore-modal-list-meta">{item.meta}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="explore-modal-disclaimer">{panel.disclaimer}</p>
      </div>
    </div>
  )
}
