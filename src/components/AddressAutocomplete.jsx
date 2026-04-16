import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { fetchGooglePlacePredictions, isGooglePlacesEnabled } from '../lib/googlePlacePredictions'
import { fetchPhotonSuggestions } from '../lib/photonAddress'

const MIN_CHARS = 3
const DEBOUNCE_MS = 320
const FETCH_TIMEOUT_MS = 8000

async function fetchSuggestions(query, signal, useGoogle) {
  if (useGoogle) {
    return fetchGooglePlacePredictions(query, signal)
  }
  return fetchPhotonSuggestions(query, signal)
}

export function AddressAutocomplete({
  id: idProp,
  label,
  'aria-label': ariaLabel,
  value,
  onChange,
  placeholder,
  inputClassName = '',
  labelClassName = 'text-[11px] tracking-[0.12em] text-muted uppercase',
}) {
  const uid = useId()
  const id = idProp ?? `addr-${uid}`
  const listId = `${id}-listbox`
  const useGoogle = isGooglePlacesEnabled()

  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [highlighted, setHighlighted] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [lastQueried, setLastQueried] = useState('')

  const rootRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
  const searchSeqRef = useRef(0)

  const resetSuggestions = useCallback(() => {
    searchSeqRef.current += 1
    if (abortRef.current) abortRef.current.abort()
    setSuggestions([])
    setHighlighted(-1)
    setLoading(false)
    setLastQueried('')
  }, [])

  const runSearch = useCallback(
    (q) => {
      if (abortRef.current) abortRef.current.abort()
      const ac = new AbortController()
      abortRef.current = ac
      const seq = ++searchSeqRef.current
      const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
      setLoading(true)
      fetchSuggestions(q, ac.signal, useGoogle)
        .then((lines) => {
          if (seq !== searchSeqRef.current) return
          setSuggestions(lines)
          setHighlighted(lines.length ? 0 : -1)
          setLastQueried(q)
        })
        .catch(() => {
          if (seq !== searchSeqRef.current) return
          setSuggestions([])
          setHighlighted(-1)
          setLastQueried(q)
        })
        .finally(() => {
          clearTimeout(t)
          if (seq === searchSeqRef.current) setLoading(false)
        })
    },
    [useGoogle],
  )

  useEffect(() => {
    const q = value.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < MIN_CHARS) {
      return
    }

    debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, runSearch])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (line) => {
    onChange(line)
    setSuggestions([])
    setHighlighted(-1)
    setOpen(false)
  }

  const qNow = value.trim()
  const showEmpty =
    !loading && suggestions.length === 0 && qNow === lastQueried && lastQueried.length >= MIN_CHARS
  const showList =
    open && qNow.length >= MIN_CHARS && (loading || suggestions.length > 0 || showEmpty)

  const onKeyDown = (e) => {
    if (!showList && e.key !== 'Escape') return

    if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
      return
    }
    if (!suggestions.length && !loading) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0 && suggestions[highlighted]) {
      e.preventDefault()
      pick(suggestions[highlighted])
    }
  }

  const inputAriaLabel = ariaLabel ?? label ?? placeholder ?? 'Address'

  const handleChange = (v) => {
    onChange(v)
    setOpen(true)
    if (v.trim().length < MIN_CHARS) {
      resetSuggestions()
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        type="text"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={
          showList && highlighted >= 0 ? `${id}-opt-${highlighted}` : undefined
        }
        aria-label={label ? undefined : inputAriaLabel}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[150] mt-1 max-h-60 w-full overflow-y-auto border-2 border-ink bg-card py-1 shadow-[4px_4px_0_0_var(--ink)]"
        >
          {loading && !suggestions.length ? (
            <li className="px-3 py-2.5 text-xs text-muted" role="presentation">
              {useGoogle ? 'Searching Google Places…' : 'Searching…'}
            </li>
          ) : null}
          {showEmpty ? (
            <li className="px-3 py-2.5 text-xs text-muted" role="presentation">
              No suggestions — keep typing or enter your address manually.
            </li>
          ) : null}
          {suggestions.map((line, i) => (
            <li
              key={`${line}-${i}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === highlighted}
              className={`cursor-pointer px-3 py-2.5 text-left text-xs leading-snug transition ${
                i === highlighted ? 'bg-tag text-ink' : 'text-ink hover:bg-tag/70'
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(line)}
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
