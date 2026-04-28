export async function fetchPhotonSuggestions(query, signal) {
  try {
    const url = `/score/autocomplete?q=${encodeURIComponent(query)}`
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
