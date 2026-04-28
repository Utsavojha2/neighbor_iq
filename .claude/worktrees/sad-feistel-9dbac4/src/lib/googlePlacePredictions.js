import { getGoogleMapsKey, loadGoogleMaps } from './loadGoogleMaps'

/**
 * @param {string} input
 * @param {AbortSignal} [signal]
 * @returns {Promise<string[]>}
 */
export async function fetchGooglePlacePredictions(input, signal) {
  const key = getGoogleMapsKey()
  if (!key) return []

  await loadGoogleMaps(key)
  if (signal?.aborted) return []

  const service = new window.google.maps.places.AutocompleteService()

  return new Promise((resolve) => {
    const done = (lines) => {
      if (signal?.aborted) resolve([])
      else resolve(lines)
    }

    service.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: ['us'] },
      },
      (predictions, status) => {
        if (signal?.aborted) {
          done([])
          return
        }
        const ok = window.google.maps.places.PlacesServiceStatus.OK
        const zero = window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        if ((status !== ok && status !== zero) || !predictions?.length) {
          done([])
          return
        }
        const seen = new Set()
        const lines = []
        for (const p of predictions) {
          const d = p.description
          if (d && !seen.has(d)) {
            seen.add(d)
            lines.push(d)
          }
        }
        done(lines.slice(0, 8))
      },
    )
  })
}

export function isGooglePlacesEnabled() {
  return Boolean(getGoogleMapsKey())
}
