import { useEffect, useCallback } from 'react'
import { Loader2, ChevronRight, Lightbulb } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PatientInfo } from '@/components/patient-info'
// FindingsGrid moved into CaseContext
import { CaseContext } from '@/components/case-context'
import { ClaimSelector } from '@/components/claim-selector'
import { BillingRow } from '@/components/billing-row'
import { CostSummary } from '@/components/cost-summary'
import { usePatients } from '@/lib/queries/use-patients'
import { useSuggestions } from '@/lib/queries/use-suggestions'
import { useBillingStore } from '@/stores/billing-store'
import { apiFetch } from '@/lib/api'
import type { BillingItem, CostResult } from '@/types'

let itemCounter = 0

function createEmptyItem(): BillingItem {
  return {
    id: `item-${++itemCounter}`,
    code: '',
    system: 'GOZ',
    multiplier: 2.3,
    teeth: [],
    description: '',
    checked: true,
  }
}

export function InputPanel() {
  const { data: patientsData, isLoading: patientsLoading } = usePatients()
  const patients = patientsData?.patients ?? []

  const {
    selectedPatientId,
    setSelectedPatientId,
    selectedClaimDate,
    billingItems,
    setBillingItems,
    addBillingItem,
    costResult,
    setCostResult,
    kassenart,
    setKassenart,
    bonusTier,
    setBonusTier,
    festzuschussBefund,
    setFestzuschussBefund,
  } = useBillingStore()

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null
  const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestions(selectedPatientId)

  // Populate billing items from suggestions
  useEffect(() => {
    if (!suggestionsData) return

    const items: BillingItem[] = suggestionsData.suggestions.map((s) => ({
      id: `item-${++itemCounter}`,
      code: s.code,
      system: s.system,
      multiplier: s.system === 'GOZ' ? 2.3 : undefined,
      teeth: s.teeth,
      description: s.description,
      checked: s.isRequired,
      patternId: s.patternId,
      patternName: s.patternName,
      isRequired: s.isRequired,
    }))

    if (items.length === 0) {
      items.push(createEmptyItem())
    }
    setBillingItems(items)
  }, [suggestionsData, setBillingItems])

  const handlePatientChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedPatientId(e.target.value || null)
    },
    [setSelectedPatientId]
  )

  const handleCalculate = useCallback(async () => {
    const checkedItems = billingItems.filter((i) => i.checked && i.code)
    if (checkedItems.length === 0) return

    const result = await apiFetch<CostResult>('/api/billing/calculate', {
      method: 'POST',
      body: JSON.stringify({
        items: checkedItems.map((it) => ({
          code: it.code,
          system: it.system,
          factor: it.multiplier,
          kassenart: kassenart || undefined,
        })),
        festzuschussBefund: festzuschussBefund || undefined,
        bonusTier,
        kassenart: kassenart || undefined,
      }),
    })
    setCostResult(result)
  }, [billingItems, kassenart, festzuschussBefund, bonusTier, setCostResult])

  // Group billing items by pattern
  const groups = new Map<string, { name: string; items: BillingItem[] }>()
  const ungrouped: BillingItem[] = []
  for (const item of billingItems) {
    if (item.patternId) {
      if (!groups.has(item.patternId)) {
        groups.set(item.patternId, { name: item.patternName ?? item.patternId, items: [] })
      }
      groups.get(item.patternId)!.items.push(item)
    } else {
      ungrouped.push(item)
    }
  }

  const hasSuggestions = (suggestionsData?.suggestions.length ?? 0) > 0

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Patient & Abrechnung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Patient auswählen
          </label>
          <div className="relative">
            <select
              value={selectedPatientId ?? ''}
              onChange={handlePatientChange}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white appearance-none cursor-pointer
                focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              <option value="">
                {patientsLoading ? 'Lade Patienten...' : '— Patient wählen —'}
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.coverageType}] · {p.findingsCount} Befunde
                </option>
              ))}
            </select>
            <ChevronRight
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90"
            />
          </div>
        </div>

        {/* Patient info card */}
        {selectedPatient && <PatientInfo patient={selectedPatient} />}

        {/* Claim date selector — shown right after patient selection */}
        {selectedPatient && selectedPatient.claims.length > 0 && (
          <ClaimSelector patient={selectedPatient} />
        )}

        {/* Case context — only shown AFTER a claim is selected, filtered by date */}
        {selectedPatient && selectedClaimDate && (
          <CaseContext patient={selectedPatient} beforeDate={selectedClaimDate} />
        )}

        {/* Kassenart & Bonus — only for GKV patients */}
        {selectedPatient?.coverageType === 'GKV' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Kassenart (BEMA)"
                value={kassenart}
                onChange={(e) => setKassenart(e.target.value)}
              >
                <option value="">— Kassenart wählen —</option>
                <option value="AOK">AOK</option>
                <option value="BKK">BKK</option>
                <option value="IKK">IKK</option>
                <option value="vdek">vdek</option>
              </Select>
              <Select
                label="Bonusstufe (ZE)"
                value={bonusTier}
                onChange={(e) => setBonusTier(e.target.value)}
              >
                <option value="60pct">Kein Bonus (60%)</option>
                <option value="70pct">5 Jahre (70%)</option>
                <option value="75pct">10 Jahre (75%)</option>
                <option value="100pct">Härtefall (100%)</option>
              </Select>
            </div>

            <Input
              label="Festzuschuss-Befundklasse"
              value={festzuschussBefund}
              onChange={(e) => setFestzuschussBefund(e.target.value)}
              placeholder="z.B. 1.1"
            />
          </>
        )}

        {/* Billing items section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Abrechnungspositionen
            </label>
            {suggestionsLoading && (
              <span className="flex items-center gap-1.5 text-xs text-blue-500">
                <Loader2 size={12} className="animate-spin" />
                Lade Vorschläge...
              </span>
            )}
          </div>

          {/* Suggestions hint — only when patterns found */}
          {hasSuggestions && suggestionsData && (
            <div className="flex items-start gap-2 text-xs text-green-800 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-green-600" />
              <span>
                <strong>{suggestionsData.suggestions.length} Positionen</strong> aus{' '}
                <strong>{suggestionsData.patterns} Mustern</strong> vorgeschlagen.
                Positionen an-/abwählen und Faktor anpassen.
              </span>
            </div>
          )}

          {/* Empty state when no suggestions and patient selected */}
          {!suggestionsLoading &&
            selectedPatientId &&
            !hasSuggestions &&
            billingItems.filter((i) => i.patternId).length === 0 && (
              <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-dashed border-gray-300 italic">
                Keine automatischen Vorschläge für diese Befundlage. Positionen manuell erfassen.
              </div>
            )}

          {/* Pattern groups */}
          {[...groups.entries()].map(([patternId, group]) => (
            <div key={patternId} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {group.name}
                <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium border border-gray-200">
                  {patternId}
                </span>
              </div>
              {group.items.map((item) => (
                <BillingRow key={item.id} item={item} />
              ))}
            </div>
          ))}

          {/* Ungrouped manual items */}
          {ungrouped.map((item) => (
            <BillingRow key={item.id} item={item} />
          ))}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => addBillingItem(createEmptyItem())}
            className="text-xs mt-1"
          >
            + Manuelle Position
          </Button>
        </div>

        {/* Cost summary */}
        {costResult && <CostSummary result={costResult} />}

        {/* Action buttons */}
        <div className="flex gap-2.5 pt-1">
          <Button
            className="flex-1"
            onClick={handleCalculate}
            disabled={billingItems.filter((i) => i.checked && i.code).length === 0}
          >
            Kosten berechnen
          </Button>
          <AnalyzeButton />
        </div>
      </CardContent>
    </Card>
  )
}

function AnalyzeButton() {
  const { selectedPatientId, selectedClaimDate, priorHistory, billingItems, isAnalyzing } = useBillingStore()
  const { setIsAnalyzing, addLogEntry, clearLog, setAnalysisStatus, setReport, resetAnalysis } =
    useBillingStore()

  const { data: patientsData } = usePatients()
  const selectedPatient = patientsData?.patients.find((p) => p.id === selectedPatientId)

  const handleAnalyze = useCallback(async () => {
    if (!selectedPatientId || isAnalyzing) return

    const checkedItems = billingItems.filter((i) => i.checked && i.code)
    if (checkedItems.length === 0) return

    resetAnalysis()
    setIsAnalyzing(true)
    clearLog()
    setAnalysisStatus(
      `Analyse für ${selectedPatient?.name ?? 'Patient'} (${checkedItems.length} Positionen)...`
    )

    try {
      const res = await apiFetch<{ sessionId: string; streamUrl: string }>('/api/agent/analyze', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          billingItems: checkedItems.map((it) => ({
            code: it.code,
            system: it.system,
            multiplier: it.multiplier,
            teeth: it.teeth,
          })),
          history: priorHistory,
          analysisDate: selectedClaimDate ?? undefined,
        }),
      })

      const eventSource = new EventSource(res.streamUrl)

      eventSource.addEventListener('analysis_start', () => {
        addLogEntry('info', `Analyse gestartet für ${selectedPatient?.name ?? 'Patient'}`)
      })

      eventSource.addEventListener('agent_start', (e) => {
        const data = JSON.parse(e.data)
        addLogEntry('info', `Agent "${data.agent}" gestartet`)
      })

      eventSource.addEventListener('agent_progress', (e) => {
        const data = JSON.parse(e.data)
        setAnalysisStatus(data.message || 'Verarbeitung...')
      })

      eventSource.addEventListener('agent_complete', (e) => {
        const data = JSON.parse(e.data)
        addLogEntry('info', `Agent "${data.agent}" abgeschlossen`)
      })

      eventSource.addEventListener('finding', (e) => {
        const data = JSON.parse(e.data)
        addLogEntry(data.severity || 'info', data.title || data.message || 'Fund')
      })

      eventSource.addEventListener('analysis_complete', (e) => {
        const data = JSON.parse(e.data)
        setIsAnalyzing(false)
        if (data.report) setReport(data.report)
        else addLogEntry('info', 'Analyse abgeschlossen (kein Report)')
        eventSource.close()
      })

      eventSource.addEventListener('analysis_error', (e) => {
        const data = JSON.parse(e.data)
        addLogEntry('error', `Fehler: ${data.error}`)
        setIsAnalyzing(false)
        eventSource.close()
      })

      eventSource.onerror = () => {
        setIsAnalyzing(false)
      }
    } catch (err) {
      addLogEntry('error', `Fehler: ${(err as Error).message}`)
      setIsAnalyzing(false)
    }
  }, [
    selectedPatientId,
    selectedClaimDate,
    priorHistory,
    billingItems,
    isAnalyzing,
    selectedPatient,
    resetAnalysis,
    setIsAnalyzing,
    clearLog,
    setAnalysisStatus,
    addLogEntry,
    setReport,
  ])

  return (
    <Button
      className="flex-1"
      onClick={handleAnalyze}
      disabled={!selectedPatientId || isAnalyzing || billingItems.filter((i) => i.checked && i.code).length === 0}
    >
      {isAnalyzing ? (
        <span className="flex items-center gap-1.5">
          <Loader2 size={14} className="animate-spin" />
          Analysiert...
        </span>
      ) : (
        'Analyse starten'
      )}
    </Button>
  )
}
