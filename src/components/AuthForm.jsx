import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Standalone auth form (login + signup) with mode toggle.
 * Renders no modal chrome — embed inside any container.
 * @param {{ onSuccess?: () => void, loginTitle?: string }} props
 */
export function AuthForm({ onSuccess, loginTitle = 'Welcome back' }) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        const result = await login(email, password)
        if (result.ok) {
          onSuccess?.()
        } else {
          setError(result.error || 'Login failed. Check your credentials.')
        }
      } else {
        const result = await signup(name, email, password)
        if (result.ok) {
          setMessage(result.message || 'Account created! Check your email to confirm.')
          setName('')
          setEmail('')
          setPassword('')
        } else {
          setError(result.error || 'Sign up failed.')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="auth-modal-title">
        {mode === 'login' ? loginTitle : 'Create account'}
      </h2>

      {message ? (
        <div className="auth-modal-message">{message}</div>
      ) : (
        <form className="auth-modal-form" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <label className="auth-modal-label">
              Name
              <input
                type="text"
                className="auth-modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
              />
            </label>
          )}
          <label className="auth-modal-label">
            Email
            <input
              type="email"
              className="auth-modal-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-modal-label">
            Password
            <input
              type="password"
              className="auth-modal-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '••••••••' : 'Min 8 characters'}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && (
            <p className="auth-modal-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-modal-submit" disabled={submitting}>
            {submitting ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      )}

      <p className="auth-modal-switch">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          className="auth-modal-switch-btn"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  )
}
