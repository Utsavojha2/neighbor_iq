import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

const viteGoogleId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

function GoogleGIcon() {
  return (
    <span className="nav-btn-login-google-mark" aria-hidden>
      <svg className="nav-btn-login-google-svg" viewBox="0 0 48 48">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.21 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.43 39.07 46.98 32.34 46.98 24.55z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.71-13.47-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
        <path fill="none" d="M0 0h48v48H0z" />
      </svg>
    </span>
  )
}

/**
 * Only mount under GoogleOAuthProvider (when VITE_GOOGLE_CLIENT_ID is set).
 */
function GreenGoogleLoginButton() {
  const { loginWithGoogleAccessToken } = useAuth()
  const [oauthErr, setOauthErr] = useState('')

  const login = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      setOauthErr('')
      const at = tokenResponse.access_token
      if (at) await loginWithGoogleAccessToken(at)
    },
    onError: (err) => {
      const code = err?.error ?? err?.message ?? ''
      const s = String(code).toLowerCase()
      if (s.includes('invalid_client') || s.includes('401')) {
        setOauthErr(
          'OAuth client not found. In Google Cloud → Credentials, copy the OAuth 2.0 Web client Client ID (ends in .apps.googleusercontent.com). Put that exact string in both VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID. Do not paste the Client secret.',
        )
      } else {
        setOauthErr('Google sign-in failed. Check the browser console or your OAuth consent screen settings.')
      }
    },
    onNonOAuthError: () => {
      setOauthErr(
        'Google blocked the sign-in prompt (popup or browser privacy settings). Allow popups for this site and try again.',
      )
    },
  })

  return (
    <div className="nav-auth-login-stack">
      <button
        type="button"
        className="nav-btn-login-google"
        onClick={() => {
          setOauthErr('')
          login()
        }}
      >
        <GoogleGIcon />
        <span className="nav-btn-login-google-text">Login</span>
      </button>
      {oauthErr ? (
        <p className="nav-auth-oauth-error" role="alert">
          {oauthErr}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Google Sign-In + session (server cookie). Renders nothing if Google is not configured.
 * @param {{ variant?: 'nav' | 'subscribe' | 'results' }} props
 */
export function NavAuthWidgets({ variant = 'nav' }) {
  const { user, loading, googleSignInEnabled, googleClientIdFormatOk, logout } = useAuth()

  if (!viteGoogleId || !googleSignInEnabled) {
    return null
  }

  const wrapClass =
    variant === 'subscribe'
      ? 'nav-auth-wrap nav-auth-wrap--subscribe'
      : variant === 'results'
        ? 'nav-auth-wrap nav-auth-wrap--results'
        : 'nav-auth-wrap'

  if (loading) {
    return (
      <div className={wrapClass} aria-busy="true">
        <span className="nav-auth-loading">…</span>
      </div>
    )
  }

  if (user) {
    return (
      <div className={wrapClass}>
        {user.picture ? (
          <img src={user.picture} alt="" className="nav-auth-avatar" width={28} height={28} />
        ) : null}
        <span className="nav-auth-name" title={user.email || ''}>
          {user.name || user.email || 'Signed in'}
        </span>
        <button
          type="button"
          className="nav-text-btn nav-auth-logout"
          title="Signs out your Google account on this app. NeighborIQ Pro is separate — use Manage to change billing."
          onClick={() => void logout()}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div className={`${wrapClass} nav-auth-google`}>
      {!googleClientIdFormatOk ? (
        <p className="nav-auth-oauth-error" role="status">
          GOOGLE_CLIENT_ID on the server does not look like a Web Client ID. Fix .env and restart the API.
        </p>
      ) : null}
      <GreenGoogleLoginButton />
    </div>
  )
}
