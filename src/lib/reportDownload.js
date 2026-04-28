function escapeHtml(text) {
  const s = String(text)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildReportHtml(data) {
  const { address, profileLabel, overallScore, pointsEarned, rows, communityVibe, alternatives, mapImageDataUrl, rentData, restaurantData } = data
  const generated = new Date().toLocaleString()

  const scoreRows = rows.filter((r) => r.kind !== 'news' && r.kind !== 'crimes')
  const scoreNums = scoreRows.map((r) => Math.min(10, Math.max(0, parseFloat(r.score) || 0)))

  // ── Score ring SVG ────────────────────────────────────────────────────────
  const RING_R = 44
  const RING_C = 2 * Math.PI * RING_R
  const scoreNum = Math.min(10, Math.max(0, parseFloat(overallScore) || 0))
  const ringOffset = RING_C * (1 - scoreNum / 10)
  const ringStroke = scoreNum >= 7 ? '#1D9E75' : scoreNum >= 5 ? '#E8A444' : '#D85A30'

  const ringSvg = `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="${RING_R}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="9"/>
    <circle cx="60" cy="60" r="${RING_R}" fill="none" stroke="${ringStroke}" stroke-width="9"
      stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${ringOffset.toFixed(2)}"
      transform="rotate(-90 60 60)" stroke-linecap="round"/>
    <text x="60" y="56" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="24" font-weight="700" fill="#ffffff">${scoreNum.toFixed(1)}</text>
    <text x="60" y="74" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="10" fill="#64748b">/10</text>
  </svg>`

  // ── Radar chart SVG ───────────────────────────────────────────────────────
  const cx = 100, cy = 100, maxR = 76
  const n = scoreNums.length
  const angles = Array.from({ length: n }, (_, i) => (2 * Math.PI * i / n) - Math.PI / 2)

  const gridPolygons = [0.33, 0.66, 1.0].map((lv) => {
    const pts = angles.map((a) => `${(cx + Math.cos(a) * maxR * lv).toFixed(1)},${(cy + Math.sin(a) * maxR * lv).toFixed(1)}`).join(' ')
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`
  }).join('')

  const axisLines = angles.map((a) =>
    `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * maxR).toFixed(1)}" y2="${(cy + Math.sin(a) * maxR).toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`
  ).join('')

  const scorePts = scoreNums.map((s, i) => {
    const ratio = s / 10
    return `${(cx + Math.cos(angles[i]) * maxR * ratio).toFixed(1)},${(cy + Math.sin(angles[i]) * maxR * ratio).toFixed(1)}`
  }).join(' ')

  const radarLabels = scoreRows.map((r, i) => {
    const lx = (cx + Math.cos(angles[i]) * (maxR + 22)).toFixed(1)
    const ly = (cy + Math.sin(angles[i]) * (maxR + 22)).toFixed(1)
    return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI,sans-serif" font-size="9" fill="#64748b">${escapeHtml(r.name)}</text>`
  }).join('')

  const radarSvg = `<svg width="200" height="200" viewBox="-28 -28 256 256" xmlns="http://www.w3.org/2000/svg">
    ${gridPolygons}${axisLines}
    <polygon points="${scorePts}" fill="rgba(29,158,117,0.18)" stroke="#1D9E75" stroke-width="1.5"/>
    ${radarLabels}
  </svg>`

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagList = []
  const crimeScore   = parseFloat(scoreRows.find((r) => r.name.toLowerCase().includes('crime'))?.score) || 0
  const transitScore = parseFloat(scoreRows.find((r) => r.name.toLowerCase().includes('transit'))?.score) || 0
  const commScore    = parseFloat(scoreRows.find((r) => r.name.toLowerCase().includes('community'))?.score) || 0
  const nightScore   = parseFloat(scoreRows.find((r) => r.name.toLowerCase().includes('nightlife'))?.score) || 0
  if (transitScore >= 7.5) tagList.push('walk-friendly')
  else if (transitScore >= 5) tagList.push('moderate transit')
  else tagList.push('car-dependent')
  if (crimeScore >= 7.5) tagList.push('low crime')
  else if (crimeScore >= 5) tagList.push('mid crime risk')
  else tagList.push('higher crime area')
  if (commScore >= 7) tagList.push('active community')
  else if (commScore >= 4) tagList.push('mixed community')
  else tagList.push('quiet community')
  if (nightScore >= 7.5) tagList.push('vibrant nightlife')

  const pill = (text, extra = '') =>
    `<span style="display:inline-table;font-size:11px;padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);color:#94a3b8;margin:0 6px 6px 0;text-align:center;${extra}">${text}</span>`

  const tagsHtml = tagList.map((t) => pill(escapeHtml(t))).join('')

  // ── Address ───────────────────────────────────────────────────────────────
  const commaIdx = address.indexOf(',')
  const streetPart = commaIdx > 0 ? address.slice(0, commaIdx) : address
  const cityPart   = commaIdx > 0 ? address.slice(commaIdx + 2) : ''

  // ── Score bars ────────────────────────────────────────────────────────────
  const barsHtml = scoreRows.map((r) => {
    const s = parseFloat(r.score) || 0
    const color = s >= 7 ? '#1D9E75' : s >= 5 ? '#E8A444' : '#D85A30'
    const pct = Math.min(100, s * 10).toFixed(1)
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <div style="width:105px;flex-shrink:0;">
        <div style="font-size:12px;font-weight:500;color:#e2e8f0;line-height:1.3;">${escapeHtml(r.name)}</div>
        <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-top:1px;">${escapeHtml(r.api)}</div>
      </div>
      <div style="flex:1;height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <div style="width:28px;text-align:right;font-size:13px;font-weight:700;color:${color};">${escapeHtml(r.score)}</div>
    </div>`
  }).join('\n')

  // ── Community vibe ────────────────────────────────────────────────────────
  const platTitle = { reddit: 'Reddit', google: 'Google Maps', facebook: 'Facebook', nextdoor: 'Nextdoor', tiktok: 'TikTok' }
  let vibeInner = ''
  if (communityVibe?.sentiment && communityVibe.posts?.length) {
    const s = communityVibe.sentiment
    const postsHtml = communityVibe.posts.map((p) => {
      const sc = p.sentiment === 'positive' ? '#1D9E75' : p.sentiment === 'negative' ? '#D85A30' : '#E8A444'
      return `<div style="background:#0d1824;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#1D9E75;">${escapeHtml(platTitle[p.platform] || p.platform)}</span>
          <span style="font-size:11px;color:#475569;">${escapeHtml(p.channel)}</span>
          <span style="font-size:11px;color:#475569;margin-left:auto;">${escapeHtml(p.timeAgo)}</span>
          <span style="display:inline-table;font-size:10px;font-weight:600;padding:5px 10px;border-radius:20px;background:${sc}22;color:${sc};text-align:center;">${escapeHtml(p.sentiment)}</span>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.55;color:#cbd5e1;">${escapeHtml(p.body)}</p>
      </div>`
    }).join('\n')

    vibeInner = `
      <p style="font-size:11px;color:#475569;margin:0 0 10px;">Reddit · Google Maps · Facebook · Nextdoor</p>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div style="flex:1;height:6px;border-radius:3px;overflow:hidden;display:flex;">
          <div style="width:${s.positive}%;background:#1D9E75;"></div>
          <div style="width:${s.neutral}%;background:#E8A444;"></div>
          <div style="width:${s.negative}%;background:#D85A30;"></div>
        </div>
        <span style="font-size:12px;color:#94a3b8;font-weight:500;white-space:nowrap;">${escapeHtml(s.label)}</span>
      </div>
      <div style="display:flex;gap:14px;margin-bottom:14px;">
        <span style="font-size:11px;color:#94a3b8;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1D9E75;margin-right:4px;vertical-align:middle;"></span>positive ${s.positive}%</span>
        <span style="font-size:11px;color:#94a3b8;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8A444;margin-right:4px;vertical-align:middle;"></span>neutral ${s.neutral}%</span>
        <span style="font-size:11px;color:#94a3b8;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#D85A30;margin-right:4px;vertical-align:middle;"></span>negative ${s.negative}%</span>
      </div>
      ${communityVibe.summary ? `<p style="font-size:13px;line-height:1.65;color:#94a3b8;margin:0 0 14px;">${escapeHtml(communityVibe.summary)}</p>` : ''}
      ${postsHtml}`
  } else {
    vibeInner = communityVibe?.summary
      ? `<p style="font-size:13px;line-height:1.65;color:#94a3b8;margin:0;">${escapeHtml(communityVibe.summary)}</p>`
      : ''
  }

  // ── Map block ─────────────────────────────────────────────────────────────
  const safeMapUrl = typeof mapImageDataUrl === 'string' && /^data:image\/(png|jpe?g);base64,/i.test(mapImageDataUrl)
  const mapBlock = safeMapUrl
    ? `<div style="margin-bottom:14px;">
        <img src="${mapImageDataUrl}" alt="Map" style="width:100%;height:180px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,0.07);display:block;"/>
        <p style="font-size:10px;color:#1e3040;margin:5px 0 0;">© OpenStreetMap contributors · Approximate location</p>
      </div>`
    : ''

  // ── Alternatives ──────────────────────────────────────────────────────────
  const REASON_LABEL = {
    safer:   { label: 'Safer area',        color: '#1D9E75' },
    cheaper: { label: 'More affordable',   color: '#60a5fa' },
    transit: { label: 'Better transit',    color: '#a78bfa' },
    amenities: { label: 'More amenities',  color: '#f59e0b' },
  }

  const alternativesBlock = Array.isArray(alternatives) && alternatives.length
    ? `<div style="background:#13202e;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:22px;margin-bottom:14px;">
        <div style="font-size:15px;font-weight:600;color:#ffffff;margin-bottom:4px;">Nearby alternatives</div>
        <div style="font-size:11px;color:#475569;margin-bottom:16px;">Other neighborhoods worth considering</div>
        ${alternatives.map((alt) => {
          const tag = REASON_LABEL[alt.reason] || { label: alt.reason, color: '#94a3b8' }
          const altScores = alt.scores
            ? Object.entries(alt.scores).map(([k, v]) => {
                const c = v >= 7 ? '#1D9E75' : v >= 5 ? '#E8A444' : '#D85A30'
                return `<span style="font-size:11px;color:${c};margin-right:10px;">${escapeHtml(k)} <strong>${v}</strong></span>`
              }).join('')
            : ''
          return `<div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <div style="margin-bottom:5px;">
                <span style="font-size:13px;font-weight:600;color:#e2e8f0;vertical-align:middle;">${escapeHtml(alt.name)}</span>
                <span style="display:inline-table;font-size:10px;font-weight:600;padding:5px 10px;border-radius:20px;background:${tag.color}22;color:${tag.color};margin-left:8px;text-align:center;">${escapeHtml(tag.label)}</span>
              </div>
              ${alt.highlight ? `<div style="font-size:12px;color:#64748b;margin-bottom:5px;">${escapeHtml(alt.highlight)}</div>` : ''}
              <div>${altScores}</div>
          </div>`
        }).join('')}
      </div>`
    : ''

  const card = 'background:#13202e;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:22px;margin-bottom:14px;'

  // ── Rent estimate + comparables block ─────────────────────────────────────
  let rentBlock = ''
  if (rentData?.rent != null) {
    const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—'
    const low = rentData.rentRangeLow
    const high = rentData.rentRangeHigh
    const rent = rentData.rent

    // Bar fill position: where does the midpoint sit between low and high?
    const range = (high != null && low != null && high > low) ? high - low : 1
    const midPct = low != null ? Math.round(((rent - low) / range) * 100) : 50

    const rentEstimateHtml = `
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:180px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#1D9E75;margin-bottom:6px;">Estimated Monthly Rent</div>
          <div style="font-size:40px;font-weight:700;color:#ffffff;line-height:1;margin-bottom:4px;">${fmt(rent)}</div>
          ${low != null && high != null ? `
          <div style="margin-top:28px;">
            <div style="position:relative;height:6px;border-radius:3px;background:linear-gradient(to right,#1D9E75,#60a5fa);overflow:hidden;margin-bottom:8px;">
              <div style="position:absolute;left:${midPct}%;top:-3px;width:2px;height:12px;background:#fff;border-radius:1px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <div>
                <div style="font-size:10px;color:#475569;margin-bottom:2px;">Low Estimate</div>
                <div style="font-size:14px;font-weight:600;color:#1D9E75;">${fmt(low)}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:10px;color:#475569;margin-bottom:2px;">High Estimate</div>
                <div style="font-size:14px;font-weight:600;color:#60a5fa;">${fmt(high)}</div>
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>`

    const comps = rentData.comparables ?? []
    const comparablesHtml = comps.length > 0 ? `
      <div style="margin-top:4px;">
        <div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:4px;">Comparable Listings</div>
        <div style="font-size:11px;color:#475569;margin-bottom:12px;">Nearby rentals used to estimate your price range</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
              <th style="text-align:left;padding:0 8px 8px 0;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Address</th>
              <th style="text-align:center;padding:0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Beds</th>
              <th style="text-align:center;padding:0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Baths</th>
              <th style="text-align:center;padding:0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Sq.ft</th>
              <th style="text-align:right;padding:0 0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Listed Rent</th>
            </tr>
          </thead>
          <tbody>
            ${comps.slice(0, 6).map((c, idx) => {
              const listedRent = c.price ?? c.rent ?? c.listedRent ?? c.rentAmount ?? null
              return `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.04);${idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : ''}">
                <td style="padding:9px 8px 9px 0;color:#e2e8f0;line-height:1.3;">
                  <div style="font-weight:500;">${escapeHtml(c.addressLine1 ?? c.formattedAddress ?? '—')}</div>
                  ${c.addressLine2 ? `<div style="font-size:10px;color:#475569;">${escapeHtml(c.addressLine2)}</div>` : ''}
                  <div style="font-size:10px;color:#475569;">${escapeHtml(c.city ?? '')}${c.state ? `, ${escapeHtml(c.state)}` : ''} ${escapeHtml(c.zipCode ?? '')}</div>
                </td>
                <td style="text-align:center;padding:9px 8px;color:#94a3b8;">${c.bedrooms ?? '—'}</td>
                <td style="text-align:center;padding:9px 8px;color:#94a3b8;">${c.bathrooms ?? '—'}</td>
                <td style="text-align:center;padding:9px 8px;color:#94a3b8;">${c.squareFootage != null ? Number(c.squareFootage).toLocaleString() : '—'}</td>
                <td style="text-align:right;padding:9px 0 9px 8px;color:${listedRent != null ? '#1D9E75' : '#334155'};font-weight:600;">${listedRent != null ? fmt(listedRent) : '—'}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
        <div style="font-size:10px;color:#334155;margin-top:8px;">Source: RentCast · Data reflects recent comparable rentals within the area</div>
      </div>` : ''

    rentBlock = `<div style="${card}">
      <div style="font-size:15px;font-weight:600;color:#ffffff;margin-bottom:16px;">Rent Estimate</div>
      ${rentEstimateHtml}
      ${comparablesHtml}
    </div>`
  }

  // ── Nearby restaurants block ───────────────────────────────────────────────
  let restaurantBlock = ''
  if (Array.isArray(restaurantData) && restaurantData.length > 0) {
    const stars = (rating) => {
      if (rating == null) return '—'
      const full = Math.round(rating)
      return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full)) + `  ${rating.toFixed(1)}`
    }
    const priceLabel = (level) => {
      if (level == null) return '—'
      return '$'.repeat(level)
    }

    const rows = restaurantData.slice(0, 8).map((r, idx) => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);${idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : ''}">
        <td style="padding:10px 8px 10px 0;color:#e2e8f0;line-height:1.4;">
          <div style="font-weight:600;font-size:13px;">${escapeHtml(r.name ?? '—')}</div>
          ${r.cuisine || r.types ? `<div style="font-size:10px;color:#475569;margin-top:2px;">${escapeHtml(r.cuisine ?? (r.types ?? []).join(', '))}</div>` : ''}
        </td>
        <td style="text-align:center;padding:10px 8px;color:#f59e0b;font-size:12px;white-space:nowrap;">${stars(r.rating)}</td>
        <td style="text-align:center;padding:10px 8px;color:#94a3b8;font-size:13px;">${priceLabel(r.priceLevel ?? r.price_level)}</td>
        <td style="text-align:right;padding:10px 0 10px 8px;color:#64748b;font-size:12px;white-space:nowrap;">${escapeHtml(r.distance ?? r.vicinity ?? '')}</td>
      </tr>`).join('')

    restaurantBlock = `<div style="${card}">
      <div style="font-size:15px;font-weight:600;color:#ffffff;margin-bottom:4px;">Nearby Restaurants</div>
      <div style="font-size:11px;color:#475569;margin-bottom:16px;">Dining options within walking distance</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <th style="text-align:left;padding:0 8px 8px 0;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Name</th>
            <th style="text-align:center;padding:0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Rating</th>
            <th style="text-align:center;padding:0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Price</th>
            <th style="text-align:right;padding:0 0 8px 8px;color:#475569;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Distance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="font-size:10px;color:#334155;margin-top:8px;">Source: Google Places · Restaurants within ~1 mile of the address</div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>NeighborIQ Report — ${escapeHtml(address)}</title>
<style>* { box-sizing: border-box; margin: 0; padding: 0; }</style>
</head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;background:#0F1923;color:#e2e8f0;max-width:760px;margin:0 auto;padding:28px 24px 40px;">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
    <div style="font-size:14px;color:#64748b;">neighbor<span style="color:#1D9E75;font-weight:600;">IQ</span> · neighborhood report</div>
    <div style="font-size:11px;color:#475569;">Generated ${escapeHtml(generated)}</div>
  </div>

  ${mapBlock}

  <!-- Hero -->
  <div style="${card}">
    <div style="display:flex;gap:20px;align-items:center;">
      <div style="flex-shrink:0;">${ringSvg}</div>
      <div style="flex:1;">
        <div style="display:inline-table;background:rgba(29,158,117,0.15);color:#1D9E75;font-size:11px;font-weight:600;padding:6px 14px;border-radius:20px;margin-bottom:10px;text-align:center;">For: ${escapeHtml(profileLabel)}</div>
        <div style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.15;margin-bottom:3px;">${escapeHtml(streetPart)}</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:12px;">${escapeHtml(cityPart)}</div>
        <div>${tagsHtml}</div>
      </div>
    </div>
  </div>

  <!-- Score breakdown -->
  <div style="${card}">
    <div style="margin-bottom:16px;">
      <div style="font-size:15px;font-weight:600;color:#ffffff;">Score breakdown</div>
    </div>
    <div style="display:flex;gap:16px;align-items:flex-start;">
      <div style="flex-shrink:0;">${radarSvg}</div>
      <div style="flex:1;padding-top:10px;">${barsHtml}</div>
    </div>
  </div>

  ${alternativesBlock}

  ${rentBlock}

  ${restaurantBlock}

  <!-- Community vibe -->
  <div style="${card}">
    <div style="font-size:15px;font-weight:600;color:#ffffff;margin-bottom:14px;">Community vibe</div>
    ${vibeInner}
  </div>


</body>
</html>`
}

/**
 * Renders the same document as {@link buildReportHtml} into a downloadable PDF (client-side).
 * @param {string} filename e.g. neighboriq-report-boston.pdf
 * @param {string} html full HTML document from buildReportHtml
 * @returns {Promise<void>}
 */
export async function downloadReportPdf(filename, html) {
  const { default: html2pdf } = await import('html2pdf.js')

  // Extract just the body content — html2pdf inserts it into the live DOM itself
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const bodyHtml = parsed.body.innerHTML

  await html2pdf()
    .set({
      margin: [12, 12, 14, 12],
      filename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .from(bodyHtml, 'string')
    .save()
}

export function slugifyFilenamePart(text) {
  return String(text)
    .slice(0, 48)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'report'
}

/**
 * Fetches the same-origin map preview PNG for PDF/report embedding.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string | null>} data URL or null if unavailable
 */
export async function fetchMapPreviewDataUrl(_lat, _lon) {
  return null
}
