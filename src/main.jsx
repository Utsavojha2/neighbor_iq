import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import './styles/marketing.css'
import './styles/analysis-flow.css'
import './styles/chat.css'
import { AuthProvider } from './context/AuthContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { SubscribeModal } from './components/SubscribeModal'
import { OnboardingModal } from './components/OnboardingModal'
import { router } from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SubscriptionProvider>
        <RouterProvider router={router} />
        <SubscribeModal />
        <OnboardingModal />
      </SubscriptionProvider>
    </AuthProvider>
  </StrictMode>,
)
