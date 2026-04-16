/** Typical Google OAuth 2.0 *Web client* ID shape (not the client secret). */
export function isLikelyGoogleWebClientId(id) {
  if (!id || typeof id !== 'string') return false
  return /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/i.test(id.trim())
}
