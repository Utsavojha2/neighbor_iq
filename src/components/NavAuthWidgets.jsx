import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthForm } from './AuthForm'
import { SettingsModal } from './SettingsModal'

/**
 * Login/logout widgets for the nav bar.
 * The auth modal is portalled to document.body so nav's backdrop-filter
 * doesn't trap the fixed overlay inside the nav's stacking context.
 * @param {{ variant?: 'nav' | 'subscribe' | 'results' }} props
 */
export function NavAuthWidgets({ variant = 'nav' }) {
  const { user, loading, logout } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!modalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

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

  return (
    <>
      <div className={wrapClass}>
        {user ? (
          <>
            <span className="nav-auth-name" title={user.email}>
              Hi {user.name || user.email}
            </span>
            {variant === 'results' && (
              <button
                type="button"
                className="nav-settings-btn"
                onClick={() => setSettingsOpen(true)}
                aria-label="Account settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="nav-text-btn nav-auth-logout"
              onClick={() => logout()}
            >
              Log out
            </button>
          </>
        ) : (
          <button
            type="button"
            className="nav-btn-login"
            onClick={() => setModalOpen(true)}
          >
            Log in
          </button>
        )}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {modalOpen &&
        createPortal(
          <div
            className="auth-modal-overlay"
            onClick={() => setModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
          >
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="auth-modal-close"
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="auth-modal-logo">
                neighbor<span>IQ</span>
              </div>
              <AuthForm onSuccess={() => setModalOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
