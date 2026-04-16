import path from 'node:path'
import session from 'express-session'
import { OAuth2Client } from 'google-auth-library'
import { isLikelyGoogleWebClientId } from './googleClientIdFormat.mjs'
import { createUsersStore } from './usersStore.mjs'

/**
 * Cookie session + Google ID token verification + JSON user store.
 * @param {import('express').Express} app
 * @param {{ rootDir: string, googleClientId: string, sessionSecret: string }} opts
 */
export function registerAuth(app, opts) {
  const { rootDir, googleClientId, sessionSecret } = opts
  const dataPath = path.join(rootDir, 'server', 'data', 'users.json')
  const users = createUsersStore(dataPath)
  const oauthClient = googleClientId ? new OAuth2Client(googleClientId) : null

  app.use(
    session({
      name: 'neighboriq.sid',
      secret: sessionSecret || 'neighboriq-dev-insecure-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      },
    }),
  )

  app.get('/api/auth/config', (_req, res) => {
    const enabled = Boolean(googleClientId && oauthClient)
    const formatOk = !googleClientId || isLikelyGoogleWebClientId(googleClientId)
    res.json({
      googleSignInEnabled: enabled,
      googleClientIdFormatOk: formatOk,
    })
  })

  app.get('/api/auth/me', (req, res) => {
    const u = req.session.user
    if (!u) return res.json({ user: null })
    res.json({
      user: { id: u.id, email: u.email, name: u.name, picture: u.picture },
    })
  })

  const cookieOpts = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }

  app.post('/api/auth/google-access-token', async (req, res) => {
    if (!oauthClient || !googleClientId) {
      return res.status(503).json({ ok: false, error: 'google_auth_not_configured' })
    }
    const accessToken = req.body?.accessToken
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ ok: false, error: 'access_token_required' })
    }
    try {
      const ures = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      })
      if (!ures.ok) {
        return res.status(401).json({ ok: false, error: 'invalid_access_token' })
      }
      const profile = await ures.json()
      const sub = profile.sub
      if (!sub) {
        return res.status(401).json({ ok: false, error: 'invalid_profile' })
      }
      const stored = users.upsertUser({
        sub,
        email: profile.email || '',
        name: profile.name || '',
        picture: profile.picture || '',
      })
      req.session.user = {
        id: sub,
        email: stored.email,
        name: stored.name,
        picture: stored.picture,
      }
      res.json({ ok: true, user: req.session.user })
    } catch (e) {
      console.error('[auth] google userinfo', e.message)
      res.status(500).json({ ok: false, error: 'userinfo_failed' })
    }
  })

  app.post('/api/auth/google', async (req, res) => {
    if (!oauthClient || !googleClientId) {
      return res.status(503).json({ ok: false, error: 'google_auth_not_configured' })
    }
    const credential = req.body?.credential
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ ok: false, error: 'credential_required' })
    }
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      })
      const payload = ticket.getPayload()
      if (!payload?.sub) {
        return res.status(401).json({ ok: false, error: 'invalid_token' })
      }
      const stored = users.upsertUser({
        sub: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture || '',
      })
      req.session.user = {
        id: payload.sub,
        email: stored.email,
        name: stored.name,
        picture: stored.picture,
      }
      res.json({ ok: true, user: req.session.user })
    } catch (e) {
      console.error('[auth] google verify', e.message)
      res.status(401).json({ ok: false, error: 'verification_failed' })
    }
  })

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('[auth] logout', err)
        return res.status(500).json({ ok: false })
      }
      res.clearCookie('neighboriq.sid', cookieOpts)
      res.json({ ok: true })
    })
  })
}
