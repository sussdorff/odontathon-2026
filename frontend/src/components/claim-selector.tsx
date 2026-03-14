import { useCallback, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { useBillingStore } from '@/stores/billing-store'
import type { Patient, BillingItem, Claim } from '@/types'

let itemCounter = 1000

function claimItemToBillingItem(claim: Claim): BillingItem[] {
  return claim.items.map((it) => ({
    id: `claim-${++itemCounter}`,
    code: it.code ?? '',
    system: it.system === 'GOÄ' ? 'BEMA' as const : it.system as 'GOZ' | 'BEMA',
    multiplier: it.system === 'GOZ' ? 2.3 : undefined,
    teeth: it.tooth ? [it.tooth] : [],
    description: [
      it.display ?? '',
      it.surfaces.length > 0 ? `(${it.surfaces.join(',')})` : '',
      it.note ? `— ${it.note}` : '',
    ].filter(Boolean).join(' '),
    checked: true,
  }))
}

interface ClaimSelectorProps {
  patient: Patient
}

export function ClaimSelector({ patient }: ClaimSelectorProps) {
  const {
    selectedClaimDate,
    setSelectedClaimDate,
    setBillingItems,
    setPriorHistory,
  } = useBillingStore()

  const claims = patient.claims

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const date = e.target.value || null
      setSelectedClaimDate(date)
    },
    [setSelectedClaimDate]
  )

  // When date changes, populate billing items and prior history
  useEffect(() => {
    if (!selectedClaimDate) {
      setBillingItems([])
      setPriorHistory([])
      return
    }

    const claim = claims.find((c) => c.date === selectedClaimDate)
    if (!claim) return

    // Billing items from the selected claim
    setBillingItems(claimItemToBillingItem(claim))

    // Prior history = all claims before the selected date
    const prior = claims
      .filter((c) => c.date < selectedClaimDate)
      .flatMap((c) =>
        c.items.map((i) => ({
          code: i.code ?? '',
          system: i.system,
          date: c.date,
          tooth: i.tooth,
        }))
      )
    setPriorHistory(prior)
  }, [selectedClaimDate, claims, setBillingItems, setPriorHistory])

  if (claims.length === 0) return null

  const selectedClaim = claims.find((c) => c.date === selectedClaimDate)
  const priorCount = claims.filter((c) => c.date < (selectedClaimDate ?? '')).length

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        <FileText size={12} className="inline mr-1" />
        Rechnung zur Analyse auswählen
      </label>

      <select
        value={selectedClaimDate ?? ''}
        onChange={handleDateChange}
        className="w-full px-3 py-2.5 text-sm border-2 border-blue-400 rounded-lg bg-blue-50
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
      >
        <option value="">— Rechnung wählen —</option>
        {claims.map((c) => {
          const teethStr = c.teeth.length > 0 ? `Zähne ${c.teeth.join(',')}` : ''
          return (
            <option key={c.id} value={c.date}>
              {c.date} — {c.itemCount} Pos. · {teethStr || 'kein Zahnbezug'} ({c.provider})
            </option>
          )
        })}
      </select>

      {/* Selected claim header */}
      {selectedClaim && (
        <div className="p-3 bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-xl">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-base font-bold text-blue-900">{selectedClaim.date}</span>
            <span className="text-[0.65rem] text-gray-400 font-mono">{selectedClaim.id}</span>
            <span className="ml-auto text-xs text-gray-500">{selectedClaim.provider}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-block px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-[0.68rem] text-gray-600">
              {selectedClaim.itemCount} Positionen
            </span>
            <span className="inline-block px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-[0.68rem] text-gray-600">
              Zähne: {selectedClaim.teeth.length > 0 ? selectedClaim.teeth.join(', ') : '—'}
            </span>
            {priorCount > 0 && (
              <span className="inline-block px-2.5 py-0.5 bg-white border border-gray-200 rounded-full text-[0.68rem] text-gray-600">
                {priorCount} vorige Rechnungen
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
