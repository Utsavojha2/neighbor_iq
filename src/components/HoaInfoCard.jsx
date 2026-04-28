import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function HoaInfoCard({ address }) {
  const { user } = useAuth()
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [data, setData] = useState(null)

  const isBuyer = user?.housingIntent === 'buy'

  useEffect(() => {
    if (!isBuyer || !address) return
    setState('loading')
    fetch(`/score/hoa?address=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setState('done') })
      .catch(() => setState('error'))
  }, [isBuyer, address])

  if (!isBuyer) return null
  if (state === 'idle' || state === 'error') return null
  if (state === 'loading') return (
    <div className="campus-card campus-card--skeleton">
      <div className="campus-card-shimmer" />
    </div>
  )

  const { hasHoa, hoaFee, hoaFeeFrequency, propertyType, source } = data || {}

  if (source === 'unavailable') return null

  return (
    <div className="hoa-card">
      <p className="campus-card-eyebrow">🏠 HOA Information</p>

      <div className="hoa-status-row">
        <div className={`hoa-badge ${hasHoa ? 'hoa-badge--yes' : 'hoa-badge--no'}`}>
          {hasHoa === null ? '?' : hasHoa ? 'Yes' : 'No'}
        </div>
        <div className="hoa-status-text">
          <p className="hoa-status-label">HOA Restrictions</p>
          {hasHoa === null && <p className="hoa-status-sub">No listing data found for this address</p>}
          {hasHoa === false && <p className="hoa-status-sub">No homeowners association on record</p>}
          {hasHoa === true && <p className="hoa-status-sub">HOA applies — fees and rules may restrict use</p>}
        </div>
      </div>

      {hasHoa && hoaFee && (
        <>
          <div className="campus-divider" style={{ margin: '16px 0' }} />
          <div className="hoa-fee-row">
            <div className="hoa-fee-chip">
              <p className="hoa-fee-amount">${hoaFee.toLocaleString()}</p>
              <p className="hoa-fee-period">{hoaFeeFrequency || 'Monthly'}</p>
            </div>
            {propertyType && (
              <div className="hoa-property-type">
                <p className="hoa-property-label">Property type</p>
                <p className="hoa-property-val">{propertyType}</p>
              </div>
            )}
          </div>
        </>
      )}

      {propertyType && !hasHoa && (
        <p className="campus-disclaimer" style={{ marginTop: '12px' }}>{propertyType} · No HOA fee</p>
      )}

    
    </div>
  )
}
