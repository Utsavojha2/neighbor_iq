import { useEffect, useState } from 'react'

const FAQS = [
  { id: 'overall',   q: 'Is this a good fit for me overall?' },
  { id: 'crime',     q: 'Is it safe to live here?' },
  { id: 'transit',   q: 'How easy is it to get around without a car?' },
  { id: 'cost',      q: 'Is it affordable on a student budget?' },
  { id: 'amenities', q: "What's nearby — grocery, pharmacy, restaurants?" },
  { id: 'community', q: "What's the community vibe like?" },
  { id: 'disaster',  q: 'Any natural disaster risks to know about?' },
  { id: 'nightlife', q: "What's the nightlife scene like?" },
]

function scoreLevel(score) {
  const s = parseFloat(score)
  if (s >= 8.0) return 'excellent'
  if (s >= 7.0) return 'good'
  if (s >= 5.5) return 'average'
  return 'below average'
}

function findRow(rows, name) {
  return rows?.find((r) => r.name === name)
}

function getAnswer(id, { rows, overallScore, vibeText, address }) {
  switch (id) {
    case 'overall': {
      const positives = (rows || []).filter((r) => parseFloat(r.score) >= 7.0).map((r) => r.name.toLowerCase())
      const concerns  = (rows || []).filter((r) => parseFloat(r.score) < 5.5).map((r) => r.name.toLowerCase())
      return `${address} scores ${overallScore}/10 overall — ${scoreLevel(overallScore)} for international students. ${positives.length ? `Strong points: ${positives.join(', ')}.` : ''} ${concerns.length ? `Watch out for: ${concerns.join(', ')}.` : 'No major red flags.'}`
    }
    case 'crime': {
      const row = findRow(rows, 'Crime safety')
      if (!row) return 'Crime data is not available for this address.'
      const s = parseFloat(row.score)
      if (s >= 8.0) return `Crime safety is excellent (${row.score}/10). Low reported crime in this area — you should feel comfortable walking during the day and generally at night.`
      if (s >= 7.0) return `Crime safety is good (${row.score}/10). Generally safe with some incidents. Standard precautions apply — stay aware of your surroundings at night.`
      if (s >= 5.5) return `Crime safety is average (${row.score}/10). Some crime presence here. Stay alert at night, keep valuables secure, and know your safe routes.`
      return `Crime safety is below average (${row.score}/10). Elevated crime reports for this area. Research specific streets and weigh this seriously in your decision.`
    }
    case 'transit': {
      const row = findRow(rows, 'Transit')
      if (!row) return 'Transit data is not available.'
      const s = parseFloat(row.score)
      if (s >= 8.0) return `Transit is excellent (${row.score}/10). Great public transport — bus, rail, or both. You won't need a car for daily life here.`
      if (s >= 7.0) return `Transit is good (${row.score}/10). Solid options for most destinations. A car isn't required but would help for weekend trips outside the city.`
      if (s >= 5.5) return `Transit is average (${row.score}/10). Some bus routes exist but service may be infrequent. Budget extra time and check schedules carefully.`
      return `Transit is limited (${row.score}/10). This area is largely car-dependent. Confirm your campus or workplace is reachable by existing routes before committing.`
    }
    case 'cost': {
      const row = findRow(rows, 'Cost')
      if (!row) return 'Cost data is not available.'
      const s = parseFloat(row.score)
      if (s >= 8.0) return `Very affordable (${row.score}/10). Rent and daily expenses are well below average — a strong fit for a student budget.`
      if (s >= 7.0) return `Reasonably priced (${row.score}/10). Rent is manageable. Factor in groceries and transit — should work on a student income.`
      if (s >= 5.5) return `Moderate cost (${row.score}/10). Rent is around market rate. Consider finding roommates to keep monthly costs comfortable.`
      return `Expensive area (${row.score}/10). Rent is above average here. Look at nearby neighborhoods or shared housing to make it work on a student budget.`
    }
    case 'amenities': {
      const row = findRow(rows, 'Amenities')
      if (!row) return 'Amenities data is not available.'
      const s = parseFloat(row.score)
      if (s >= 8.0) return `Amenities are excellent (${row.score}/10). Grocery stores, pharmacies, restaurants, and parks are all close by — very convenient for daily life.`
      if (s >= 7.0) return `Amenities are good (${row.score}/10). Most essentials within reasonable distance — groceries, cafes, and basic services are nearby.`
      if (s >= 5.5) return `Amenities are average (${row.score}/10). Basic necessities are accessible but you may need to travel further for specialty or international grocery stores.`
      return `Amenities are limited (${row.score}/10). Fewer shops and services in walking distance. Plan on delivery or traveling to busier areas for groceries and errands.`
    }
    case 'community': {
      const row = findRow(rows, 'Community')
      if (!row) return vibeText || 'Community data is not available.'
      const s = parseFloat(row.score)
      if (vibeText) return `Community score: ${row.score}/10. ${vibeText}`
      if (s >= 7.0) return `Community feels welcoming (${row.score}/10). Positive resident sentiment online — good for newcomers and international students.`
      if (s >= 5.5) return `Community is mixed (${row.score}/10). Some positive signals but also complaints. Worth visiting in person before deciding.`
      return `Community score is low (${row.score}/10). Residents report concerns online. Visit the area at different times of day and talk to people before signing a lease.`
    }
    case 'disaster': {
      const row = findRow(rows, 'Disaster risk')
      if (!row) return 'Disaster risk data is not available.'
      const s = parseFloat(row.score)
      if (s >= 8.0) return `Disaster risk is low (${row.score}/10). FEMA data shows minimal natural hazard history — floods, earthquakes, and severe weather are uncommon here.`
      if (s >= 6.0) return `Disaster risk is moderate (${row.score}/10). Some natural hazard history in the region. Check flood zone maps for the specific property before signing.`
      return `Disaster risk is elevated (${row.score}/10). This region has a history of natural hazard declarations. Ask your landlord about flood insurance and check FEMA flood maps.`
    }
    case 'nightlife': {
      const row = findRow(rows, 'Nightlife')
      if (!row) return 'Nightlife data is not available.'
      const s = parseFloat(row.score)
      if (s >= 8.0) return `Nightlife is vibrant (${row.score}/10). Plenty of bars, venues, and social spots nearby — great if you want an active social scene.`
      if (s >= 6.0) return `Nightlife is decent (${row.score}/10). Some bars and restaurants to socialize at. A good balance for students who want options without the noise.`
      return `Nightlife is quiet (${row.score}/10). Calm, residential area. Great for studying and sleeping — not ideal if you're looking for a buzzing social scene.`
    }
    default:
      return 'No information available.'
  }
}

export function NeighborhoodChat({
  open,
  onClose,
  address,
  overallScore,
  rows,
  vibeText,
}) {
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setOpenId(null)
  }, [open])

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id))

  return (
    <>
      <div
        className={`nchat-backdrop ${open ? 'nchat-backdrop-open' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`nchat-drawer ${open ? 'nchat-drawer-open' : ''}`}
        aria-hidden={!open}
        aria-label="Neighborhood FAQ"
      >
        <header className="nchat-header">
          <div>
            <p className="nchat-eyebrow">Neighborhood FAQ</p>
            <h2 className="nchat-title">{address}</h2>
          </div>
          <button
            type="button"
            className="nchat-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="nchat-body">
          <p className="nchat-intro-text">
            Mostly asked questions about this neighborhood.
          </p>
          <div className="nchat-faq-list">
            {FAQS.map((faq) => {
              const isOpen = openId === faq.id
              return (
                <div key={faq.id} className={`nchat-faq-item ${isOpen ? 'nchat-faq-item-open' : ''}`}>
                  <button
                    type="button"
                    className="nchat-faq-q"
                    onClick={() => toggle(faq.id)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="nchat-faq-arrow" aria-hidden>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <p className="nchat-faq-a">
                      {getAnswer(faq.id, { rows, overallScore, vibeText, address })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}
