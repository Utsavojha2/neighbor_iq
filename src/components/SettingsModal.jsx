import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const PREFERENCE_OPTIONS = [
  { id: 'cost',      label: 'Better cost of living' },
  { id: 'transit',   label: 'Better transit' },
  { id: 'safety',    label: 'Safe neighborhoods' },
  { id: 'amenities', label: 'Easy access to amenities' },
  { id: 'nightlife', label: 'Better nightlife' },
]

export function SettingsModal({ onClose }) {
  const { user, token, refreshUser } = useAuth()

  const [name, setName]               = useState(user?.name || '')
  const [isStudent, setIsStudent]     = useState(user?.isStudent ?? false)
  const [affiliation, setAffiliation] = useState(user?.university || '')
  const [housingIntent, setHousingIntent] = useState(user?.housingIntent || 'rent')
  const [preferences, setPreferences] = useState(user?.preferences || [])
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const togglePref = (id) =>
    setPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )

  const handleUpdate = async () => {
    setSubmitting(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/auth/me/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          housingIntent,
          isStudent,
          university: affiliation.trim() || undefined,
          preferences,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      await refreshUser(token)
      setSuccess(true)
      setTimeout(onClose, 900)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="settings-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Account settings"
    >
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Account Settings</h2>
          <button type="button" className="settings-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="settings-modal-body">

          {/* Name */}
          <div className="settings-field">
            <label className="onboarding-label" htmlFor="settings-name">Name</label>
            <input
              id="settings-name"
              type="text"
              className="onboarding-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Student / Professional toggle */}
          <div className="settings-field">
            <p className="onboarding-label">I am a</p>
            <div className="settings-toggle-row">
              <button
                type="button"
                className={`settings-toggle-btn ${isStudent ? 'settings-toggle-btn--active' : ''}`}
                onClick={() => setIsStudent(true)}
              >
                🎓 Student
              </button>
              <button
                type="button"
                className={`settings-toggle-btn ${!isStudent ? 'settings-toggle-btn--active' : ''}`}
                onClick={() => setIsStudent(false)}
              >
                💼 Professional
              </button>
            </div>
          </div>

          {/* University / Company */}
          <div className="settings-field">
            <label className="onboarding-label" htmlFor="settings-affiliation">
              {isStudent ? 'University' : 'Company / Employer'}
            </label>
            <input
              id="settings-affiliation"
              type="text"
              className="onboarding-input"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder={isStudent ? 'e.g. Clark University' : 'e.g. Google'}
            />
          </div>

          {/* Housing intent */}
          <div className="settings-field">
            <p className="onboarding-label">Looking to</p>
            <div className="settings-toggle-row">
              <button
                type="button"
                className={`settings-toggle-btn ${housingIntent === 'buy' ? 'settings-toggle-btn--active' : ''}`}
                onClick={() => setHousingIntent('buy')}
              >
                🏠 Buy a house
              </button>
              <button
                type="button"
                className={`settings-toggle-btn ${housingIntent === 'rent' ? 'settings-toggle-btn--active' : ''}`}
                onClick={() => setHousingIntent('rent')}
              >
                🔑 Rent / Lease
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="settings-field">
            <p className="onboarding-label">What matters most to you</p>
            <div className="onboarding-prefs">
              {PREFERENCE_OPTIONS.map((opt) => {
                const selected = preferences.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`onboarding-pref ${selected ? 'onboarding-pref--selected' : ''}`}
                    onClick={() => togglePref(opt.id)}
                    aria-pressed={selected}
                  >
                    {selected && <span className="onboarding-pref-check" aria-hidden>✓</span>}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        {error && <p className="onboarding-error">{error}</p>}
        {success && <p className="settings-success">Saved!</p>}

        <div className="settings-modal-footer">
          <button type="button" className="onboarding-btn-skip" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="onboarding-btn-next"
            onClick={handleUpdate}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Update'}
          </button>
        </div>

      </div>
    </div>,
    document.body,
  )
}
