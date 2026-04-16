/** Continental US — biases Photon results toward US addresses. */
export const PHOTON_US_BBOX = '-124.85,24.4,-66.92,49.5'

export function formatPhotonLine(props) {
  const hn = props.housenumber
  const st = props.street
  const line1 = [hn, st].filter(Boolean).join(' ').trim()
  const locality =
    props.city || props.town || props.village || props.district || props.county || ''
  const region = props.state || props.region || ''
  const pc = props.postcode || ''
  const right = [locality, region, pc].filter(Boolean).join(', ')
  if (line1 && right) return `${line1}, ${right}`
  if (props.name && right) {
    const name = String(props.name)
    if (name !== st) return `${name}, ${right}`
  }
  if (props.name) return right ? `${props.name}, ${right}` : String(props.name)
  return right || 'Address'
}

export async function fetchPhotonSuggestions(query, signal) {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '8')
  url.searchParams.set('lang', 'en')
  url.searchParams.set('bbox', PHOTON_US_BBOX)

  try {
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) return []
    const data = await res.json()
    const features = Array.isArray(data?.features) ? data.features : []
    const seen = new Set()
    const lines = []
    for (const f of features) {
      const p = f?.properties
      if (!p) continue
      const line = formatPhotonLine(p)
      if (!line || seen.has(line)) continue
      seen.add(line)
      lines.push(line)
    }
    return lines
  } catch {
    return []
  }
}
