import { buildCommunityVibe, buildFakeReport } from './fakeRatings'

/**
 * Maps 1-to-1 with reportCats in MainPage.jsx:
 * [0] Crime safety  [1] Amenities  [2] Disaster risk
 * [3] Transit       [4] Cost       [5] Nightlife  [6] Community
 */
const CATEGORY_ENDPOINTS = [
  '/score/crime',
  '/score/amenities',
  '/score/disaster',
  '/score/transit',
  '/score/cost',
  '/score/nightlife',
  '/score/community',
]

async function fetchCategory(path, address) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return res.json()
}

/**
 * Fetch all 7 neighborhood scores from the real API in parallel.
 * Falls back to fake data for any category that fails, and falls back
 * to the full fake report if the API is completely unreachable.
 *
 * Returns the same shape as buildFakeReport() so ResultsScreen needs no changes.
 */
export async function fetchNeighborhoodReport(address, lifestyleId) {
  const results = await Promise.allSettled(
    CATEGORY_ENDPOINTS.map((path) => fetchCategory(path, address)),
  )

  const allFailed = results.every((r) => r.status === 'rejected')
  if (allFailed) {
    console.warn('[NeighborIQ] Score API unreachable — using demo data')
    return { ...buildFakeReport(address, lifestyleId), fromApi: false }
  }

  const normalized = `${address.trim().toLowerCase()}|${lifestyleId}`
  const fake = buildFakeReport(address, lifestyleId)

  let mapLat = null
  let mapLon = null
  for (const r of results) {
    if (r.status === 'fulfilled' && Number.isFinite(r.value?.lat) && Number.isFinite(r.value?.lon)) {
      mapLat = r.value.lat
      mapLon = r.value.lon
      break
    }
  }

  // Extract rent estimate data from the cost endpoint (index 4)
  let rentData = null
  if (results[4]?.status === 'fulfilled') {
    const cost = results[4].value
    console.log('[NeighborIQ] /score/cost raw:', cost)
    // Rent fields may be top-level or nested under scoreMetadata
    const src = (cost?.rent != null || cost?.rentRangeLow != null) ? cost : cost?.scoreMetadata ?? null
    if (src?.rent != null || src?.rentRangeLow != null) {
      rentData = {
        rent: src.rent ?? null,
        rentRangeLow: src.rentRangeLow ?? null,
        rentRangeHigh: src.rentRangeHigh ?? null,
        comparables: Array.isArray(src.comparables) ? src.comparables : [],
        subjectProperty: src.subjectProperty ?? null,
      }
    }
    console.log('[NeighborIQ] rentData:', rentData)
  }

  const scores = results.map((r, i) => {
    if (r.status === 'fulfilled') {
      const val = parseFloat(r.value?.score)
      if (Number.isFinite(val)) return Math.min(10, Math.max(0, val)).toFixed(1)
    }
    return fake.scores[i]
  })

  const earned = scores.map((s) => parseFloat(s) >= 7.0)
  const pointsEarned = earned.filter(Boolean).length

  // Use the real community summary as vibeText (index 6), fall back to crime or fake
  const summaries = results.map((r) =>
    r.status === 'fulfilled' ? (r.value?.summary ?? '') : '',
  )
  const fallbackVibeText =
    summaries[6] ||
    summaries.find((s) => s) ||
    fake.vibeText

  // Fetch nearby restaurants in parallel with overall score
  let restaurantData = null
  const restaurantPromise = fetch('/score/restaurants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  }).then((r) => r.ok ? r.json() : null).catch(() => null)

  // Fetch overall score from POST /score (reads DB results saved by category calls above)
  let overallScore
  let vibeText = fallbackVibeText
  let summaryLines = null
  let pictureUrl = null
  let pictures = []
  try {
    const overallRes = await fetch('/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    if (overallRes.ok) {
      const overall = await overallRes.json()
      if (Number.isFinite(parseFloat(overall?.score))) {
        overallScore = Math.min(9.9, Math.max(0, parseFloat(overall.score))).toFixed(1)
      }
      if (overall?.summary) {
        if (Array.isArray(overall.summary)) {
          summaryLines = overall.summary.filter((s) => typeof s === 'string' && s.trim())
          if (summaryLines.length > 0) vibeText = summaryLines.join(' ')
        } else {
          vibeText = overall.summary
        }
      }
      const rawPictures = overall?.address?.pictures ?? overall?.pictures
      if (Array.isArray(rawPictures)) {
        pictures = rawPictures.filter((p) => typeof p?.url === 'string')
        if (pictures.length > 0) pictureUrl = pictures[0].url
      }
      console.log('[NeighborIQ] /score overall:', { score: overall?.score, pictureCount: pictures.length })
    }
  } catch {
    // fall through to computed average
  }

  if (!overallScore) {
    const avg = scores.reduce((a, s) => a + parseFloat(s), 0) / scores.length
    overallScore = Math.min(9.9, Math.max(0, Math.round(avg * 10) / 10)).toFixed(1)
  }

  const communityApiData = results[6]?.status === 'fulfilled' ? results[6].value : null
  const realSentiment = communityApiData?.metadata?.sentiment
  const fakeCommunity = buildCommunityVibe(normalized, summaries[6] || vibeText)
  const communityVibe =
    realSentiment?.positive != null &&
    realSentiment?.neutral != null &&
    realSentiment?.negative != null
      ? {
          ...fakeCommunity,
          sentiment: {
            positive: realSentiment.positive,
            neutral: realSentiment.neutral,
            negative: realSentiment.negative,
            label: communityApiData.metadata.verdict ?? fakeCommunity.sentiment.label,
          },
        }
      : fakeCommunity

  const restaurantRes = await restaurantPromise
  if (Array.isArray(restaurantRes?.restaurants) && restaurantRes.restaurants.length > 0) {
    restaurantData = restaurantRes.restaurants
  }

  return {
    scores,
    earned,
    overallScore,
    pointsEarned,
    vibeText,
    summaryLines,
    communityVibe,
    fromApi: true,
    mapLat,
    mapLon,
    pictureUrl,
    pictures,
    rentData,
    restaurantData,
  }
}
