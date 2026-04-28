import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { NavAuthWidgets } from '../components/NavAuthWidgets'
import { useSubscription } from '../context/SubscriptionContext'
import { requestStripeCheckoutSession } from '../lib/stripeCheckout'
import { PRO_PLAN_BENEFITS } from '../lib/proPlanBenefits'
import { STRIPE_CHECKOUT_SETUP_MESSAGE } from '../lib/stripeSetupMessage'

export default function SubscribePage() {
  const {
    isPaid,
    stripeCheckoutEnabled,
    stripeSetupHint,
    openBillingPortal,
    stripeCustomerId,
  } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [showCancelNote] = useState(
    () => new URLSearchParams(window.location.search).get('stripe_cancel') === '1',
  )

  const startCheckout = async () => {
    if (isPaid) return
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
        'Could not reach the payment server. Start both processes with npm run dev:full (Vite + API on port 3001).',
      )
    } finally {
      setCheckoutLoading(false)
    }
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
          <p className="sub-modal-body">
            Subscribe with Stripe Checkout (secure redirect). After payment, you return here and we verify
            your session before unlocking Pro. Access is only granted after a successful payment.
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
            <span className="sub-modal-price-note"> · price set in Stripe Dashboard</span>
          </div>

          {isPaid ? (
            <div className="subscribe-page-success" role="status">
              <p className="subscribe-page-success-title">You&apos;re subscribed</p>
              <p className="subscribe-page-success-body">
                PDF downloads are unlocked. Run a neighborhood analysis from the home page, then use
                Download PDF on your results.
              </p>
              <div className="subscribe-page-success-actions">
                <Link to="/" className="sub-modal-cta subscribe-page-inline-cta">
                  Start analyzing
                </Link>
                {stripeCheckoutEnabled && stripeCustomerId ? (
                  <button
                    type="button"
                    className="sub-modal-secondary"
                    onClick={() => {
                      void openBillingPortal()
                    }}
                  >
                    Manage billing
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {showCancelNote ? (
                <p className="subscribe-page-cancel-note" role="status">
                  Checkout was cancelled. You can try again whenever you&apos;re ready.
                </p>
              ) : null}
              {checkoutError ? (
                <p className="sub-modal-error" role="alert">
                  {checkoutError}
                </p>
              ) : null}
              <div className="sub-modal-actions subscribe-page-actions">
                <button
                  type="button"
                  className="sub-modal-cta"
                  disabled={checkoutLoading}
                  onClick={() => {
                    void startCheckout()
                  }}
                >
                  {checkoutLoading ? 'Redirecting…' : 'Subscribe Pro'}
                </button>
                <Link to="/" className="sub-modal-secondary subscribe-page-secondary-link">
                  Not now
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
