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

const STORAGE_KEY = 'neighboriq_subscription'
const STORAGE_CUSTOMER_KEY = 'neighboriq_stripe_customer_id'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const [isPaid, setIsPaid] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'active'
    } catch {
      return false
    }
  })
  const [stripeCustomerId, setStripeCustomerId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_CUSTOMER_KEY) || ''
    } catch {
      return ''
    }
  })
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [stripeCheckoutEnabled, setStripeCheckoutEnabled] = useState(false)
  const [stripeSetupHint, setStripeSetupHint] = useState('')

  useEffect(() => {
    fetch('/api/stripe/config', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setStripeCheckoutEnabled(Boolean(d.checkoutEnabled))
        setStripeSetupHint(typeof d.setupHint === 'string' ? d.setupHint : '')
      })
      .catch(() => {
        setStripeCheckoutEnabled(false)
        setStripeSetupHint(
          'The app could not reach the API (no response from /api/stripe/config). Run both servers from the project folder: npm run dev:full — or run npm run dev:api in one terminal and npm run dev in another. The API must listen on port 3001 (see API_PORT in .env).',
        )
      })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_cancel') === '1') {
      params.delete('stripe_cancel')
      const q = params.toString()
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
      )
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_success') !== '1') return undefined
    const sessionId = params.get('session_id')
    if (!sessionId) {
      params.delete('stripe_success')
      const q = params.toString()
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
      )
      return undefined
    }

    ;(async () => {
      try {
        const r = await fetch(
          `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: 'include' },
        )
        const data = await r.json()
        if (data.ok) {
          setIsPaid(true)
          if (data.customerId) {
            setStripeCustomerId(data.customerId)
            try {
              localStorage.setItem(STORAGE_CUSTOMER_KEY, data.customerId)
            } catch {
              /* ignore */
            }
          }
          try {
            localStorage.setItem(STORAGE_KEY, 'active')
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      } finally {
        const p = new URLSearchParams(window.location.search)
        p.delete('stripe_success')
        p.delete('session_id')
        const q = p.toString()
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
        )
      }
    })()

    return undefined
  }, [])

  useEffect(() => {
    if (!stripeCustomerId || !isPaid || !stripeCheckoutEnabled) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(
          `/api/stripe/subscription-status?customer_id=${encodeURIComponent(stripeCustomerId)}`,
          { credentials: 'include' },
        )
        if (!r.ok) return
        const data = await r.json()
        if (cancelled) return
        if (data.active === false) {
          setIsPaid(false)
          setStripeCustomerId('')
          try {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(STORAGE_CUSTOMER_KEY)
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* keep local state on network errors */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [stripeCustomerId, isPaid, stripeCheckoutEnabled])

  const subscribe = useCallback(() => {
    setIsPaid(true)
    try {
      localStorage.setItem(STORAGE_KEY, 'active')
    } catch {
      /* ignore */
    }
    setPaywallOpen(false)
  }, [])

  const cancelSubscription = useCallback(() => {
    setIsPaid(false)
    setStripeCustomerId('')
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_CUSTOMER_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const openBillingPortal = useCallback(async () => {
    let id = stripeCustomerId
    if (!id) {
      try {
        id = localStorage.getItem(STORAGE_CUSTOMER_KEY) || ''
      } catch {
        id = ''
      }
    }
    if (!id) return false
    try {
      const r = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: id }),
      })
      const data = await r.json()
      if (data.url) {
        window.location.href = data.url
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  }, [stripeCustomerId])

  const value = useMemo(
    () => ({
      isPaid,
      subscribe,
      cancelSubscription,
      paywallOpen,
      openPaywall: () => setPaywallOpen(true),
      closePaywall: () => setPaywallOpen(false),
      stripeCheckoutEnabled,
      stripeSetupHint,
      stripeCustomerId,
      openBillingPortal,
    }),
    [
      isPaid,
      subscribe,
      cancelSubscription,
      paywallOpen,
      stripeCheckoutEnabled,
      stripeSetupHint,
      stripeCustomerId,
      openBillingPortal,
    ],
  )

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return ctx
}
