import { useCallback, useState, useRef, useEffect } from 'react'
import {
  Loader2, ChevronRight, ChevronDown, FileText, ClipboardList,
  AlertCircle, AlertTriangle, Lightbulb, Info, Check, X, Plus, Minus, RefreshCw,
  User, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePatients } from '@/lib/queries/use-patients'
import { useBillingStore } from '@/stores/billing-store'
import { apiFetch } from '@/lib/api'
import type { ClaimItem, Proposal, ApplyResult, Severity } from '@/types'

const SYS_CLS: Record<string, string> = {
  GOZ: 'bg-blue-100 text-blue-700', BEMA: 'bg-purple-100 text-purple-700', 'GOÄ': 'bg-amber-100 text-amber-700',
}
const SEV: Record<Severity, { icon: React.ReactNode; ring: string; bg: string }> = {
  error: { icon: <AlertCircle size={13} />, ring: 'ring-red-200', bg: 'bg-red-50' },
  warning: { icon: <AlertTriangle size={13} />, ring: 'ring-amber-200', bg: 'bg-amber-50' },
  suggestion: { icon: <Lightbulb size={13} />, ring: 'ring-green-200', bg: 'bg-green-50' },
  info: { icon: <Info size={13} />, ring: 'ring-blue-200', bg: 'bg-blue-50' },
}

export function InvoiceAnalysisPanel() {
  const { data: pd, isLoading: pLoading } = usePatients()
  const patients = pd?.patients ?? []
  const {
    selectedPatientId, setSelectedPatientId, selectedClaimDate,
    isAnalyzing, report,
  } = useBillingStore()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(pickerSearch.toLowerCase()),
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const patient = patients.find((p) => p.id === selectedPatientId) ?? null
  const claim = patient?.claims.find((c) => c.date === selectedClaimDate)
  const priorClaims = patient?.claims.filter((c) => c.date < (selectedClaimDate ?? '')) ?? []
  const procedures = patient?.procedures.filter((p) => p.date && p.date === selectedClaimDate) ?? []
  const encounters = patient?.encounters.filter((e) => e.date && e.date === selectedClaimDate) ?? []
  const billingProposals = (report?.proposals ?? []).filter((p) => p.billingChange)
  const docProposals = (report?.proposals ?? []).filter((p) => p.documentationChange)

  return (
    <div className="space-y-4">
      {/* ── Step 1: Patient picker ── */}
      <div ref={pickerRef} className={`relative ${isAnalyzing ? 'opacity-60 pointer-events-none' : ''}`}>
        {patient ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded font-bold uppercase',
                  patient.coverageType === 'PKV'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-teal-50 text-teal-700',
                )}>
                  {patient.coverageType}
                </span>
                {patient.bonusPercent > 0 && (
                  <span className="text-xs text-amber-600 font-medium">{patient.bonusPercent}% Bonus</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {patient.findingsCount} Befunde
              </p>
            </div>

            {/* Inline invoice selector when patient is selected */}
            {patient.claims.length > 0 && (
              <div className="shrink-0 min-w-[360px]">
                <label className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">Rechnung</label>
                <InvoiceSelect patient={patient} disabled={isAnalyzing} />
              </div>
            )}

            <button
              onClick={() => { setSelectedPatientId(null); setPickerOpen(false) }}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 shrink-0"
              title="Patient wechseln"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="w-full bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-300 hover:border-teal-400
              p-6 flex items-center justify-center gap-3 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span className="font-medium">
              {pLoading ? 'Patienten werden geladen...' : 'Patient auswaehlen'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Dropdown */}
        {pickerOpen && !patient && (
          <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-80">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Patient suchen..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg
                    focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-56">
              {filteredPatients.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  {pLoading ? 'Laden...' : 'Keine Patienten gefunden'}
                </div>
              ) : (
                filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id)
                      setPickerOpen(false)
                      setPickerSearch('')
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.findingsCount} Befunde &middot; {p.claims.length} Rechnung{p.claims.length !== 1 ? 'en' : ''}
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded font-bold uppercase',
                      p.coverageType === 'PKV'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-50 text-teal-700',
                    )}>
                      {p.coverageType}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Empty states ── */}
      {!patient && !pLoading && !pickerOpen && (
        <EmptyState icon={<User size={32} />} title="Patient auswählen" description="Wählen Sie einen Patienten, um dessen Rechnungen zu prüfen." />
      )}
      {patient && !selectedClaimDate && (
        <EmptyState icon={<FileText size={32} />} title="Rechnung auswählen"
          description={`${patient.claims.length} Rechnung${patient.claims.length !== 1 ? 'en' : ''} verfügbar für ${patient.name}. Wählen Sie eine Rechnung zur Analyse.`} />
      )}

      {/* ── Clinical documentation ── */}
      {claim && (procedures.length > 0 || encounters.length > 0) && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-b border-emerald-200">
            <ClipboardList size={15} className="text-emerald-700" />
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Klinische Dokumentation</span>
            <span className="text-[0.65rem] text-emerald-600 ml-auto">{selectedClaimDate}</span>
          </div>

          {/* Encounter reason */}
          {encounters.length > 0 && (
            <div className="px-5 pt-4 pb-2">
              {encounters.map((enc) => (
                <div key={enc.id} className="flex items-start gap-3">
                  <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider shrink-0 mt-0.5 w-16">Anlass</span>
                  <div className="text-sm text-slate-700">
                    {enc.reason ?? '—'}
                    {enc.tooth ? <span className="ml-2 text-xs text-slate-400">Zahn {enc.tooth}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Procedures as individual cards */}
          {procedures.length > 0 && (
            <div className="px-5 py-3 space-y-3">
              {procedures.map((proc) => {
                // Split long display into a short title + detail parts
                const parts = (proc.display ?? '').split(',').map((s) => s.trim()).filter(Boolean)
                const title = parts[0] || proc.display
                const details = parts.slice(1)
                // Split notes on sentence boundaries for readability
                const sentences = proc.notes.flatMap((n) =>
                  n.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean)
                )
                return (
                  <div key={proc.id} className="bg-slate-50 rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-900">{title}</span>
                      {proc.code && (
                        <code className="text-[0.65rem] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">{proc.code}</code>
                      )}
                      {proc.tooth && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">Zahn {proc.tooth}</span>
                      )}
                      <span className={cn(
                        'text-[0.6rem] px-2 py-0.5 rounded-full font-medium ml-auto',
                        proc.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                      )}>
                        {proc.status}
                      </span>
                    </div>

                    {/* Detail parts from the display string */}
                    {details.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {details.map((d, i) => (
                          <span key={i} className="text-[0.7rem] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">{d}</span>
                        ))}
                      </div>
                    )}

                    {/* Clinical notes split into individual sentences */}
                    {sentences.length > 0 && (
                      <div className="space-y-1 mt-2 pl-3 border-l-2 border-emerald-300">
                        {sentences.map((s, i) => (
                          <p key={i} className="text-xs text-slate-600 leading-relaxed">{s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Doc proposals */}
          {docProposals.length > 0 && (
            <div className="px-5 pb-3 space-y-1.5 border-t border-slate-100 pt-3">
              {docProposals.map((p) => <InlineProposal key={p.id} proposal={p} />)}
            </div>
          )}
        </section>
      )}

      {/* ── Billing table ── */}
      {claim && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <FileText size={15} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Rechnung</span>
            <span className="text-xs text-slate-500">{selectedClaimDate}</span>
            <span className="ml-auto text-xs text-slate-400">
              {claim.itemCount} Pos. · {claim.provider}
              {patient && <span className="ml-2">{patient.coverageType === 'PKV' ? '🔒 PKV' : '🏥 GKV'}{patient.bonusPercent > 0 ? ` · ${patient.bonusPercent}% Bonus` : ''}</span>}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {claim.items.map((item, idx) => {
              const itemProposals = billingProposals.filter(
                (p) => p.billingChange?.existingItemIndex === idx ||
                  (p.billingChange?.code === item.code && p.billingChange?.type !== 'add_code')
              )
              return (
                <div key={idx}>
                  <BillingRow item={item} index={idx} hasIssue={itemProposals.some((p) => p.severity === 'error' || p.severity === 'warning')} />
                  {itemProposals.map((p) => <InlineProposal key={p.id} proposal={p} />)}
                </div>
              )
            })}
            {/* New codes to add — show proposals not already attached to an existing row */}
            {billingProposals
              .filter((p) => {
                if (p.billingChange?.type !== 'add_code') return false
                const attachedToExisting = claim.items.some((it, idx) =>
                  billingProposals.some((bp) => bp.id === p.id &&
                    (bp.billingChange?.existingItemIndex === idx || (bp.billingChange?.code === it.code && bp.billingChange?.type !== 'add_code')))
                )
                return !attachedToExisting
              })
              .map((p) => <InlineProposal key={p.id} proposal={p} />)}
          </div>

          {/* Total */}
          {claim.total > 0 && (
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-700">Gesamt</span>
              <span className="text-sm font-bold text-slate-900">{claim.total.toFixed(2)} €</span>
            </div>
          )}

          {/* Prior invoices */}
          {priorClaims.length > 0 && <PriorLink claims={priorClaims} beforeDate={selectedClaimDate!} />}
        </section>
      )}

      {/* ── Analyze button — hidden when report exists (user should review proposals first) ── */}
      {claim && !report && <AnalyzeBtn />}

      {/* ── Apply bar ── */}
      {report && report.proposals.length > 0 && <ApplyBar />}
    </div>
  )
}

/* ── Sub-components ── */

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-500 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 max-w-sm">{description}</p>
    </div>
  )
}

function InvoiceSelect({ patient, disabled }: { patient: any; disabled?: boolean }) {
  const { selectedClaimDate, setSelectedClaimDate, setBillingItems, setPriorHistory } = useBillingStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectClaim = useCallback((date: string | null) => {
    setSelectedClaimDate(date)
    setOpen(false)
    if (!date) { setBillingItems([]); setPriorHistory([]); return }
    const claim = patient.claims.find((c: any) => c.date === date)
    if (!claim) return
    let ctr = 2000
    setBillingItems(claim.items.map((it: ClaimItem, idx: number) => ({
      id: `c-${++ctr}`, code: it.code ?? '', system: it.system as 'GOZ' | 'BEMA' | 'GOÄ',
      multiplier: it.system === 'GOZ' ? 2.3 : undefined, teeth: it.tooth ? [it.tooth] : [],
      description: it.display ?? '', checked: true,
      session: it.session, note: it.note, originalIndex: idx,
    })))
    setPriorHistory(patient.claims.filter((c: any) => c.date < date).flatMap((c: any) =>
      c.items.map((i: ClaimItem) => ({ code: i.code ?? '', system: i.system, date: c.date, tooth: i.tooth }))
    ))
  }, [patient, setSelectedClaimDate, setBillingItems, setPriorHistory])

  const selected = patient.claims.find((c: any) => c.date === selectedClaimDate)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full text-left px-4 py-2.5 text-sm rounded-xl border-2 transition-colors flex items-center gap-2',
          selected
            ? 'bg-blue-50 border-blue-300 text-slate-800'
            : 'bg-white border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-700',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <FileText className="w-4 h-4 shrink-0 text-slate-400" />
        {selected ? (
          <span className="flex-1 truncate">
            <span className="font-semibold">{selected.date}</span>
            <span className="text-slate-500"> · {selected.itemCount} Pos.</span>
            {selected.teeth?.length > 0 && <span className="text-slate-400"> · Z.{selected.teeth.join(',')}</span>}
          </span>
        ) : (
          <span className="flex-1">Rechnung waehlen</span>
        )}
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-y-auto max-h-56">
            {patient.claims.map((c: any) => (
              <button
                key={c.id}
                onClick={() => selectClaim(c.date)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0',
                  c.date === selectedClaimDate
                    ? 'bg-teal-50'
                    : 'hover:bg-teal-50/50',
                )}
              >
                <FileText className="w-4 h-4 shrink-0 text-slate-300" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{c.date}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.itemCount} Positionen{c.teeth?.length > 0 ? ` · Z.${c.teeth.join(',')}` : ''} · {c.provider}
                  </div>
                </div>
                {c.date === selectedClaimDate && (
                  <Check className="w-4 h-4 shrink-0 text-teal-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BillingRow({ item, index, hasIssue }: { item: ClaimItem; index: number; hasIssue: boolean }) {
  const hasDetails = item.tooth || item.surfaces.length > 0 || item.note
  return (
    <div className={cn(
      'px-5 py-3 transition-colors',
      hasIssue ? 'bg-red-50/60' : 'hover:bg-slate-50/50',
    )}>
      {/* Main row */}
      <div className="flex items-center gap-2.5">
        <span className="text-[0.65rem] text-slate-300 w-5 text-right shrink-0 font-mono">{index + 1}</span>
        <span className={cn('px-1.5 py-0.5 rounded text-[0.6rem] font-bold shrink-0', SYS_CLS[item.system] || 'bg-gray-100 text-gray-600')}>{item.system}</span>
        <code className="font-bold text-slate-800 w-12 shrink-0 text-sm">{item.code}</code>
        <span className="text-sm text-slate-700 flex-1">{item.display}</span>
        {hasIssue && <AlertCircle size={14} className="text-red-400 shrink-0" />}
        {item.price > 0 && (
          <span className="text-sm font-medium text-slate-500 shrink-0 tabular-nums">{item.price.toFixed(2)} €</span>
        )}
      </div>

      {/* Detail row: tooth, surfaces, notes — fully visible */}
      {hasDetails && (
        <div className="flex items-center gap-2 mt-1.5 ml-[5.5rem]">
          {item.tooth && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">Zahn {item.tooth}</span>
          )}
          {item.surfaces.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
              {item.surfaces.join(', ')}
            </span>
          )}
          {item.note && (
            <span className="text-xs text-slate-500 italic">{item.note}</span>
          )}
        </div>
      )}
    </div>
  )
}

function InlineProposal({ proposal }: { proposal: Proposal }) {
  const { proposalDecisions, setProposalDecision } = useBillingStore()
  const decision = proposalDecisions[proposal.id] ?? null
  const s = SEV[proposal.severity]
  const bc = proposal.billingChange
  const dc = proposal.documentationChange

  return (
    <div className={`mx-3 my-1 px-3 py-2 rounded-lg ring-1 transition-all ${
      decision === 'approve' ? 'ring-green-400 bg-green-50/80' :
      decision === 'reject' ? 'opacity-40 ring-gray-200 bg-gray-50' :
      `${s.ring} ${s.bg}`
    }`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{s.icon}</span>
        <div className={`flex-1 min-w-0 ${decision === 'reject' ? 'line-through' : ''}`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 flex-wrap">
            {bc?.type === 'add_code' && <><Plus size={11} className="text-green-600" /><span className={`px-1 py-px rounded text-[0.55rem] font-bold ${SYS_CLS[bc.system] || ''}`}>{bc.system} {bc.code}</span><span className="text-green-600">hinzufügen</span></>}
            {bc?.type === 'remove_code' && <><Minus size={11} className="text-red-600" /><span className={`px-1 py-px rounded text-[0.55rem] font-bold ${SYS_CLS[bc.system] || ''}`}>{bc.system} {bc.code}</span><span className="text-red-600">entfernen</span></>}
            {bc?.type === 'update_multiplier' && <><RefreshCw size={11} className="text-amber-600" /><span className={`px-1 py-px rounded text-[0.55rem] font-bold ${SYS_CLS[bc.system] || ''}`}>{bc.system} {bc.code}</span><span className="text-amber-700">{bc.currentMultiplier}× → {bc.newMultiplier}×</span></>}
            {dc?.type === 'flag_unbilled_service' && <span className="text-amber-700">⚠ Dokumentiert, nicht abgerechnet: {dc.system} {dc.code}</span>}
            {dc?.type === 'flag_missing_documentation' && <span className="text-red-600">⚠ Nicht dokumentiert: {dc.system} {dc.code}</span>}
            {dc?.type === 'add_field' && <span className="text-blue-700">📝 {dc.fieldLabel}</span>}
            {bc?.estimatedRevenueDelta != null && bc.estimatedRevenueDelta !== 0 && (
              <span className={`ml-auto text-[0.65rem] font-bold shrink-0 ${bc.estimatedRevenueDelta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {bc.estimatedRevenueDelta > 0 ? '+' : ''}{bc.estimatedRevenueDelta.toFixed(2)}€
              </span>
            )}
          </div>
          <p className="text-[0.68rem] text-gray-500 mt-0.5 leading-snug">{proposal.description}</p>
        </div>
        <div className="flex gap-1 shrink-0 ml-1">
          <button onClick={() => setProposalDecision(proposal.id, decision === 'approve' ? null : 'approve')} title="Annehmen"
            className={`p-1 rounded transition-colors ${decision === 'approve' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'}`}>
            <Check size={12} />
          </button>
          <button onClick={() => setProposalDecision(proposal.id, decision === 'reject' ? null : 'reject')} title="Ablehnen"
            className={`p-1 rounded transition-colors ${decision === 'reject' ? 'bg-red-600 text-white' : 'bg-white text-red-500 border border-red-200 hover:bg-red-50'}`}>
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PriorLink({ claims, beforeDate }: { claims: any[]; beforeDate: string }) {
  const [open, setOpen] = useState(false)
  const total = claims.reduce((s: number, c: any) => s + c.itemCount, 0)
  return (
    <div className="border-t border-gray-100">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-2 text-[0.65rem] text-gray-400 hover:text-gray-600 transition-colors">
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {total} vorige Positionen aus {claims.length} Rechnungen (vor {beforeDate})
      </button>
      {open && (
        <div className="px-4 pb-2 space-y-0.5">
          {claims.map((c: any) => (
            <div key={c.id} className="text-[0.65rem] text-gray-400">
              <span className="font-semibold text-gray-500">{c.date}</span> · {c.itemCount} Pos.{c.teeth?.length ? ` · Z.${c.teeth.join(',')}` : ''} · {c.provider}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalyzeBtn() {
  const {
    selectedPatientId, selectedClaimDate, billingItems, priorHistory, isAnalyzing, analysisStatus,
    setIsAnalyzing, addLogEntry, clearLog, setAnalysisStatus, setReport, resetAnalysis,
  } = useBillingStore()
  const { data: pd } = usePatients()
  const name = pd?.patients.find((p) => p.id === selectedPatientId)?.name

  const run = useCallback(async () => {
    if (!selectedPatientId || isAnalyzing) return
    const items = billingItems.filter((i) => i.checked && i.code)
    if (!items.length) return
    resetAnalysis(); setIsAnalyzing(true); clearLog()
    setAnalysisStatus(`Analyse für ${name}...`)
    try {
      const res = await apiFetch<{ sessionId: string; streamUrl: string }>('/api/agent/analyze', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          billingItems: items.map((it) => ({
            code: it.code, system: it.system, multiplier: it.multiplier, teeth: it.teeth,
            index: it.originalIndex, session: it.session, note: it.note,
          })),
          history: priorHistory, analysisDate: selectedClaimDate ?? undefined,
        }),
      })
      const es = new EventSource(res.streamUrl)
      es.addEventListener('analysis_status', (e) => { const d = JSON.parse(e.data); setAnalysisStatus(d.label || 'Analyse läuft...') })
      es.addEventListener('analysis_complete', (e) => { const d = JSON.parse(e.data); setIsAnalyzing(false); setAnalysisStatus(''); if (d.report) setReport(d.report); es.close() })
      es.addEventListener('analysis_error', (e) => { const d = JSON.parse(e.data); addLogEntry('error', d.error); setIsAnalyzing(false); setAnalysisStatus(''); es.close() })
      es.onerror = () => { setIsAnalyzing(false); setAnalysisStatus('') }
    } catch (err) { addLogEntry('error', (err as Error).message); setIsAnalyzing(false); setAnalysisStatus('') }
  }, [selectedPatientId, selectedClaimDate, billingItems, priorHistory, isAnalyzing, name, resetAnalysis, setIsAnalyzing, clearLog, setAnalysisStatus, addLogEntry, setReport])

  return (
    <div className="space-y-2">
      <Button className="w-full py-3 text-sm" onClick={run} disabled={!selectedPatientId || !selectedClaimDate || isAnalyzing}>
        {isAnalyzing ? (
          <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{analysisStatus || 'Analyse läuft...'}</span>
        ) : (
          <span className="flex items-center gap-2"><Search size={16} />Rechnung analysieren</span>
        )}
      </Button>
    </div>
  )
}

function ApplyBar() {
  const { report, selectedPatientId, selectedClaimDate, proposalDecisions } = useBillingStore()
  const { data: pd, refetch: refetchPatients } = usePatients()
  const claimId = pd?.patients.find((p) => p.id === selectedPatientId)?.claims.find((c) => c.date === selectedClaimDate)?.id
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<ApplyResult | null>(null)

  // Show result even after report is cleared post-apply
  if (!report && !result) return null
  const proposals = report?.proposals ?? []
  const approved = proposals.filter((p) => proposalDecisions[p.id] === 'approve')
  const rejected = proposals.filter((p) => proposalDecisions[p.id] === 'reject')
  const pending = proposals.length - approved.length - rejected.length
  const delta = approved.reduce((s, p) => s + (p.billingChange?.estimatedRevenueDelta ?? 0), 0)
  const errors = proposals.filter((p) => p.severity === 'error').length
  const warnings = proposals.filter((p) => p.severity === 'warning').length

  const handleApply = useCallback(async () => {
    if (!claimId || approved.length === 0) return
    setApplying(true)
    try {
      const r = await apiFetch<ApplyResult>('/api/claims/apply', {
        method: 'POST',
        body: JSON.stringify({
          claimId, patientId: selectedPatientId, analysisDate: selectedClaimDate,
          approvedProposals: approved.map((p) => ({ id: p.id, billingChange: p.billingChange, documentationChange: p.documentationChange })),
        }),
      })
      setResult(r)
      // Refresh patient data to show updated billing items and clinical docs
      await refetchPatients()
      // Clear the report so stale proposals don't remain clickable next to updated data
      useBillingStore.getState().setReport(null)
    } catch (err) { console.error(err) }
    finally { setApplying(false) }
  }, [claimId, selectedPatientId, selectedClaimDate, approved, refetchPatients])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-gray-800">{proposals.length} Vorschläge</span>
          <div className="flex gap-3 text-[0.65rem] text-gray-400 mt-0.5">
            {approved.length > 0 && <span className="text-green-600">{approved.length} genehmigt</span>}
            {rejected.length > 0 && <span className="text-red-500">{rejected.length} abgelehnt</span>}
            {pending > 0 && <span>{pending} offen</span>}
            <span className="text-gray-300">|</span>
            {errors > 0 && <span className="text-red-500">{errors} Fehler</span>}
            {warnings > 0 && <span className="text-amber-500">{warnings} Warnungen</span>}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}€
          </span>
          <div className="text-[0.6rem] text-gray-400">Erlösdelta</div>
        </div>
      </div>

      {!result && (
        <Button className="w-full mt-3" onClick={handleApply} disabled={applying || approved.length === 0}>
          {applying ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Wird angewendet...</span>
            : <span className="flex items-center gap-2"><Check size={14} />{approved.length} Änderung{approved.length !== 1 ? 'en' : ''} anwenden</span>}
        </Button>
      )}

      {result && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 space-y-1.5">
          <p className="text-xs font-semibold text-green-800">Änderungen angewendet</p>
          {result.applied.map((r) => (
            <div key={r.id} className={`text-[0.68rem] flex items-center gap-1.5 ${r.status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
              {r.status === 'ok' ? <Check size={10} /> : <X size={10} />}
              <span>{r.message}</span>
              {r.resource && <span className="text-[0.58rem] text-gray-400 ml-auto">{r.resource}</span>}
            </div>
          ))}
          {result.updatedResources.length > 0 && (
            <div className="text-[0.6rem] text-gray-500 pt-1 border-t border-green-200">
              Aktualisiert: {result.updatedResources.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
