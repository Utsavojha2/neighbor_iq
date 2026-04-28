/**
 * Demo “how we calculated this score” panels per category.
 * Deterministic from address + category name (same inputs → same breakdown).
 */

function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(h) >>> 0
}

function next(h) {
  return (h * 1664525 + 1013904223) >>> 0
}

function clampPct(n) {
  return Math.min(98, Math.max(12, Math.round(n)))
}

/**
 * @param {string} address
 * @param {{ name: string, emoji: string, api: string, score: string, earned: boolean }} row
 */
export function getExplorePanel(address, row) {
  const key = `${address.trim().toLowerCase()}|${row.name}`
  let h = hashString(key)
  const score = parseFloat(row.score) || 0
  const place = address.split(',')[0]?.trim() || address.slice(0, 42)

  const base = {
    category: row.name,
    emoji: row.emoji,
    api: row.api,
    address,
    score: row.score,
    earned: row.earned,
    disclaimer:
      'Illustrative breakdown for this prototype. Scores are simulated; connecting Walk Score, Places, FEMA, etc. will replace these hints.',
  }

  const bar = (label, pct, variant) => ({
    label,
    pct: clampPct(pct),
    variant,
  })

  switch (row.name) {
    case 'Crime safety': {
      h = next(h)
      const inc = 35 + (h % 40)
      h = next(h)
      const vsMetro = 30 + (h % 45)
      h = next(h)
      const night = 25 + (h % 50)
      h = next(h)
      const clearance = 20 + (h % 35)
      return {
        ...base,
        headline: 'How crime safety maps to your score',
        intro: `Weighted blend of incident density, trend vs metro, and night-time signals around ${place}.`,
        bars: [
          bar('Reported incidents (weighted)', inc, inc >= 55 ? 'good' : 'mid'),
          bar('Trend vs metro average', vsMetro, vsMetro >= 45 ? 'good' : 'low'),
          bar('Night / weekend safety signal', night, night >= 45 ? 'good' : 'mid'),
          bar('Resolution / clearance (proxy)', clearance, clearance >= 40 ? 'good' : 'low'),
        ],
        listTitle: 'Demo signals at this pin',
        listItems: [
          {
            title: 'Property incidents per 1k residents (simulated)',
            meta: `${(2.1 + (h % 15) / 10).toFixed(1)} · vs metro ${(1.8 + (h % 12) / 10).toFixed(1)}`,
          },
          {
            title: 'Violent index vs national baseline',
            meta: `${score >= 7 ? 'At or below' : 'Above'} typical for similar tracts (demo)`,
          },
          { title: 'SpotCrime / open-data feeds', meta: 'Not connected in this build' },
        ],
      }
    }
    case 'Amenities': {
      h = next(h)
      const daily = 42 + (h % 38)
      h = next(h)
      const parks = 35 + (h % 45)
      h = next(h)
      const retail = 38 + (h % 42)
      h = next(h)
      const health = 30 + (h % 48)
      return {
        ...base,
        headline: 'How amenities shape this score',
        intro: `Counts and distances to groceries, parks, pharmacies, and retail near ${place}.`,
        bars: [
          bar('Daily needs (grocery, pharmacy)', daily, daily >= 55 ? 'good' : 'mid'),
          bar('Parks & green space access', parks, parks >= 50 ? 'good' : 'low'),
          bar('Retail & services diversity', retail, retail >= 55 ? 'good' : 'mid'),
          bar('Health & fitness within reach', health, health >= 45 ? 'good' : 'low'),
        ],
        listTitle: 'What would show with Google Places',
        listItems: [
          {
            title: 'Grocery / supermarket',
            meta: `${(h % 8) / 10 + 0.2}–${(h % 8) / 10 + 0.9} mi · ${6 + (h % 10)} min walk (est.)`,
          },
          {
            title: 'Park or playground',
            meta: `${((h % 6) / 10 + 0.15).toFixed(1)} mi`,
          },
          {
            title: 'Coffee / café density',
            meta: `${4 + (h % 9)} venues in ~1 mi (demo)`,
          },
        ],
      }
    }
    case 'Transit': {
      h = next(h)
      const walkAccess = 48 + (h % 35)
      h = next(h)
      const bus = 40 + (h % 45)
      h = next(h)
      const rail = 25 + (h % 55)
      h = next(h)
      const bike = 30 + (h % 50)
      const busNum = 12 + (h % 88)
      h = next(h)
      const railLine = ['Blue Line', 'Green Line', 'Red Line', 'BRT / rapid', 'Commuter rail'][
        h % 5
      ]
      h = next(h)
      const bikeStations = 3 + (h % 8)
      return {
        ...base,
        headline: 'How transit options feed this score',
        intro: `Walk access to stops, bus coverage, rail/BRT, and bike share around ${place}.`,
        bars: [
          bar('Walk access to transit', walkAccess, walkAccess >= 55 ? 'good' : 'mid'),
          bar('Bus route coverage', bus, bus >= 50 ? 'good' : 'low'),
          bar('Rail / BRT proximity', rail, rail >= 45 ? 'good' : 'low'),
          bar('Bike share & lanes (proxy)', bike, bike >= 45 ? 'good' : 'low'),
        ],
        listTitle: 'Example transit context (demo)',
        listItems: [
          {
            title: `City bus route ${busNum}`,
            meta: `~${((h % 7) / 10 + 0.15).toFixed(1)} mi · ${7 + (h % 11)} min walk to stop`,
          },
          {
            title: railLine,
            meta:
              rail > 45
                ? `${((h % 9) / 10 + 0.4).toFixed(1)} mi · ${10 + (h % 15)} min walk`
                : 'No heavy rail within typical walk radius (demo)',
          },
          {
            title: 'Bike share docks',
            meta: `${bikeStations} within ~0.5 mi (simulated)`,
          },
          {
            title: 'Walk Score–style index (placeholder)',
            meta: `${58 + (h % 35)} / 100`,
          },
        ],
      }
    }
    case 'Cost': {
      h = next(h)
      const rent = 38 + (h % 45)
      h = next(h)
      const util = 40 + (h % 40)
      h = next(h)
      const tax = 28 + (h % 45)
      h = next(h)
      const goods = 35 + (h % 42)
      return {
        ...base,
        headline: 'How cost of living is reflected',
        intro: `Rent pressure, utilities, taxes, and everyday goods vs metro — all simulated for ${place}.`,
        bars: [
          bar('Housing / rent pressure', rent, rent >= 50 ? 'good' : 'low'),
          bar('Utilities & energy', util, util >= 45 ? 'good' : 'mid'),
          bar('Tax & fee burden (proxy)', tax, tax >= 45 ? 'good' : 'low'),
          bar('Everyday goods index', goods, goods >= 50 ? 'good' : 'mid'),
        ],
        listTitle: 'RentCast-style view (not live)',
        listItems: [
          {
            title: 'Median rent vs metro',
            meta: `${score >= 7 ? 'At or under' : 'Above'} typical for tract (demo)`,
          },
          {
            title: '1BR estimate band',
            meta: `$${1100 + (h % 40) * 45}–$${1400 + (h % 35) * 52}/mo (illustrative)`,
          },
          { title: 'Inflation / COL index', meta: `${98 + (h % 12)} = 100 US avg (fake)` },
        ],
      }
    }
    case 'Community': {
      h = next(h)
      const sent = 45 + (h % 40)
      h = next(h)
      const events = 32 + (h % 48)
      h = next(h)
      const engage = 38 + (h % 45)
      h = next(h)
      const trust = 40 + (h % 42)
      return {
        ...base,
        headline: 'How community sentiment is modeled',
        intro: `Forum tone, local event chatter, and neighbor engagement — aligned with your vibe card for ${place}.`,
        bars: [
          bar('Social & forum sentiment', sent, sent >= 55 ? 'good' : 'mid'),
          bar('Local events & meetups signal', events, events >= 45 ? 'good' : 'low'),
          bar('Neighbor engagement (Nextdoor-style)', engage, engage >= 50 ? 'good' : 'mid'),
          bar('Trust / safety mentions', trust, trust >= 50 ? 'good' : 'low'),
        ],
        listTitle: 'Sources we’d plug in',
        listItems: [
          { title: 'Reddit / local subs', meta: 'Sentiment + thread volume (demo weights)' },
          { title: 'Facebook neighborhood groups', meta: 'Post frequency & tone (placeholder)' },
          { title: 'Claude summarization', meta: 'Rolls signals into one narrative' },
        ],
      }
    }
    case 'Disaster risk': {
      h = next(h)
      const flood = 20 + (h % 55)
      h = next(h)
      const wind = 25 + (h % 50)
      h = next(h)
      const fire = 15 + (h % 45)
      h = next(h)
      const heat = 22 + (h % 48)
      return {
        ...base,
        headline: 'How disaster risk is broken down',
        intro: `FEMA NRI–style hazard layers: flood, wind, wildfire/heat — simulated for ${place}.`,
        bars: [
          bar('Flood exposure', flood, flood >= 45 ? 'good' : 'low'),
          bar('Wind / storm risk', wind, wind >= 45 ? 'good' : 'mid'),
          bar('Wildfire / drought (if relevant)', fire, fire >= 45 ? 'good' : 'low'),
          bar('Extreme heat days (trend)', heat, heat >= 45 ? 'good' : 'low'),
        ],
        listTitle: 'NRI-style notes (demo)',
        listItems: [
          {
            title: 'Expected annual loss (relative)',
            meta: `Lower than ${40 + (h % 45)}% of US tracts (simulated)`,
          },
          {
            title: 'Community resilience factors',
            meta: 'Hospitals, shelters, grid redundancy (not wired)',
          },
        ],
      }
    }
    case 'Nightlife': {
      h = next(h)
      const food = 42 + (h % 40)
      h = next(h)
      const late = 35 + (h % 48)
      h = next(h)
      const variety = 38 + (h % 42)
      h = next(h)
      const quiet = 28 + (h % 45)
      return {
        ...base,
        headline: 'How nightlife & social life score',
        intro: `Food & drink density, late hours, variety, vs noise complaints near ${place}.`,
        bars: [
          bar('Restaurants & bars density', food, food >= 55 ? 'good' : 'mid'),
          bar('Late-night hours availability', late, late >= 45 ? 'good' : 'low'),
          bar('Variety (music, venues)', variety, variety >= 50 ? 'good' : 'mid'),
          bar('Noise / complaint offset', quiet, quiet >= 45 ? 'good' : 'low'),
        ],
        listTitle: 'Yelp-style snapshot (demo)',
        listItems: [
          {
            title: 'Venues open past 10pm',
            meta: `${6 + (h % 14)} within ~1 mi`,
          },
          {
            title: 'Avg. rating (simulated)',
            meta: `${(3.6 + (h % 12) / 10).toFixed(1)} ★ across sample`,
          },
          { title: 'Live music / clubs', meta: `${h % 4} in wider area (fake)` },
        ],
      }
    }
    default:
      return {
        ...base,
        headline: `Breakdown: ${row.name}`,
        intro: `Simulated factor mix for your search near ${place}.`,
        bars: [
          bar('Factor A', 40 + (h % 45), 'mid'),
          bar('Factor B', 35 + (h % 48), 'mid'),
          bar('Factor C', 38 + (h % 42), 'good'),
        ],
        listTitle: 'Details',
        listItems: [{ title: 'API integration', meta: 'Pending for this category' }],
      }
  }
}
