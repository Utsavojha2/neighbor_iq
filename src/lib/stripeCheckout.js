/**
 * Starts a Stripe Checkout session (subscription). Server must have STRIPE_SECRET_KEY + STRIPE_PRICE_ID.
 * @returns {Promise<{ url?: string, error?: string, message?: string }>}
 */
export async function requestStripeCheckoutSession() {
  const r = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  const data = await r.json().catch(() => ({}))
  return data
}
