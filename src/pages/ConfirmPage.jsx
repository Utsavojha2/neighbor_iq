import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useParams } from '@tanstack/react-router'

export default function ConfirmPage() {
  const { token } = useParams({ strict: false })
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setMessage('No confirmation token provided.')
      setStatus('error')
      return
    }

    let cancelled = false

    // Defer the fetch with setTimeout so StrictMode's synchronous cleanup
    // can clearTimeout before the request ever leaves the browser.
    // AbortController alone is insufficient because the server processes the
    // first request before the client-side abort signal arrives.
    const id = setTimeout(() => {
      fetch(`/auth/confirm-email?token=${encodeURIComponent(token)}`)
        .then((r) => r.json().catch(() => ({})))
        .then((data) => {
          if (cancelled) return
          if (data.message && !data.statusCode) {
            setMessage(data.message)
            setStatus('success')
          } else {
            setMessage(
              Array.isArray(data.message)
                ? data.message.join('. ')
                : data.message || 'Confirmation failed. The link may have expired.',
            )
            setStatus('error')
          }
        })
        .catch(() => {
          if (cancelled) return
          setMessage('Could not reach the server. Please try again.')
          setStatus('error')
        })
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [token])

  return (
    <div className="confirm-page">
      <nav>
        <Link to="/" className="nav-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="nav-logo-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3.5" stroke="#fff" strokeWidth="1.5" />
              <path d="M8 9.5v5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="nav-logo-text">
            neighbor<span>IQ</span>
          </div>
        </Link>
      </nav>

      <div className="confirm-page-body">
        {status === 'loading' && (
          <div className="confirm-card">
            <div className="confirm-icon confirm-icon--loading">⏳</div>
            <h1 className="confirm-title">Confirming your email…</h1>
            <p className="confirm-sub">Just a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="confirm-card">
            <div className="confirm-icon confirm-icon--success">✓</div>
            <h1 className="confirm-title">Email confirmed!</h1>
            <p className="confirm-sub">{message}</p>
            <Link to="/" className="confirm-cta">
              Go to NeighborIQ →
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="confirm-card">
            <div className="confirm-icon confirm-icon--error">✕</div>
            <h1 className="confirm-title">Confirmation failed</h1>
            <p className="confirm-sub">{message}</p>
            <Link to="/" className="confirm-cta">
              Back to home →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
