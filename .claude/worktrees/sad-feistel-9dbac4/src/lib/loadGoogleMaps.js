const SCRIPT_ATTR = 'data-neighboriq-google-maps'

/**
 * Loads Maps JavaScript API with Places library once.
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.maps?.places) return Promise.resolve()

  const existing = document.querySelector(`script[${SCRIPT_ATTR}]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps script error')), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.setAttribute(SCRIPT_ATTR, 'true')
    s.async = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(s)
  })
}

export function getGoogleMapsKey() {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : ''
}
