import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtTime(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

async function geocodeQuery(query) {
  const r = await fetch('/score/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const data = await r.json()
  return data.found ? { lat: data.lat, lon: data.lon } : null
}

export function CampusDistanceCard({ searchedLat, searchedLon, address }) {
  const { user } = useAuth()

  const university = user?.isStudent ? user.university : null

  // University coordinates
  const [uniCoords, setUniCoords] = useState(null)
  const [uniState, setUniState] = useState('idle') // idle | loading | found | notfound

  // Searched address coordinates — use props when available, otherwise self-geocode
  const [addrCoords, setAddrCoords] = useState(
    Number.isFinite(searchedLat) && Number.isFinite(searchedLon)
      ? { lat: searchedLat, lon: searchedLon }
      : null,
  )

  // Geocode university
  useEffect(() => {
    if (!university) return
    setUniState('loading')
    geocodeQuery(university)
      .then((coords) => {
        if (coords) { setUniCoords(coords); setUniState('found') }
        else setUniState('notfound')
      })
      .catch(() => setUniState('notfound'))
  }, [university])

  // Geocode searched address as fallback when props are null
  useEffect(() => {
    if (addrCoords || !address) return
    geocodeQuery(address)
      .then((coords) => { if (coords) setAddrCoords(coords) })
      .catch(() => {})
  }, [address, addrCoords])

  if (!university) return null
  if (uniState === 'idle' || uniState === 'notfound') return null
  if (uniState === 'loading') return (
    <div className="campus-card campus-card--skeleton">
      <div className="campus-card-shimmer" />
    </div>
  )

  const hasDistance = addrCoords !== null
  const km       = hasDistance ? haversineKm(addrCoords.lat, addrCoords.lon, uniCoords.lat, uniCoords.lon) : null
  const miles    = km !== null ? km * 0.621371 : null
  const milesStr = miles !== null
    ? miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`
    : null
  const walkMin  = km !== null ? Math.round((km / 4.8) * 60) : null
  const bikeMin  = km !== null ? Math.round((km / 15)  * 60) : null
  const driveMin = km !== null ? Math.round((km / 35)  * 60) : null

  return (
    <div className="campus-card">

      <p className="campus-card-eyebrow">🎓 Campus distance</p>

      {/* ── Hero distance ── */}
      {milesStr ? (
        <div className="campus-hero">
          <span className="campus-hero-number">{milesStr}</span>
          <span className="campus-hero-label">from your address to {university}</span>
        </div>
      ) : (
        <div className="campus-hero">
          <span className="campus-hero-label" style={{ marginTop: 0 }}>
            {university} — calculating distance…
          </span>
        </div>
      )}

      {/* ── From / To row ── */}
      <div className="campus-route-row">
        <div className="campus-endpoint">
          <span className="campus-endpoint-dot campus-endpoint-dot--from" />
          <span className="campus-endpoint-text">Your address</span>
        </div>
        <div className="campus-route-dashes" aria-hidden>{'- '.repeat(10)}</div>
        <div className="campus-endpoint">
          <span className="campus-endpoint-dot campus-endpoint-dot--to" />
          <span className="campus-endpoint-text">{university}</span>
        </div>
      </div>

      {/* ── Travel estimates ── */}
      {km !== null && (
        <>
          <div className="campus-divider" />
          <div className="campus-times">
            <div className="campus-time-chip">
              <span className="campus-time-icon">🚶</span>
              <div>
                <p className="campus-time-val">{fmtTime(walkMin)}</p>
                <p className="campus-time-mode">walk</p>
              </div>
            </div>
            <div className="campus-time-chip">
              <span className="campus-time-icon">🚲</span>
              <div>
                <p className="campus-time-val">{fmtTime(bikeMin)}</p>
                <p className="campus-time-mode">bike</p>
              </div>
            </div>
            <div className="campus-time-chip">
              <span className="campus-time-icon">🚗</span>
              <div>
                <p className="campus-time-val">{fmtTime(driveMin)}</p>
                <p className="campus-time-mode">drive</p>
              </div>
            </div>
          </div>
          <p className="campus-disclaimer">Straight-line estimates · actual travel may vary</p>
        </>
      )}
    </div>
  )
}
