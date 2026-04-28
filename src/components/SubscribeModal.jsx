import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import { useAuth } from '../context/AuthContext'
import { AuthForm } from './AuthForm'
import { PRO_PLAN_BENEFITS } from '../lib/proPlanBenefits'

export function SubscribeModal() {
  const { paywallOpen, closePaywall, isPaid, startCheckout } = useSubscription()
  const { user, token } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  // Clean up when paywall closes
  useEffect(() => {
    if (!paywallOpen) {
      setAuthModalOpen(false)
      setPendingCheckout(false)
      setCheckoutError('')
    }
  }, [paywallOpen])

  // Escape closes the auth modal first, then the paywall
  useEffect(() => {
    if (!paywallOpen) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (authModalOpen) {
        setAuthModalOpen(false)
      } else {
        closePaywall()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paywallOpen, authModalOpen, closePaywall])

  const doCheckout = useCallback(
    async (tkn) => {
      setCheckoutError('')
      setCheckoutLoading(true)
      try {
        const result = await startCheckout(tkn)
        if (result.url) {
          window.location.href = result.url
          return
        }
        setCheckoutError(result.error || 'Could not start checkout. Try again.')
      } finally {
        setCheckoutLoading(false)
      }
    },
    [startCheckout],
  )

  // Auto-trigger checkout once token is available after login
  useEffect(() => {
    if (pendingCheckout && token) {
      setPendingCheckout(false)
      void doCheckout(token)
    }
  }, [pendingCheckout, token, doCheckout])

  if (!paywallOpen) return null

  const handleSubscribeClick = () => {
    if (isPaid) {
      closePaywall()
      return
    }
    if (!user || !token) {
      setAuthModalOpen(true)
      return
    }
    void doCheckout(token)
  }

  const handleAuthSuccess = () => {
    setAuthModalOpen(false)
    setPendingCheckout(true)
  }

  return (
    <>
      <div
        className="sub-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePaywall()
        }}
      >
        <div className="sub-modal">
          <button type="button" className="sub-modal-close" onClick={closePaywall} aria-label="Close">
            ×
          </button>

          <p className="sub-modal-tag">NeighborIQ Pro</p>
          <h2 id="sub-modal-title" className="sub-modal-title">
            Unlock full reports
          </h2>
          <div className="sub-modal-benefits">
            {PRO_PLAN_BENEFITS.map((b) => (
              <div key={b.title} className="sub-modal-benefit-row">
                <div
                  className="sub-modal-benefit-icon"
                  dangerouslySetInnerHTML={{ __html: b.icon }}
                />
                <div className="sub-modal-benefit-text">
                  <div className="sub-modal-benefit-title">{b.title}</div>
                  <div className="sub-modal-benefit-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="sub-modal-price">
            <span className="sub-modal-price-num">$9</span>
            <span className="sub-modal-price-unit">/mo</span>
          </div>

          {checkoutError && (
            <p className="sub-modal-error" role="alert">
              {checkoutError}
            </p>
          )}

          <div className="sub-modal-actions">
            <button type="button" className="sub-modal-secondary" onClick={closePaywall}>
              Not now
            </button>
            <button
              type="button"
              className="sub-modal-cta"
              disabled={checkoutLoading}
              onClick={handleSubscribeClick}
            >
              {isPaid ? 'Close' : checkoutLoading ? 'Redirecting…' : 'Subscribe'}
            </button>
          </div>
        </div>
      </div>

      {/* Auth modal portalled to document.body so sub-modal's backdrop-filter
          doesn't create a new containing block for the fixed overlay */}
      {authModalOpen &&
        createPortal(
          <div
            className="auth-modal-overlay"
            onClick={() => setAuthModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to subscribe"
          >
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="auth-modal-close"
                type="button"
                onClick={() => setAuthModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="auth-modal-logo">
                neighbor<span>IQ</span>
              </div>
              <AuthForm onSuccess={handleAuthSuccess} />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
