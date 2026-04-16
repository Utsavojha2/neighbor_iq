const VIBES = [
  'Residents consistently highlight walkability and historic charm. Several threads praise transit access, though parking can be tight on weekends. The area feels safe and lively with a strong community around local parks.',
  'Mixed reviews: great for food and nightlife, with some noise complaints late at night. Transit access is strong; students mention manageable commutes to campus but rising rents.',
  'Quiet, tree-lined blocks with a suburban feel. People love pocket parks and low crime signals, but note you may need a car or a bus pass for big grocery runs.',
  'Up-and-coming pocket with new cafes and student renters. Sentiment skews positive on value, with some concern about ongoing construction.',
  'Waterfront or park-adjacent vibes dominate the conversation. Walkability scores high in threads; winter weather and heating costs come up occasionally.',
]

function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(h) >>> 0
}

function nextHash(h) {
  return (h * 1664525 + 1013904223) >>> 0
}

function placeFromNormalized(normalized) {
  const addr = normalized.split('|')[0] || ''
  const first = addr.split(',').map((s) => s.trim())[0]
  if (first && first.length > 1) return first.slice(0, 48)
  return 'this neighborhood'
}

const SNIPPETS = {
  reddit: [
    (p) =>
      `${p} has been solid for us — walkable to transit, good coffee scene. Weekend nights can get loud on main drags.`,
    (p) =>
      `Moved near ${p} last year. Love the trees and pocket parks; rent climbed faster than we expected though.`,
    (p) =>
      `Honest take on ${p}: solid for students without a car if you are near a bus line; street parking is a myth after 6pm. Otherwise friendly block.`,
    (p) =>
      `Daily life around ${p} is convenient — pharmacy, grocery, gym in ~10 min walk. Snow clearing on side streets is meh.`,
  ],
  google: [
    (p) =>
      `Quiet residential pocket by ${p}. Day-to-day errands are walkable. Would give 5★ if parking weren’t competitive.`,
    (p) =>
      `Lived here 3 years near ${p}. Safe dog walks after dark, good takeout variety. Heating bills in winter are real.`,
    (p) =>
      `Lots of international students near ${p} mention the walk to campus and cheap eats. Weekday traffic backs up around rush hour.`,
  ],
  facebook: [
    (p) =>
      `Shoutout to whoever runs the little free library on our block near ${p} — great for swapping textbooks 💚`,
    (p) =>
      `Anyone recommend a handyman near ${p}? Otherwise we adore the neighbors — block party was packed this fall.`,
    (p) =>
      `FYI package thefts picked up on ${p} side — consider a locker or office delivery. Still love the coffee shops.`,
  ],
  nextdoor: [
    (p) =>
      `Heard fireworks past midnight near ${p} again — cute on July 4, less cute on a Tuesday.`,
    (p) =>
      `Lost cat orange tabby — last seen ${p} area. Microchipped, answers to Mango.`,
    (p) =>
      `Contractor rec for small deck repair near ${p}? Prefer someone insured. Thanks neighbors.`,
  ],
  tiktok: [
    (p) => `POV: you discover the tucked-away bakery near ${p} 🥐 #neighborhood #citylife`,
    (p) => `Sunset walk route near ${p} hits different — saved this loop for 10k steps 📍`,
    (p) => `Rent vs vibes near ${p} — worth it for the transit? Comment your hot take 👇`,
  ],
}

const TIME_AGOS = ['2d ago', '5d ago', '1w ago', '2w ago', '1mo ago', '3mo ago', '6mo ago']

/**
 * Deterministic “social listening” demo: fake Reddit / Maps / etc. + emoji sentiment split.
 * @param {string} normalized `address|lifestyle`
 * @param {string} summaryText existing AI-style summary
 */
export function buildCommunityVibe(normalized, summaryText) {
  let h = hashString(`${normalized}|communityLayer`)
  const place = placeFromNormalized(normalized)

  h = nextHash(h)
  let positive = 46 + (h % 30)
  h = nextHash(h)
  let negative = 7 + (h % 16)
  h = nextHash(h)
  let neutral = 100 - positive - negative
  if (neutral < 10) {
    neutral = 10
    positive = Math.max(42, positive - 8)
    negative = 100 - positive - neutral
    if (negative < 6) {
      negative = 6
      positive = 100 - neutral - negative
    }
  }

  let label = 'Mixed signals'
  if (positive >= 58) label = 'Mostly positive buzz'
  else if (positive >= 48) label = 'Leaning positive'
  if (negative >= 22) label = 'Some sharp complaints mixed in'
  if (positive >= 55 && negative <= 12) label = 'Warm neighborhood chatter'

  const platformKeys = ['reddit', 'google', 'facebook', 'nextdoor', 'tiktok']
  const posts = []
  for (let i = 0; i < 5; i += 1) {
    h = nextHash(h)
    const pk = platformKeys[h % platformKeys.length]
    h = nextHash(h)
    const pool = SNIPPETS[pk]
    const body = pool[h % pool.length](place)
    h = nextHash(h)
    const timeAgo = TIME_AGOS[h % TIME_AGOS.length]
    h = nextHash(h)
    const sentimentRoll = h % 10
    const sentiment =
      sentimentRoll < 5 ? 'positive' : sentimentRoll < 8 ? 'mixed' : 'negative'

    let channel = ''
    let rating
    let upvotes
    if (pk === 'reddit') {
      const slug = place.replace(/[^a-z0-9]+/gi, '').slice(0, 12) || 'local'
      channel = `r/${slug} · discussion`
      upvotes = 24 + (h % 920)
    } else if (pk === 'google') {
      channel = 'Google Maps · local reviews'
      rating = 3 + (h % 3)
    } else if (pk === 'facebook') {
      channel = `Facebook · ${place.split(' ')[0] || 'Neighborhood'} community`
    } else if (pk === 'nextdoor') {
      channel = `Nextdoor · ${place.slice(0, 28)}`
    } else {
      channel = 'TikTok · #neighborhood'
    }

    h = nextHash(h)
    posts.push({
      id: `pv-${i}-${h}`,
      platform: pk,
      channel,
      timeAgo,
      body,
      sentiment,
      rating,
      upvotes,
    })
  }

  return {
    summary: summaryText,
    sentiment: { positive, neutral, negative, label },
    posts,
  }
}

/**
 * Deterministic fake scores so the same address + profile always yields the same "rating".
 * @param {string} address
 * @param {string} lifestyleId
 */
export function buildFakeReport(address, lifestyleId) {
  const normalized = `${address.trim().toLowerCase()}|${lifestyleId}`
  let h = hashString(normalized)

  const scores = []
  const earned = []
  for (let i = 0; i < 7; i += 1) {
    h = (h * 1664525 + 1013904223) >>> 0
    const t = (h % 60) / 10 + 4.0
    const score = Math.min(9.9, Math.max(4.0, Math.round(t * 10) / 10))
    scores.push(score.toFixed(1))
    earned.push(score >= 7.0)
  }

  const avg = scores.reduce((a, s) => a + parseFloat(s), 0) / 7
  const overallScore = Math.min(9.9, Math.max(4.0, Math.round(avg * 10) / 10)).toFixed(1)
  const pointsEarned = earned.filter(Boolean).length
  const vibeText = VIBES[hashString(normalized + 'vibe') % VIBES.length]
  const communityVibe = buildCommunityVibe(normalized, vibeText)

  return {
    scores,
    earned,
    overallScore,
    pointsEarned,
    vibeText,
    communityVibe,
  }
}
