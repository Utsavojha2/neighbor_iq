import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import './styles/marketing.css'
import './styles/analysis-flow.css'
import { AuthProvider } from './context/AuthContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { SubscribeModal } from './components/SubscribeModal'
import { isLikelyGoogleWebClientId } from './lib/googleClientIdFormat'
import { router } from './router'

const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const googleClientId = typeof rawGoogleClientId === 'string' ? rawGoogleClientId.trim() : ''

if (import.meta.env.DEV && googleClientId && !isLikelyGoogleWebClientId(googleClientId)) {
  console.warn(
    '[NeighborIQ] VITE_GOOGLE_CLIENT_ID should be the OAuth Web Client ID (e.g. 123-abc.apps.googleusercontent.com), not the Client secret. Copy from Google Cloud → APIs & Services → Credentials.',
  )
}

const appTree = (
  <AuthProvider>
    <SubscriptionProvider>
      <RouterProvider router={router} />
      <SubscribeModal />
    </SubscriptionProvider>
  </AuthProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </StrictMode>,
)
