import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSubscription } from '../context/SubscriptionContext'
import { requestStripeCheckoutSession } from '../lib/stripeCheckout'
import { PRO_PLAN_BENEFITS } from '../lib/proPlanBenefits'
import { STRIPE_CHECKOUT_SETUP_MESSAGE } from '../lib/stripeSetupMessage'

export function SubscribeModal() {
  const { paywallOpen, closePaywall, isPaid, stripeCheckoutEnabled, stripeSetupHint } =
    useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => {
    if (!paywallOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closePaywall()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paywallOpen, closePaywall])

  useEffect(() => {
    if (paywallOpen) setCheckoutError('')
  }, [paywallOpen])

  if (!paywallOpen) return null

  const startCheckout = async () => {
    if (isPaid) {
      closePaywall()
      return
    }
    setCheckoutError('')
    if (!stripeCheckoutEnabled) {
      setCheckoutError(stripeSetupHint || STRIPE_CHECKOUT_SETUP_MESSAGE)
      return
    }
    setCheckoutLoading(true)
    try {
      const data = await requestStripeCheckoutSession()
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.error === 'stripe_not_configured') {
        setCheckoutError(stripeSetupHint || STRIPE_CHECKOUT_SETUP_MESSAGE)
        return
      }
      setCheckoutError(data.message || 'Could not start checkout. Try again.')
    } catch {
      setCheckoutError(
        'Could not reach the payment server. Run npm run dev:full (Vite + API on port 3001).',
      )
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
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
        <p className="sub-modal-body">
          Subscribe with Stripe Checkout. After payment, we verify your session and unlock Pro features.
        </p>
        <p className="sub-modal-benefits-intro">What you get with Pro</p>
        <ul className="sub-modal-list sub-modal-list-benefits">
          {PRO_PLAN_BENEFITS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="sub-modal-price">
          <span className="sub-modal-price-num">$9</span>
          <span className="sub-modal-price-unit">/mo</span>
          <span className="sub-modal-price-note"> · set price in Stripe Dashboard</span>
        </div>
        {checkoutError ? (
          <p className="sub-modal-error" role="alert">
            {checkoutError}
          </p>
        ) : null}
        <p className="sub-modal-page-link">
          <Link to="/subscribe" onClick={closePaywall}>
            Open full subscription page
          </Link>
        </p>
        <div className="sub-modal-actions">
          <button
            type="button"
            className="sub-modal-cta"
            disabled={checkoutLoading}
            onClick={() => {
              void startCheckout()
            }}
          >
            {isPaid ? 'Close' : checkoutLoading ? 'Redirecting…' : 'Subscribe Pro'}
          </button>
          <button type="button" className="sub-modal-secondary" onClick={closePaywall}>
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
