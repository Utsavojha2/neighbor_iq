import { useState, useMemo } from 'react'

function extractApiKey(url) {
  try {
    return new URL(url).searchParams.get('key')
  } catch {
    return null
  }
}

export function StreetViewSlider({ pictures = [], lat = null, lon = null }) {
  const [index, setIndex] = useState(0)

  const embedUrl = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    const svPicture = pictures.find((p) => p.source === 'street-view')
    const apiKey = svPicture ? extractApiKey(svPicture.url) : null
    if (!apiKey) return null
    return `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lon}&heading=0&pitch=0&fov=90`
  }, [pictures, lat, lon])

  if (!embedUrl && !pictures.length) return null

  const prev = () => setIndex((i) => (i - 1 + pictures.length) % pictures.length)
  const next = () => setIndex((i) => (i + 1) % pictures.length)

  return (
    <div className="sv-card">
      <p className="campus-card-eyebrow">📸 Street View</p>

      {embedUrl ? (
        <div className="sv-embed-wrap">
          <iframe
            src={embedUrl}
            className="sv-embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Interactive street view"
          />
          <p className="sv-attribution">© Google Street View · Drag to explore 360°</p>
        </div>
      ) : (
        <>
          <div className="sv-stage">
            <img
              key={index}
              src={pictures[index].url}
              alt={`Street view ${index + 1} of ${pictures.length}`}
              className="sv-image"
            />

            {pictures.length > 1 && (
              <>
                <button type="button" className="sv-arrow sv-arrow--prev" onClick={prev} aria-label="Previous image">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" className="sv-arrow sv-arrow--next" onClick={next} aria-label="Next image">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="sv-counter">{index + 1} / {pictures.length}</div>
              </>
            )}
          </div>

          {pictures.length > 1 && (
            <div className="sv-dots">
              {pictures.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`sv-dot ${i === index ? 'sv-dot--active' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
