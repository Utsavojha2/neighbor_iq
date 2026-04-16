import fs from 'node:fs'
import path from 'node:path'

/**
 * Simple JSON-backed user directory (Google sub → profile + timestamps).
 * Replace with a real DB when you outgrow a file.
 */
export function createUsersStore(dataPath) {
  function load() {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8')
      const j = JSON.parse(raw)
      if (j && typeof j.users === 'object') return j
    } catch {
      /* missing or invalid */
    }
    return { users: {} }
  }

  function save(data) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true })
    fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }

  return {
    /**
     * @param {{ sub: string, email?: string, name?: string, picture?: string }} googleProfile
     */
    upsertUser(googleProfile) {
      const { sub, email, name, picture } = googleProfile
      const data = load()
      const now = new Date().toISOString()
      const prev = data.users[sub] || {}
      data.users[sub] = {
        googleSub: sub,
        email: email || prev.email || '',
        name: name || prev.name || '',
        picture: picture || prev.picture || '',
        firstSeenAt: prev.firstSeenAt || now,
        lastLoginAt: now,
      }
      save(data)
      return data.users[sub]
    },
  }
}
