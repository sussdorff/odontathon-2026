import { useState, useCallback } from 'react'
import { Check, X, AlertTriangle, Info, Lightbulb, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBillingStore } from '@/stores/billing-store'
import { usePatients } from '@/lib/queries/use-patients'
import { apiFetch } from '@/lib/api'
import type { Proposal, ApplyResult, Severity, BillingChange, DocumentationChange } from '@/types'

const SEVERITY_CONFIG: Record<Severity, { icon: React.ReactNode; bg: string; border: string; label: string }> = {
  error: { icon: <AlertCircle size={14} />, bg: 'bg-red-50', border: 'border-red-200', label: 'Fehler' },
  warning: { icon: <AlertTriangle size={14} />, bg: 'bg-amber-50', border: 'border-amber-200', label: 'Warnung' },
  suggestion: { icon: <Lightbulb size={14} />, bg: 'bg-green-50', border: 'border-green-200', label: 'Vorschlag' },
  info: { icon: <Info size={14} />, bg: 'bg-blue-50', border: 'border-blue-200', label: 'Info' },
}

const CATEGORY_LABELS: Record<string, string> = {
  compliance: 'Regelkonformität',
  documentation: 'Dokumentation',
  optimization: 'Optimierung',
  'practice-rule': 'Praxisregel',
}

export function ReviewPanel() {
  const { report, selectedPatientId, selectedClaimDate } = useBillingStore()
  const { data: patientsData } = usePatients()
  const patient = patientsData?.patients.find((p) => p.id === selectedPatientId)
  const actualClaim = patient?.claims.find((c) => c.date === selectedClaimDate)
  const [decisions, setDecisions] = useState<Record<string, 'approve' | 'reject'>>({})
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)

  const toggleDecision = useCallback((id: string, decision: 'approve' | 'reject') => {
    setDecisions((prev) => {
      const next = { ...prev }
      if (next[id] === decision) {
        delete next[id]
      } else {
        next[id] = decision
      }
      return next
    })
  }, [])

  const approveAll = useCallback(() => {
    if (!report) return
    const all: Record<string, 'approve'> = {}
    for (const p of report.proposals) all[p.id] = 'approve'
    setDecisions(all)
  }, [report])

  const handleApply = useCallback(async () => {
    if (!report) return
    const approved = report.proposals.filter((p) => decisions[p.id] === 'approve')
    if (approved.length === 0) return

    setApplying(true)
    try {
      const claimId = actualClaim?.id ?? report.claimId
      if (!claimId) { console.error('No claim ID'); return }

      const result = await apiFetch<ApplyResult>('/api/claims/apply', {
        method: 'POST',
        body: JSON.stringify({
          claimId,
          patientId: selectedPatientId,
          approvedProposals: approved.map((p) => ({
            id: p.id,
            billingChange: p.billingChange,
            documentationChange: p.documentationChange,
          })),
        }),
      })
      setApplyResult(result)
    } catch (err) {
      console.error('Apply failed:', err)
    } finally {
      setApplying(false)
    }
  }, [report, decisions])

  if (!report) {
    return (
      <Card>
        <CardHeader><CardTitle>Analyse & Vorschläge</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 italic">Analyse starten um Vorschläge zu erhalten.</p>
        </CardContent>
      </Card>
    )
  }

  const proposals: Proposal[] = report.proposals ?? []
  const decisionValues = Object.values(decisions)
  const approvedCount = decisionValues.filter((d) => d === 'approve').length
  const rejectedCount = decisionValues.filter((d) => d === 'reject').length
  const pendingCount = proposals.length - approvedCount - rejectedCount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Vorschläge ({proposals.length})</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-gray-500">
              {approvedCount > 0 && <span className="text-green-600">{approvedCount} ✓</span>}
              {rejectedCount > 0 && <span className="ml-2 text-red-500">{rejectedCount} ✗</span>}
              {pendingCount > 0 && <span className="ml-2 text-gray-400">{pendingCount} offen</span>}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary bar */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <SummaryCard value={report.summary.errors} label="Fehler" className="text-red-600" />
          <SummaryCard value={report.summary.warnings} label="Warnungen" className="text-amber-600" />
          <SummaryCard value={report.summary.suggestions} label="Vorschläge" className="text-green-600" />
          <SummaryCard
            value={`${report.summary.estimatedRevenueDelta >= 0 ? '+' : ''}${report.summary.estimatedRevenueDelta.toFixed(0)}€`}
            label="Erlösdelta"
            className="text-gray-800"
          />
          <SummaryCard
            value={report.summary.documentationComplete ? '✓' : '✗'}
            label="Doku"
            className={report.summary.documentationComplete ? 'text-green-600' : 'text-red-500'}
          />
        </div>

        <p className="text-xs text-gray-500">
          <strong>{report.patientName}</strong> · {report.coverageType} · {report.analysisDate}
        </p>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={approveAll} className="text-xs">
            Alle annehmen
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDecisions({})} className="text-xs">
            Zurücksetzen
          </Button>
        </div>

        {/* Proposals */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              decision={decisions[proposal.id]}
              onToggle={toggleDecision}
            />
          ))}
        </div>

        {/* Apply button */}
        {approvedCount > 0 && !applyResult && (
          <Button
            className="w-full"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" />
                Wird angewendet...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check size={14} />
                {approvedCount} Änderung{approvedCount > 1 ? 'en' : ''} anwenden
              </span>
            )}
          </Button>
        )}

        {/* Apply result */}
        {applyResult && (
          <div className="space-y-1.5 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-green-800">
              Änderungen angewendet
            </p>
            {applyResult.applied.map((r) => (
              <div key={r.id} className={`text-xs flex items-center gap-1.5 ${r.status === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                {r.status === 'ok' ? <Check size={12} /> : <X size={12} />}
                {r.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryCard({ value, label, className }: { value: string | number; label: string; className?: string }) {
  return (
    <div className="p-2 bg-gray-50 rounded-lg">
      <div className={`text-lg font-bold ${className}`}>{value}</div>
      <div className="text-[0.6rem] text-gray-500 uppercase">{label}</div>
    </div>
  )
}

function ProposalCard({
  proposal,
  decision,
  onToggle,
}: {
  proposal: Proposal
  decision?: 'approve' | 'reject'
  onToggle: (id: string, decision: 'approve' | 'reject') => void
}) {
  const cfg = SEVERITY_CONFIG[proposal.severity]
  const isApproved = decision === 'approve'
  const isRejected = decision === 'reject'

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      isApproved ? 'border-green-300 bg-green-50/50' :
      isRejected ? 'border-red-200 bg-red-50/30 opacity-60' :
      `${cfg.border} ${cfg.bg}`
    }`}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-gray-800">{proposal.title}</span>
              <span className="text-[0.6rem] px-1.5 py-px rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {CATEGORY_LABELS[proposal.category] ?? proposal.category}
              </span>
              <span className="text-[0.6rem] text-gray-400">{proposal.id}</span>
            </div>
            <p className="text-xs text-gray-600">{proposal.description}</p>
          </div>
        </div>

        {/* Change detail */}
        {proposal.billingChange && (
          <BillingChangeDetail change={proposal.billingChange} />
        )}
        {proposal.documentationChange && (
          <DocChangeDetail change={proposal.documentationChange} />
        )}

        {/* Approve / Reject buttons */}
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => onToggle(proposal.id, 'approve')}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
              isApproved
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
            }`}
          >
            <Check size={12} /> Annehmen
          </button>
          <button
            onClick={() => onToggle(proposal.id, 'reject')}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
              isRejected
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
            }`}
          >
            <X size={12} /> Ablehnen
          </button>
        </div>
      </div>
    </div>
  )
}

function BillingChangeDetail({ change }: { change: BillingChange }) {
  return (
    <div className="mt-2 p-2 bg-white/70 rounded border border-gray-200 text-xs">
      <div className="flex items-center gap-2">
        <span className={`px-1.5 py-px rounded text-[0.6rem] font-semibold border ${
          change.system === 'GOZ' ? 'bg-blue-50 text-blue-700 border-blue-200' :
          'bg-purple-50 text-purple-700 border-purple-200'
        }`}>{change.system}</span>
        <code className="font-bold">{change.code}</code>
        {change.type === 'add_code' && (
          <span className="text-green-600 font-semibold flex items-center gap-0.5">
            <ArrowRight size={10} /> Hinzufügen
          </span>
        )}
        {change.type === 'remove_code' && (
          <span className="text-red-600 font-semibold">Entfernen</span>
        )}
        {change.type === 'update_multiplier' && (
          <span className="text-amber-700 font-semibold">
            {change.currentMultiplier}× → {change.newMultiplier}×
          </span>
        )}
        {change.estimatedRevenueDelta != null && change.estimatedRevenueDelta !== 0 && (
          <span className={`ml-auto font-semibold ${change.estimatedRevenueDelta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change.estimatedRevenueDelta > 0 ? '+' : ''}{change.estimatedRevenueDelta.toFixed(2)}€
          </span>
        )}
      </div>
      {change.description && <p className="mt-1 text-gray-500">{change.description}</p>}
      {change.teeth?.length ? <p className="mt-0.5 text-gray-400">Zähne: {change.teeth.join(', ')}</p> : null}
    </div>
  )
}

function DocChangeDetail({ change }: { change: DocumentationChange }) {
  return (
    <div className="mt-2 p-2 bg-white/70 rounded border border-gray-200 text-xs">
      {change.type === 'flag_unbilled_service' && (
        <div className="flex items-center gap-2">
          <span className="text-amber-600 font-semibold">Dokumentiert, nicht abgerechnet</span>
          {change.code && <code className="font-bold">{change.system} {change.code}</code>}
        </div>
      )}
      {change.type === 'flag_missing_documentation' && (
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-semibold">Abgerechnet, nicht dokumentiert</span>
          {change.code && <code className="font-bold">{change.system} {change.code}</code>}
        </div>
      )}
      {(change.type === 'add_field' || change.type === 'update_field') && (
        <div>
          <span className="font-semibold">Feld: {change.fieldLabel || change.fieldId}</span>
          {change.suggestedValue && <span className="ml-2 text-gray-500">Vorschlag: {change.suggestedValue}</span>}
        </div>
      )}
      <p className="mt-1 text-gray-500">{change.reason}</p>
    </div>
  )
}
