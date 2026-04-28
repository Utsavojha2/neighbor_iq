/* Context + hook must live together; Fast Refresh allows only components in isolation. */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const AuthContext = createContext(null)
const TOKEN_KEY = 'neighboriq_token'

async function apiFetch(path, options = {}) {
  const r = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  return r.json().catch(() => ({}))
}

function normalizeError(data) {
  if (!data) return 'Request failed'
  if (Array.isArray(data.message)) return data.message.join('. ')
  return data.message || data.error || 'Request failed'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const refreshUser = useCallback(async (currentToken) => {
    const t = currentToken ?? localStorage.getItem(TOKEN_KEY)
    if (!t) {
      setUser(null)
      return
    }
    try {
      const data = await apiFetch('/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      })
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser(token).then(() => setLoading(false))
  }, [refreshUser, token])

  const login = useCallback(
    async (email, password) => {
      const data = await apiFetch('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        setToken(data.accessToken)
        await refreshUser(data.accessToken)
        return { ok: true }
      }
      return { ok: false, error: normalizeError(data) }
    },
    [refreshUser],
  )

  const signup = useCallback(async (name, email, password) => {
    const data = await apiFetch('/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    if (data.message && !data.statusCode) {
      return { ok: true, message: data.message }
    }
    return { ok: false, error: normalizeError(data) }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, token, login, signup, logout, refreshUser }),
    [user, loading, token, login, signup, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
