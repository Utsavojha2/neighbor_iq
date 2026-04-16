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

async function fetchAuth(path, options = {}) {
  const r = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  return r.json().catch(() => ({}))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleSignInEnabled, setGoogleSignInEnabled] = useState(false)
  const [googleClientIdFormatOk, setGoogleClientIdFormatOk] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchAuth('/api/auth/me')
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const cfg = await fetchAuth('/api/auth/config')
        setGoogleSignInEnabled(Boolean(cfg.googleSignInEnabled))
        setGoogleClientIdFormatOk(cfg.googleClientIdFormatOk !== false)
      } catch {
        setGoogleSignInEnabled(false)
        setGoogleClientIdFormatOk(true)
      }
      await refreshUser()
      setLoading(false)
    })()
  }, [refreshUser])

  const loginWithGoogleCredential = useCallback(async (credential) => {
    const data = await fetchAuth('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })
    if (data.ok && data.user) {
      setUser(data.user)
      return { ok: true }
    }
    return { ok: false, error: data.error }
  }, [])

  const loginWithGoogleAccessToken = useCallback(async (accessToken) => {
    const data = await fetchAuth('/api/auth/google-access-token', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    })
    if (data.ok && data.user) {
      setUser(data.user)
      return { ok: true }
    }
    return { ok: false, error: data.error }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetchAuth('/api/auth/logout', { method: 'POST', body: '{}' })
    } catch {
      /* ignore */
    }
    try {
      const { googleLogout } = await import('@react-oauth/google')
      googleLogout()
    } catch {
      /* gsi not loaded */
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      googleSignInEnabled,
      googleClientIdFormatOk,
      refreshUser,
      loginWithGoogleCredential,
      loginWithGoogleAccessToken,
      logout,
    }),
    [
      user,
      loading,
      googleSignInEnabled,
      googleClientIdFormatOk,
      refreshUser,
      loginWithGoogleCredential,
      loginWithGoogleAccessToken,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
