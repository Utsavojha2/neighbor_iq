import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { NavAuthWidgets } from '../components/NavAuthWidgets'
import { AuthForm } from '../components/AuthForm'
import { useSubscription } from '../context/SubscriptionContext'
import { useAuth } from '../context/AuthContext'
import { PRO_PLAN_BENEFITS } from '../lib/proPlanBenefits'

export default function SubscribePage() {
  const { isPaid, startCheckout } = useSubscription()
  const { user, token } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [showCancelNote] = useState(
    () => new URLSearchParams(window.location.search).get('sub_cancel') === '1',
  )

  useEffect(() => {
    if (!authModalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setAuthModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authModalOpen])

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

  useEffect(() => {
    if (pendingCheckout && token) {
      setPendingCheckout(false)
      void doCheckout(token)
    }
  }, [pendingCheckout, token, doCheckout])

  const handleSubscribeClick = () => {
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
    <div className="subscribe-page">
      <header className="subscribe-page-nav">
        <Link to="/" className="subscribe-page-logo">
          neighbor<span>IQ</span>
        </Link>
        <div className="subscribe-page-nav-right">
          <NavAuthWidgets variant="subscribe" />
          <Link to="/" className="subscribe-page-back">
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="subscribe-page-main">
        <div className="subscribe-page-card">
          <p className="sub-modal-tag">NeighborIQ Pro</p>
          <h1 className="subscribe-page-title">Unlock full reports</h1>

          
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

          {isPaid ? (
            <div className="subscribe-page-success" role="status">
              <p className="subscribe-page-success-title">You&apos;re subscribed</p>
              <p className="subscribe-page-success-body">
                PDF downloads are unlocked. Run a neighborhood analysis from the home page.
              </p>
              <div className="subscribe-page-success-actions">
                <Link to="/" className="sub-modal-cta subscribe-page-inline-cta">
                  Start analyzing
                </Link>
              </div>
            </div>
          ) : (
            <>
              {showCancelNote && (
                <p className="subscribe-page-cancel-note" role="status">
                  Checkout was cancelled. You can try again whenever you&apos;re ready.
                </p>
              )}
              {checkoutError && (
                <p className="sub-modal-error" role="alert">
                  {checkoutError}
                </p>
              )}
              <div className="sub-modal-actions subscribe-page-actions">
                <Link to="/" className="sub-modal-secondary subscribe-page-secondary-link">
                  Not now
                </Link>
                <button
                  type="button"
                  className="sub-modal-cta"
                  disabled={checkoutLoading}
                  onClick={handleSubscribeClick}
                >
                  {checkoutLoading ? 'Redirecting…' : 'Subscribe'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {authModalOpen &&
        createPortal(
          <div
            className="auth-modal-overlay"
            onClick={() => setAuthModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
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
    </div>
  )
}
