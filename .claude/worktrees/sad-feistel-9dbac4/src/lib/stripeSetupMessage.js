/** Shown when Checkout cannot start (missing env, API down, etc.). */
export const STRIPE_CHECKOUT_SETUP_MESSAGE =
  'Stripe Checkout is not available. Fix: add STRIPE_SECRET_KEY and STRIPE_PRICE_ID (a recurring price) to your project .env, set CLIENT_URL to the exact URL you open in the browser (e.g. http://127.0.0.1:5173 — must match), then run npm run dev:full so the API and Vite run together. Restart the API after editing .env.'
