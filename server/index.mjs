import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'
import sharp from 'sharp'
import { registerAuth } from './auth.mjs'
import { isLikelyGoogleWebClientId } from './googleClientIdFormat.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const envPath = path.join(rootDir, '.env')
const envLocalPath = path.join(rootDir, '.env.local')

dotenv.config({ path: envPath })
dotenv.config({ path: envLocalPath, override: true })

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10) || 3001
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')
const STRIPE_PRICE_ID = (process.env.STRIPE_PRICE_ID || '').trim()

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim() || ''
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim()
const SESSION_SECRET = (process.env.SESSION_SECRET || '').trim()

function stripeCheckoutReady() {
  return Boolean(stripe && STRIPE_PRICE_ID)
}
const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT ||
  'NeighborIQ/1.0 (college project; set NOMINATIM_USER_AGENT in .env with your contact)'

/** https://operations.osmfoundation.org/policies/tiles/ — identify the app in requests. */
const OSM_TILE_UA = process.env.OSM_TILE_USER_AGENT || NOMINATIM_UA

function latLonToFloatTile(lat, lon, z) {
  const n = 2 ** z
  const x = ((lon + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { fx: x, fy: y }
}

async function fetchOsmTile(z, x, y) {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  const r = await fetch(url, { headers: { 'User-Agent': OSM_TILE_UA } })
  if (!r.ok) {
    throw new Error(`tile ${z}/${x}/${y}: HTTP ${r.status}`)
  }
  return Buffer.from(await r.arrayBuffer())
}

function pickCity(addr) {
  if (!addr || typeof addr !== 'object') return ''
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.city_district ||
    ''
  )
}

/** When Nominatim omits structured city/state, infer from display_name (US-style). */
function cityStateFromDisplayName(displayName) {
  if (!displayName) return { city: '', state: '' }
  const parts = displayName.split(',').map((s) => s.trim()).filter(Boolean)
  const iUS = parts.lastIndexOf('United States')
  const p = iUS >= 0 ? parts.slice(0, iUS) : parts
  if (p.length < 2) return { city: '', state: '' }
  let end = p.length - 1
  if (/^\d{5}(-\d{4})?$/.test(p[end])) end -= 1
  const state = p[end] || ''
  end -= 1
  if (end < 0) return { city: '', state }
  let city = p[end] || ''
  if (city.endsWith('County')) {
    end -= 1
    city = (end >= 0 && p[end]) || city
  }
  return { city, state }
}

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function daysAgoISO(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function formatGdeltDate(seen) {
  const s = String(seen || '')
  if (s.length < 8) return ''
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

/** Target radius for local news (GDELT “near”; NewsAPI note only). Clamped to 2–5 miles. */
function clampRadiusMiles(raw) {
  const n = Number.parseFloat(String(raw ?? '3'), 10)
  if (!Number.isFinite(n)) return 3
  return Math.min(5, Math.max(2, Math.round(n * 10) / 10))
}

async function geocodeAddress(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'us')
  const res = await fetch(url, {
    headers: { 'User-Agent': NOMINATIM_UA },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null
  const r = data[0]
  const addr = r.address || {}
  const parsed = cityStateFromDisplayName(r.display_name)
  const city = pickCity(addr) || parsed.city
  const state = addr.state || addr.region || parsed.state
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    city,
    state,
    county: addr.county || '',
    neighbourhood: addr.neighbourhood || addr.suburb || '',
  }
}

async function fetchNewsNewsApi(geo, apiKey) {
  const miles = clampRadiusMiles(process.env.NEWS_RADIUS_MILES)
  const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const q =
    [geo.neighbourhood, geo.city, geo.state].filter(Boolean).join(' ').trim() ||
    [geo.city, geo.state].filter(Boolean).join(' ').trim() ||
    'United States'
  const url = new URL('https://newsapi.org/v2/everything')
  url.searchParams.set('q', q)
  url.searchParams.set('from', from)
  url.searchParams.set('sortBy', 'publishedAt')
  url.searchParams.set('language', 'en')
  url.searchParams.set('pageSize', '12')
  url.searchParams.set('apiKey', apiKey)
  const res = await fetch(url)
  if (!res.ok) {
    return {
      articles: [],
      newsGeo: {
        scope: 'newsapi_error',
        radiusMiles: null,
        note: 'NewsAPI request failed; check your API key and quota.',
      },
    }
  }
  const j = await res.json()
  const articles = j.articles || []
  const mapped = articles
    .filter((a) => a?.url)
    .map((a) => ({
      title: a.title || 'Article',
      url: a.url,
      source: a.source?.name || 'News',
      publishedAt: a.publishedAt || '',
      description: a.description || '',
    }))
    .slice(0, 12)
  const finite = Number.isFinite(geo.lat) && Number.isFinite(geo.lon)
  return {
    articles: mapped,
    newsGeo: {
      scope: finite ? 'newsapi_keywords' : 'newsapi_metro',
      radiusMiles: finite ? miles : null,
      note: finite
        ? `NewsAPI does not support a map radius; results use place keywords (neighborhood/city) as a local proxy (~${miles} mi intent, not exact distance).`
        : 'Metro keyword search (no coordinates for tighter scope).',
    },
  }
}

async function fetchNewsGdeltOnce(query, max = 8) {
  const u = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
  u.searchParams.set('query', query)
  u.searchParams.set('mode', 'ArtList')
  u.searchParams.set('maxrecords', String(max))
  u.searchParams.set('format', 'json')
  u.searchParams.set('timespan', '90d')
  const res = await fetch(u)
  const text = await res.text()
  let j
  try {
    j = JSON.parse(text)
  } catch {
    return []
  }
  const raw = j.articles || j.artlist || []
  const list = Array.isArray(raw) ? raw : []
  return list
    .map((a) => ({
      title: a.title || a.Title || 'Article',
      url: a.url || a.URL || '',
      source: a.domain || a.source || a.domainname || 'Media',
      publishedAt: formatGdeltDate(a.seendate || a.seen || a.SEENDATE),
      description: '',
    }))
    .filter((a) => a.url)
}

function mergeNewsDedupe(primary, secondary, limit = 12) {
  const seen = new Set()
  const out = []
  for (const a of [...primary, ...secondary]) {
    if (!a.url || seen.has(a.url)) continue
    seen.add(a.url)
    out.push(a)
    if (out.length >= limit) break
  }
  return out
}

async function fetchNewsGdeltMetro(city, state) {
  const parts = [city, state].filter(Boolean)
  const loc =
    parts.length >= 2
      ? `"${parts[0]}" "${parts[1]}"`
      : parts.length === 1
        ? `"${parts[0]}"`
        : ''
  if (!loc) {
    const once = await fetchNewsGdeltOnce('local news United States', 12)
    return once.slice(0, 12)
  }
  const [general, safety] = await Promise.all([
    fetchNewsGdeltOnce(loc, 8),
    fetchNewsGdeltOnce(
      `${loc} (crime OR shooting OR arrest OR robbery OR assault OR police OR fire OR crash OR homicide)`,
      8,
    ),
  ])
  return mergeNewsDedupe(general, safety, 12)
}

/**
 * Prefer GDELT `near:lat,lon,Rmi` (bounding box per GDELT docs). Falls back to metro keywords if empty.
 */
async function fetchNewsGdelt(geo) {
  const miles = clampRadiusMiles(process.env.NEWS_RADIUS_MILES)
  const { lat, lon, city, state } = geo
  const finite = Number.isFinite(lat) && Number.isFinite(lon)

  if (finite) {
    const latR = Math.round(lat * 1e5) / 1e5
    const lonR = Math.round(lon * 1e5) / 1e5
    const near = `near:${latR},${lonR},${miles}mi`
    const [general, safety] = await Promise.all([
      fetchNewsGdeltOnce(
        `${near} (news OR local OR politics OR community OR school OR traffic OR city OR town OR mayor OR housing OR weather)`,
        14,
      ),
      fetchNewsGdeltOnce(
        `${near} (crime OR shooting OR arrest OR robbery OR assault OR police OR fire OR crash OR homicide OR theft OR burglary)`,
        14,
      ),
    ])
    const merged = mergeNewsDedupe(general, safety, 12)
    if (merged.length > 0) {
      return {
        articles: merged,
        newsGeo: {
          scope: 'gdelt_near',
          radiusMiles: miles,
          note: `Stories tied to locations within about ${miles} miles of your pin (GDELT near search, ~90 day window; uses a bounding box, not a perfect circle).`,
        },
      }
    }
    const metro = await fetchNewsGdeltMetro(city, state)
    return {
      articles: metro,
      newsGeo: {
        scope: 'gdelt_metro_fallback',
        radiusMiles: miles,
        note: `No GDELT matches for ~${miles} mi of this pin; showing broader ${[city, state].filter(Boolean).join(', ') || 'area'} results instead.`,
      },
    }
  }

  const metro = await fetchNewsGdeltMetro(city, state)
  return {
    articles: metro,
    newsGeo: {
      scope: 'gdelt_metro',
      radiusMiles: null,
      note: 'Metro keyword results (coordinates missing for radius search).',
    },
  }
}

function buildDemoCrimes(city, state) {
  const seed = hashStr(`${city}|${state}`)
  const place = city && state ? `${city}, ${state}` : city || state || 'the area'
  const templates = [
    { cat: 'Theft', title: 'Property theft report filed' },
    { cat: 'Assault', title: 'Assault investigation (local PD)' },
    { cat: 'Traffic', title: 'Serious traffic incident' },
    { cat: 'Vandalism', title: 'Vandalism complaint' },
    { cat: 'Burglary', title: 'Residential burglary report' },
  ]
  return [0, 1, 2, 3].map((i) => {
    const t = templates[(seed + i) % templates.length]
    return {
      id: `demo-${i}`,
      title: `${t.title} — ${place}`,
      date: daysAgoISO(12 + ((seed + i * 17) % 75)),
      category: t.cat,
      source: 'Demo incidents (add a crime API key for live data)',
      isDemo: true,
    }
  })
}

const app = express()

const corsOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])
corsOrigins.add(CLIENT_URL)

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (corsOrigins.has(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: false,
  }),
)

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) {
      return res.status(400).send('Stripe not configured')
    }
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!whSecret) {
      console.warn('[stripe] Webhook ignored (set STRIPE_WEBHOOK_SECRET for live events)')
      return res.json({ received: false })
    }
    const sig = req.headers['stripe-signature']
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, whSecret)
    } catch (err) {
      console.error('[stripe] Webhook signature', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('[stripe] checkout.session.completed', event.data.object.id)
        break
      case 'customer.subscription.deleted':
        console.log('[stripe] subscription deleted', event.data.object.id)
        break
      default:
        break
    }
    res.json({ received: true })
  },
)

app.use(express.json({ limit: '1mb' }))

registerAuth(app, {
  rootDir,
  googleClientId: GOOGLE_CLIENT_ID,
  sessionSecret: SESSION_SECRET,
})

app.get('/api/stripe/config', (_req, res) => {
  const hasSecretKey = Boolean(stripeSecret)
  const hasPriceId = Boolean(STRIPE_PRICE_ID)
  const enabled = stripeCheckoutReady()
  /** Plain-English hint for the UI when Checkout cannot start (no secrets exposed). */
  let setupHint = ''
  if (!enabled) {
    const hasEnvFile = fs.existsSync(envPath) || fs.existsSync(envLocalPath)
    const missing = []
    if (!hasSecretKey) missing.push('STRIPE_SECRET_KEY (sk_test_… from Stripe Dashboard)')
    if (!hasPriceId) missing.push('STRIPE_PRICE_ID (recurring price_… from your Product)')
    const fileHint = hasEnvFile
      ? 'The API found .env or .env.local but these variables are still empty or commented. Each active line must look like STRIPE_SECRET_KEY=sk_test_abc (no # at the start). Never use VITE_STRIPE_SECRET_KEY for the server—the API only reads STRIPE_SECRET_KEY.'
      : 'No .env or .env.local file was found next to package.json. Copy .env.example to .env in the project root, add your keys, save.'
    setupHint = `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} missing. ${fileHint} Then restart: Ctrl+C and npm run dev:full. CLIENT_URL is ${CLIENT_URL}—open the app at exactly that URL (e.g. if you use localhost, set CLIENT_URL=http://localhost:5173).`
  }
  res.json({ checkoutEnabled: enabled, setupHint })
})

app.post('/api/stripe/create-checkout-session', async (_req, res) => {
  if (!stripeCheckoutReady()) {
    return res.status(503).json({ error: 'stripe_not_configured' })
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${CLIENT_URL}/subscribe?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/subscribe?stripe_cancel=1`,
      allow_promotion_codes: true,
    })
    res.json({ url: session.url })
  } catch (e) {
    console.error('[stripe] create-checkout-session', e)
    res.status(500).json({ error: 'stripe_error', message: e.message })
  }
})

app.get('/api/stripe/session', async (req, res) => {
  const sessionId = String(req.query.session_id || '').trim()
  if (!sessionId || !stripe) {
    return res.status(400).json({ ok: false })
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })
    const paid =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required'
    const complete = session.status === 'complete'
    if (session.mode !== 'subscription' || !paid || !complete) {
      return res.json({ ok: false })
    }
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer && 'id' in session.customer
          ? session.customer.id
          : null
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription && 'id' in session.subscription
          ? session.subscription.id
          : null
    res.json({ ok: true, customerId, subscriptionId })
  } catch (e) {
    console.error('[stripe] session retrieve', e.message)
    res.status(400).json({ ok: false })
  }
})

app.get('/api/stripe/subscription-status', async (req, res) => {
  const customerId = String(req.query.customer_id || '').trim()
  if (!customerId || !stripe) {
    return res.status(400).json({ active: false, error: 'bad_request' })
  }
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })
    const active = subs.data.some(
      (s) => s.status === 'active' || s.status === 'trialing',
    )
    res.json({ active })
  } catch (e) {
    console.error('[stripe] subscription-status', e.message)
    res.json({ active: false })
  }
})

app.post('/api/stripe/create-portal-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'stripe_not_configured' })
  }
  const customerId = req.body?.customerId
  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({ error: 'customer_required' })
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${CLIENT_URL}/`,
    })
    res.json({ url: session.url })
  } catch (e) {
    console.error('[stripe] portal', e.message)
    res.status(500).json({ error: 'stripe_error', message: e.message })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/**
 * Map preview: stitch OSM raster tiles server-side (staticmap.openstreetmap.de is often unreachable).
 * Same-origin PNG for the UI and PDF. © OpenStreetMap contributors.
 */
app.get('/api/map-preview', async (req, res) => {
  const lat = Number.parseFloat(String(req.query.lat ?? ''))
  const lon = Number.parseFloat(String(req.query.lon ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).type('text/plain').send('lat and lon query params required')
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).type('text/plain').send('coordinates out of range')
  }
  let zoom = Number.parseInt(String(req.query.zoom ?? '16'), 10)
  if (!Number.isFinite(zoom)) zoom = 16
  zoom = Math.min(18, Math.max(12, zoom))
  let w = Number.parseInt(String(req.query.w ?? '480'), 10)
  let h = Number.parseInt(String(req.query.h ?? '220'), 10)
  if (!Number.isFinite(w)) w = 480
  if (!Number.isFinite(h)) h = 220
  w = Math.min(640, Math.max(160, w))
  h = Math.min(480, Math.max(100, h))

  try {
    const { fx, fy } = latLonToFloatTile(lat, lon, zoom)
    const x0 = Math.floor(fx - 0.5)
    const y0 = Math.floor(fy - 0.5)
    const px = Math.min(511, Math.max(0, Math.round((fx - x0) * 256)))
    const py = Math.min(511, Math.max(0, Math.round((fy - y0) * 256)))

    const nTiles = 2 ** zoom
    const wrapX = (x) => ((x % nTiles) + nTiles) % nTiles
    const clampY = (y) => Math.min(nTiles - 1, Math.max(0, y))

    const [b00, b10, b01, b11] = await Promise.all([
      fetchOsmTile(zoom, wrapX(x0), clampY(y0)),
      fetchOsmTile(zoom, wrapX(x0 + 1), clampY(y0)),
      fetchOsmTile(zoom, wrapX(x0), clampY(y0 + 1)),
      fetchOsmTile(zoom, wrapX(x0 + 1), clampY(y0 + 1)),
    ])

    const markerSvg = Buffer.from(
      `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${px}" cy="${py}" r="10" fill="#c41e3a" stroke="#ffffff" stroke-width="3"/>
      </svg>`,
    )

    const png = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 232, g: 232, b: 234 },
      },
    })
      .composite([
        { input: b00, left: 0, top: 0 },
        { input: b10, left: 256, top: 0 },
        { input: b01, left: 0, top: 256 },
        { input: b11, left: 256, top: 256 },
        { input: markerSvg, left: 0, top: 0 },
      ])
      .resize(w, h, { fit: 'fill' })
      .png()
      .toBuffer()

    res.set('Content-Type', 'image/png')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(png)
  } catch (e) {
    console.error('[map-preview]', e)
    res.status(502).type('text/plain').send('map fetch failed')
  }
})

app.get('/api/local-feed', async (req, res) => {
  const address = String(req.query.address || '').trim()
  if (address.length < 4) {
    return res.status(400).json({
      ok: false,
      error: 'bad_request',
      message: 'address query required',
      geo: null,
      news: [],
      newsGeo: null,
      crimes: [],
    })
  }

  try {
    const geo = await geocodeAddress(address)
    if (!geo) {
      return res.json({
        ok: false,
        error: 'geocode',
        message: 'Could not geocode that address (try a fuller US address).',
        geo: null,
        news: [],
        newsGeo: null,
        crimes: [],
        newsSource: null,
        crimeSource: null,
      })
    }

    const newsKey = process.env.NEWS_API_KEY
    const newsResult = newsKey
      ? await fetchNewsNewsApi(geo, newsKey)
      : await fetchNewsGdelt(geo)
    const crimes = buildDemoCrimes(geo.city, geo.state)

    res.json({
      ok: true,
      geo,
      news: newsResult.articles,
      newsGeo: newsResult.newsGeo,
      crimes,
      newsSource: newsKey ? 'newsapi' : 'gdelt',
      crimeSource: 'demo',
    })
  } catch (e) {
    console.error('[local-feed]', e)
    res.status(500).json({
      ok: false,
      error: 'server',
      message: 'Failed to load local feed.',
      geo: null,
      news: [],
      newsGeo: null,
      crimes: [],
    })
  }
})

app.listen(PORT, () => {
  console.log(`NeighborIQ API http://127.0.0.1:${PORT}`)
  const hasDotenv = fs.existsSync(envPath) || fs.existsSync(envLocalPath)
  if (!hasDotenv) {
    console.warn(`[env] No .env or .env.local in ${rootDir} — Stripe and other secrets will be missing.`)
  }
  if (process.env.VITE_STRIPE_SECRET_KEY?.trim() && !stripeSecret) {
    console.warn(
      '[stripe] VITE_STRIPE_SECRET_KEY is set but the API ignores it. Add STRIPE_SECRET_KEY (same value) for Checkout.',
    )
  }
  if (stripeCheckoutReady()) {
    console.log('[stripe] Checkout enabled · CLIENT_URL=', CLIENT_URL)
  } else {
    const miss = []
    if (!stripeSecret) miss.push('STRIPE_SECRET_KEY')
    if (!STRIPE_PRICE_ID) miss.push('STRIPE_PRICE_ID')
    console.warn(`[stripe] Checkout disabled — missing: ${miss.join(', ')}`)
  }
  if (GOOGLE_CLIENT_ID) {
    if (!isLikelyGoogleWebClientId(GOOGLE_CLIENT_ID)) {
      console.warn(
        '[auth] GOOGLE_CLIENT_ID does not look like a Web Client ID (expected *digits*-*suffix*.apps.googleusercontent.com). Error 401 invalid_client usually means wrong ID or Client secret pasted by mistake.',
      )
    }
    console.log(
      '[auth] Google Sign-In enabled · users → server/data/users.json',
      SESSION_SECRET ? '' : '· set SESSION_SECRET for production cookie signing',
    )
  } else {
    console.warn(
      '[auth] Google Sign-In disabled — set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID (same Web client ID)',
    )
  }
})
