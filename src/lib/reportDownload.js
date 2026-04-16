function escapeHtml(text) {
  const s = String(text)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @param {{
 *   address: string
 *   profileLabel: string
 *   overallScore: string
 *   pointsEarned: number
 *   rows: ({ kind?: 'score', emoji: string, name: string, api: string, score: string, earned: boolean } | { kind: 'news' } | { kind: 'crimes' })[]
 *   vibeText: string
 *   communityVibe?: null | {
 *     summary: string
 *     sentiment: { positive: number, neutral: number, negative: number, label: string }
 *     posts: { id: string, platform: string, channel: string, timeAgo: string, body: string, sentiment: string, rating?: number, upvotes?: number }[]
 *   }
 *   mapImageDataUrl?: string | null
 *   localFeed?: null | {
 *     ok?: boolean
 *     geo?: { displayName?: string; lat?: number; lon?: number } | null
 *     news?: { title: string, url: string, source?: string, publishedAt?: string }[]
 *     crimes?: { title: string, date?: string, category?: string, source?: string, isDemo?: boolean }[]
 *     newsSource?: string | null
 *     newsGeo?: { scope?: string, radiusMiles?: number | null, note?: string | null }
 *     crimeSource?: string | null
 *     message?: string
 *   }
 * }} data
 */
export function buildReportHtml(data) {
  const {
    address,
    profileLabel,
    overallScore,
    pointsEarned,
    rows,
    vibeText,
    communityVibe,
    localFeed,
    mapImageDataUrl,
  } = data
  const generated = new Date().toLocaleString()

  const safeMapUrl =
    typeof mapImageDataUrl === 'string' && /^data:image\/(png|jpe?g);base64,/i.test(mapImageDataUrl)
  const mapBlock = safeMapUrl
    ? `<div style="margin:18px 0 8px;">
  <img src="${mapImageDataUrl}" alt="Map near searched address" width="420" style="width:100%;max-width:420px;height:auto;display:block;border-radius:12px;border:1px solid #e2e8f0;object-fit:cover" />
  <p class="meta" style="margin-top:10px;margin-bottom:0;font-size:11px;line-height:1.45;">© OpenStreetMap contributors · Approximate location from your search (not parcel-accurate).</p>
</div>`
    : ''

  const scoreRows = rows.filter((r) => r.kind !== 'news' && r.kind !== 'crimes')
  const rowsHtml = scoreRows
    .map(
      (r) => `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(r.emoji)} ${escapeHtml(r.name)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:${r.earned ? '#1D9E75' : '#D85A30'};">${escapeHtml(r.score)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#5a6a7a;">${escapeHtml(r.api)}</td>
</tr>`,
    )
    .join('\n')

  let localHtml = ''
  if (localFeed) {
    const geoLine = localFeed.geo?.displayName
      ? `<p class="meta">${escapeHtml(localFeed.geo.displayName)}</p>`
      : ''
    const newsSrc =
      localFeed.newsSource === 'newsapi'
        ? 'NewsAPI'
        : localFeed.newsSource === 'gdelt'
          ? 'GDELT'
          : 'News'
    const newsItems = (localFeed.news || [])
      .map((n) => {
        const line = `${escapeHtml(n.title)} — ${escapeHtml(n.source || '')}${n.publishedAt ? ` (${escapeHtml(n.publishedAt)})` : ''}`
        if (n.url) {
          return `<li style="margin:6px 0;"><a href="${escapeHtml(n.url)}">${line}</a></li>`
        }
        return `<li style="margin:6px 0;">${line}</li>`
      })
      .join('')
    const crimeNote =
      localFeed.crimeSource === 'demo'
        ? '<p class="meta" style="margin-top:8px;">Incidents below are <strong>demo</strong> placeholders, not live police data.</p>'
        : ''
    const crimeItems = (localFeed.crimes || [])
      .map(
        (c) =>
          `<li style="margin:6px 0;">${escapeHtml(c.title)}${c.category ? ` <span style="color:#5a6a7a;">(${escapeHtml(c.category)})</span>` : ''}${c.date ? ` — ${escapeHtml(c.date)}` : ''}${c.source ? ` · ${escapeHtml(c.source)}` : ''}</li>`,
      )
      .join('')
    const newsScopeNote = localFeed.newsGeo?.note
      ? `<p class="meta" style="font-size:12px;">${escapeHtml(localFeed.newsGeo.note)}</p>`
      : ''
    localHtml = `
  <h2 style="font-size:14px;margin-top:28px;color:#1D9E75;">Local context (~90 days)</h2>
  ${geoLine}
  ${localFeed.ok === false && localFeed.message ? `<p class="meta">${escapeHtml(localFeed.message)}</p>` : ''}
  ${localFeed.ok !== false && newsItems ? `<h3 style="font-size:13px;margin-top:16px;color:#0F1923;">Recent news · ${escapeHtml(newsSrc)}</h3>${newsScopeNote}<ul style="margin:8px 0 0 18px;padding:0;">${newsItems}</ul>` : ''}
  ${localFeed.ok !== false && !newsItems && localFeed.ok === true ? '<p class="meta">No news articles in export snapshot.</p>' : ''}
  ${crimeItems ? `${crimeNote}<h3 style="font-size:13px;margin-top:16px;color:#0F1923;">Recent safety / incidents</h3><ul style="margin:8px 0 0 18px;padding:0;">${crimeItems}</ul>` : ''}
`
  }

  let vibeSection = `<h2 style="font-size:14px;margin-top:28px;color:#1D9E75;">Community vibe</h2>
  <div class="vibe">${escapeHtml(vibeText)}</div>`
  if (communityVibe?.sentiment && communityVibe.posts?.length) {
    const s = communityVibe.sentiment
    const platTitle = {
      reddit: 'Reddit',
      google: 'Google Maps',
      facebook: 'Facebook',
      nextdoor: 'Nextdoor',
      tiktok: 'TikTok',
    }
    const postsBlock = communityVibe.posts
      .map(
        (p) => `<div style="margin:12px 0;padding:14px 16px;border:1px solid #e2e8f0;border-radius:12px;background:#fafbfc;">
  <div style="font-size:11px;font-weight:600;color:#1D9E75;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(platTitle[p.platform] || p.platform)}</div>
  <div style="font-size:12px;color:#5a6a7a;margin-top:4px;">${escapeHtml(p.channel)} · ${escapeHtml(p.timeAgo)}</div>
  <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#0F1923;">${escapeHtml(p.body)}</p>
</div>`,
      )
      .join('\n')
    vibeSection = `<h2 style="font-size:14px;margin-top:28px;color:#1D9E75;">Community vibe</h2>
  <p class="meta" style="margin-bottom:12px;">Demo social listening (Reddit, Google Maps, Facebook, Nextdoor, TikTok-style) — not live fetches.</p>
  <p class="meta" style="margin-bottom:8px;"><strong>Sentiment mix:</strong> 😊 ${s.positive}% · 😐 ${s.neutral}% · 😟 ${s.negative}% — ${escapeHtml(s.label)}</p>
  <div class="vibe">${escapeHtml(communityVibe.summary)}</div>
  <h3 style="font-size:13px;margin-top:20px;color:#0F1923;">Sample posts</h3>
  ${postsBlock}`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>NeighborIQ Report — ${escapeHtml(address)}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #0F1923; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; }
  .meta { color: #5a6a7a; font-size: 14px; margin-bottom: 24px; }
  .score { font-size: 2.5rem; font-weight: 700; color: #1D9E75; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #5a6a7a; }
  .vibe { background: #f8faf9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; line-height: 1.65; color: #5a6a7a; margin-top: 24px; }
  .foot { margin-top: 32px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <h1>NeighborIQ neighborhood report</h1>
  <p class="meta">${escapeHtml(address)}<br/>Profile: ${escapeHtml(profileLabel)} · Generated ${escapeHtml(generated)}</p>
  ${mapBlock}
  <div class="score">Overall ${escapeHtml(overallScore)}<span style="font-size:1rem;color:#5a6a7a;font-weight:500;"> /10</span></div>
  <p class="meta">${pointsEarned} of 7 dimensions scored ≥ 7.0 (demo methodology)</p>
  <table>
    <thead><tr>
      <th>Category</th><th>Score</th><th>Source</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  ${vibeSection}
  ${localHtml}
  <p class="foot">NeighborIQ · Clark University Tech Innovation Challenge · Subscription export</p>
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
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-neighboriq-pdf-root', 'true')
  // Must stay in normal flow (no position:fixed off-screen). html2pdf clones this node into
  // an internal container; fixed + negative left places content outside the capture rect → blank PDF.
  wrapper.style.cssText =
    'position:relative;left:auto;top:auto;width:720px;max-width:100%;background:#fff;padding:32px 28px;box-sizing:border-box;color:#0f1923'

  const headStyle = parsed.querySelector('head style')
  if (headStyle?.textContent) {
    const style = document.createElement('style')
    style.textContent = headStyle.textContent
    wrapper.appendChild(style)
  }

  while (parsed.body.firstChild) {
    wrapper.appendChild(parsed.body.firstChild)
  }

  await Promise.all(
    [...wrapper.querySelectorAll('img')].map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          window.setTimeout(done, 12000)
        }),
    ),
  )

  await html2pdf()
    .set({
      margin: [12, 12, 14, 12],
      filename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .from(wrapper)
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
export async function fetchMapPreviewDataUrl(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  try {
    const r = await fetch(
      `/api/map-preview?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&w=480&h=220&zoom=16`,
    )
    if (!r.ok) return null
    const blob = await r.blob()
    if (!blob.type.startsWith('image/')) return null
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
