import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const TOTAL_STEPS = 3

const PREFERENCE_OPTIONS = [
  { id: 'cost',      label: 'Better cost of living' },
  { id: 'transit',   label: 'Better transit' },
  { id: 'safety',    label: 'Safe neighborhoods' },
  { id: 'amenities', label: 'Easy access to amenities' },
  { id: 'nightlife', label: 'Better nightlife' },
]

export function OnboardingModal() {
  const { user, token, refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [housingIntent, setHousingIntent] = useState(null)
  const [isStudent, setIsStudent] = useState(null)
  const [university, setUniversity] = useState('')
  const [preferences, setPreferences] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!user || user.isOnboarded) return null

  const togglePref = (id) =>
    setPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )

  const canContinue = () => {
    if (step === 1) return housingIntent !== null
    if (step === 2) return isStudent !== null && (isStudent === false || university.trim().length > 0)
    if (step === 3) return preferences.length > 0
    return false
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/auth/me/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          housingIntent,
          isStudent,
          university: isStudent ? university.trim() : undefined,
          preferences,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      await refreshUser(token)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setSubmitting(true)
    try {
      await fetch('/auth/me/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          housingIntent: housingIntent ?? 'rent',
          isStudent: isStudent ?? false,
          preferences: preferences.length ? preferences : [],
        }),
      })
      await refreshUser(token)
    } catch {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="onboarding-backdrop" role="dialog" aria-modal aria-label="Welcome to NeighborIQ">
      <div className="onboarding-card">
        {/* Progress bar */}
        <div className="onboarding-progress">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`onboarding-progress-dot ${i + 1 <= step ? 'onboarding-progress-dot--active' : ''}`}
            />
          ))}
        </div>

        <p className="onboarding-step-label">Step {step} of {TOTAL_STEPS}</p>

        {/* ── Step 1: Housing intent ── */}
        {step === 1 && (
          <div className="onboarding-step">
            <h2 className="onboarding-heading">Are you looking to buy or rent?</h2>
            <p className="onboarding-sub">We'll tailor your neighborhood scores to match your goals.</p>
            <div className="onboarding-options">
              <button
                type="button"
                className={`onboarding-option ${housingIntent === 'buy' ? 'onboarding-option--selected' : ''}`}
                onClick={() => setHousingIntent('buy')}
              >
                <span className="onboarding-option-icon">🏠</span>
                Buy a house
              </button>
              <button
                type="button"
                className={`onboarding-option ${housingIntent === 'rent' ? 'onboarding-option--selected' : ''}`}
                onClick={() => setHousingIntent('rent')}
              >
                <span className="onboarding-option-icon">🔑</span>
                Rent / Lease
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Student ── */}
        {step === 2 && (
          <div className="onboarding-step">
            <h2 className="onboarding-heading">Are you a student?</h2>
            <p className="onboarding-sub">Student areas often have unique trade-offs worth highlighting.</p>
            <div className="onboarding-options">
              <button
                type="button"
                className={`onboarding-option ${isStudent === true ? 'onboarding-option--selected' : ''}`}
                onClick={() => setIsStudent(true)}
              >
                <span className="onboarding-option-icon">🎓</span>
                Yes, I'm a student
              </button>
              <button
                type="button"
                className={`onboarding-option ${isStudent === false ? 'onboarding-option--selected' : ''}`}
                onClick={() => { setIsStudent(false); setUniversity('') }}
              >
                <span className="onboarding-option-icon">💼</span>
                No
              </button>
            </div>
            {isStudent && (
              <div className="onboarding-university-wrap">
                <label className="onboarding-label" htmlFor="onboarding-university">
                  Which university?
                </label>
                <input
                  id="onboarding-university"
                  type="text"
                  className="onboarding-input"
                  placeholder="e.g. Clark University"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Preferences ── */}
        {step === 3 && (
          <div className="onboarding-step">
            <h2 className="onboarding-heading">What matters most to you?</h2>
            <p className="onboarding-sub">Pick everything that applies — we'll weight your scores accordingly.</p>
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
        )}

        {error && <p className="onboarding-error">{error}</p>}

        {/* ── Footer ── */}
        <div className="onboarding-footer">
          {step > 1 && (
            <button
              type="button"
              className="onboarding-btn-back"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
            >
              Back
            </button>
          )}
          <div className="onboarding-footer-right">
            <button
              type="button"
              className="onboarding-btn-skip"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip for now
            </button>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="onboarding-btn-next"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue()}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-btn-next"
                onClick={handleSubmit}
                disabled={!canContinue() || submitting}
              >
                {submitting ? 'Saving…' : 'Get started'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
