/**
 * Starts a Stripe Checkout session (subscription). Server must have STRIPE_SECRET_KEY + STRIPE_PRICE_ID.
 * @returns {Promise<{ url?: string, error?: string, message?: string }>}
 */
export async function requestStripeCheckoutSession() {
  const token = localStorage.getItem('neighboriq_token')
  const r = await fetch('/subscriptions/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: '{}',
  })
  const data = await r.json().catch(() => ({}))
  return data
}
