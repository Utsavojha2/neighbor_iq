import { useEffect, useState } from 'react'
import { HeroMapSvg } from './HeroMapSvg'

const STATUS_LINES = [
  'Geocoding your address…',
  'Plotting coordinates on the map…',
  'Pulling crime & safety layers…',
  'Scanning amenities & transit…',
  'Reading community signals…',
  'Building your compatibility score…',
]

export function MapLoadingScreen({ address, profileLabel }) {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % STATUS_LINES.length)
    }, 520)
    return () => clearInterval(id)
  }, [])

  const shortAddr =
    address.length > 52 ? `${address.slice(0, 50)}…` : address

  return (
    <div className="map-load-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="map-load-grid" aria-hidden />
      <div className="map-load-scan" aria-hidden />
      <div className="map-load-radar" aria-hidden />
      <div className="map-load-radar r2" aria-hidden />
      <div className="map-load-radar r3" aria-hidden />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.22,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <HeroMapSvg className="hero-map" />
      </div>

      <div className="map-load-pin-wrap">
        <svg
          className="map-load-pin"
          width="56"
          height="72"
          viewBox="0 0 56 72"
          fill="none"
          aria-hidden
        >
          <path
            d="M28 4C16.95 4 8 12.73 8 23.4c0 14.2 20 40.6 20 40.6s20-26.4 20-40.6C48 12.73 39.05 4 28 4z"
            fill="#1D9E75"
            stroke="#E1F5EE"
            strokeWidth="2"
          />
          <circle cx="28" cy="24" r="8" fill="#09152A" opacity="0.25" />
          <circle cx="28" cy="22" r="5" fill="#fff" />
        </svg>

        <div className="map-load-title">
          Mapping your neighborhood
          <span className="map-load-addr">{shortAddr}</span>
          {profileLabel ? (
            <span className="map-load-addr" style={{ marginTop: '6px', opacity: 0.85 }}>
              {profileLabel} profile
            </span>
          ) : null}
        </div>

        <div className="map-load-status" key={lineIndex}>
          {STATUS_LINES[lineIndex]}
        </div>
        <div className="map-load-dots" aria-hidden>
          <span className="map-load-dot" />
          <span className="map-load-dot" />
          <span className="map-load-dot" />
        </div>
        <div className="map-load-bar" aria-hidden>
          <div className="map-load-bar-fill" />
        </div>
      </div>

      <div className="map-load-blocks" aria-hidden>
        <span className="map-load-block" />
        <span className="map-load-block" />
        <span className="map-load-block" />
        <span className="map-load-block" />
      </div>
    </div>
  )
}
