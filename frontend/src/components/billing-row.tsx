import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useBillingStore } from '@/stores/billing-store'
import { useCatalogSearch } from '@/lib/queries/use-catalog-search'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { BillingItem } from '@/types'

interface BillingRowProps {
  item: BillingItem
}

export function BillingRow({ item }: BillingRowProps) {
  const { toggleBillingItem, updateBillingItem, removeBillingItem } = useBillingStore()
  const [codeInput, setCodeInput] = useState(item.code)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isManual = !item.patternId
  const { data: searchData } = useCatalogSearch(
    isManual && showSuggestions ? codeInput : '',
    item.system
  )
  const suggestions = searchData?.results ?? []

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-calculate price when code/system/multiplier changes
  useEffect(() => {
    if (!item.code || !item.checked) {
      setLivePrice(null)
      setPriceError(null)
      return
    }
    const controller = new AbortController()
    const factor = item.multiplier ?? (item.system === 'GOZ' ? 2.3 : undefined)

    fetch('/api/billing/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ code: item.code, system: item.system, factor, kassenart: 'AOK' }],
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const b = data.breakdown?.[0]
        if (b?.error) {
          setLivePrice(null)
          setPriceError(b.error)
        } else if (b?.price != null) {
          setLivePrice(b.price)
          setPriceError(null)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [item.code, item.system, item.multiplier, item.checked])

  function selectSuggestion(code: string, title: string) {
    setCodeInput(code)
    setShowSuggestions(false)
    updateBillingItem(item.id, {
      code,
      description: title,
      multiplier: item.system === 'GOZ' ? 2.3 : undefined,
    })
  }

  function handleCodeChange(value: string) {
    setCodeInput(value)
    setShowSuggestions(value.length >= 2)
    updateBillingItem(item.id, { code: value })
  }

  function handleSystemChange(system: 'GOZ' | 'BEMA') {
    updateBillingItem(item.id, {
      system,
      multiplier: system === 'GOZ' ? 2.3 : undefined,
    })
  }

  const bgClass = item.patternId
    ? item.isRequired
      ? 'bg-green-50 border-green-200 hover:bg-green-100/70'
      : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/70'

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'flex gap-1.5 items-center px-2.5 py-2 rounded-lg border transition-colors relative',
        bgClass,
        !item.checked && 'opacity-50'
      )}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => toggleBillingItem(item.id)}
        className="shrink-0 cursor-pointer accent-blue-600"
      />
      <select
        value={item.system}
        onChange={(e) => handleSystemChange(e.target.value as 'GOZ' | 'BEMA')}
        className="w-[68px] shrink-0 px-1.5 py-1 text-xs font-semibold border border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-400"
      >
        <option>GOZ</option>
        <option>BEMA</option>
      </select>

      {/* Code input with autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={isManual ? codeInput : item.code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onFocus={() => codeInput.length >= 2 && isManual && setShowSuggestions(true)}
          placeholder="Code"
          readOnly={!isManual}
          className={cn(
            'w-[70px] shrink-0 px-1.5 py-1 text-xs font-bold border border-gray-300 rounded-md bg-white',
            'focus:outline-none focus:border-blue-400',
            !isManual && 'bg-gray-50 text-gray-700 cursor-default'
          )}
        />
        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-[380px] max-h-[240px] overflow-y-auto z-50 bg-white border border-gray-200 rounded-lg shadow-lg">
            {suggestions.map((s) => (
              <button
                key={`${s.system}:${s.code}`}
                onClick={() => selectSuggestion(s.code, s.title)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {s.code}
                  </span>
                  <span className="text-[0.65rem] text-gray-400 font-medium">{s.system}</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{s.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="number"
        value={item.multiplier ?? ''}
        onChange={(e) =>
          updateBillingItem(item.id, {
            multiplier: e.target.value ? parseFloat(e.target.value) : undefined,
          })
        }
        placeholder="Faktor"
        step="0.1"
        min="1"
        className="w-[60px] shrink-0 px-1.5 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-400"
      />
      <input
        type="text"
        value={item.teeth.join(',')}
        onChange={(e) =>
          updateBillingItem(item.id, {
            teeth: e.target.value
              .split(',')
              .map((t) => parseInt(t.trim()))
              .filter(Boolean),
          })
        }
        placeholder="Zähne"
        className="w-[72px] shrink-0 px-1.5 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-400"
      />
      <span
        className="flex-1 min-w-0 text-xs text-gray-500 truncate"
        title={item.description + (item.isRequired === false ? ' (optional)' : '')}
      >
        {item.description || <span className="italic text-gray-400">Beschreibung</span>}
        {item.isRequired === false && (
          <span className="ml-1 text-[0.65rem] text-amber-600 font-medium">(opt.)</span>
        )}
      </span>

      {/* Live price */}
      {item.checked && item.code && (
        <span
          className={cn(
            'shrink-0 text-xs font-semibold min-w-[60px] text-right',
            priceError ? 'text-red-400' : 'text-green-700'
          )}
          title={priceError ?? undefined}
        >
          {priceError ? '—' : livePrice != null ? formatCurrency(livePrice) : '...'}
        </span>
      )}

      <button
        onClick={() => removeBillingItem(item.id)}
        className="shrink-0 text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-0.5 rounded"
        title="Position entfernen"
      >
        <X size={14} />
      </button>
    </div>
  )
}
