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
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'neighboriq_subscription'
const AUTH_TOKEN_KEY = 'neighboriq_token'

const SubscriptionContext = createContext(null)

function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

async function subFetch(path, token, options = {}) {
  const r = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  return r.json().catch(() => ({}))
}

export function SubscriptionProvider({ children }) {
  const { token } = useAuth()
  const [isPaid, setIsPaid] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'active'
    } catch {
      return false
    }
  })
  const [paywallOpen, setPaywallOpen] = useState(false)

  const setActiveStatus = useCallback((active) => {
    setIsPaid(active)
    try {
      if (active) {
        localStorage.setItem(STORAGE_KEY, 'active')
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    const token = getStoredToken()
    if (!token) return
    try {
      const data = await subFetch('/subscriptions/status', token)
      const sub = data.subscription
      const active = sub?.status === 'active' || sub?.status === 'trialing'
      setActiveStatus(active)
    } catch {
      /* keep local state on network errors */
    }
  }, [setActiveStatus])

  // Sync subscription state on auth changes:
  // - token gone (logout) → clear immediately
  // - token present (login / page reload) → fetch real status from server
  useEffect(() => {
    if (!token) {
      setIsPaid(false)
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    } else {
      void refreshStatus()
    }
  }, [token, refreshStatus])

  // Handle sub_success redirect back from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sub_success') !== '1') return
    params.delete('sub_success')
    const q = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
    )
    void refreshStatus()
  }, [refreshStatus])

  const startCheckout = useCallback(async (token) => {
    const successUrl = `${window.location.origin}/?sub_success=1`
    const cancelUrl = `${window.location.origin}${window.location.pathname}`
    try {
      const data = await subFetch(
        '/subscriptions/checkout',
        token,
        { method: 'POST', body: JSON.stringify({ successUrl, cancelUrl }) },
      )
      if (data.sessionUrl) return { url: data.sessionUrl }
      const msg = Array.isArray(data.message) ? data.message.join('. ') : data.message
      return { url: null, error: msg || 'Could not start checkout.' }
    } catch {
      return { url: null, error: 'Could not reach the server. Make sure the backend is running.' }
    }
  }, [])

  const cancelSubscription = useCallback(async () => {
    setActiveStatus(false)
    const token = getStoredToken()
    if (token) {
      try {
        await subFetch('/subscriptions/cancel', token, { method: 'POST', body: '{}' })
      } catch {
        /* ignore — local state already cleared */
      }
    }
  }, [setActiveStatus])

  const value = useMemo(
    () => ({
      isPaid,
      paywallOpen,
      openPaywall: () => setPaywallOpen(true),
      closePaywall: () => setPaywallOpen(false),
      startCheckout,
      cancelSubscription,
      refreshStatus,
    }),
    [isPaid, paywallOpen, startCheckout, cancelSubscription, refreshStatus],
  )

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
