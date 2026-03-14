import { FileText, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useBillingStore } from '@/stores/billing-store'
import { cn } from '@/lib/utils'
import type { Severity } from '@/types'

const severityConfig: Record<Severity, { bar: string; bg: string; label: string; labelColor: string }> = {
  error:      { bar: 'border-l-red-500',    bg: 'bg-red-50',    label: 'Fehler',     labelColor: 'text-red-600 bg-red-100' },
  warning:    { bar: 'border-l-orange-400', bg: 'bg-orange-50', label: 'Warnung',    labelColor: 'text-orange-600 bg-orange-100' },
  info:       { bar: 'border-l-blue-400',   bg: 'bg-blue-50',   label: 'Info',       labelColor: 'text-blue-600 bg-blue-100' },
  suggestion: { bar: 'border-l-green-500',  bg: 'bg-green-50',  label: 'Vorschlag',  labelColor: 'text-green-700 bg-green-100' },
}

export function ReportPanel() {
  const { report } = useBillingStore()

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Ergebnis</CardTitle>
      </CardHeader>
      <CardContent>
        {!report ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <FileText size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Noch kein Ergebnis.</p>
            <p className="text-xs mt-1 opacity-70">Das Analyse-Ergebnis erscheint hier.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-5 gap-2">
              <StatCard value={report.summary.errors} label="Fehler" color="text-red-600" bg="bg-red-50 border-red-100" />
              <StatCard value={report.summary.warnings} label="Warnungen" color="text-orange-500" bg="bg-orange-50 border-orange-100" />
              <StatCard value={report.summary.suggestions} label="Vorschläge" color="text-green-600" bg="bg-green-50 border-green-100" />
              <StatCard
                value={
                  <span className="flex items-center justify-center gap-0.5">
                    {report.summary.estimatedRevenueDelta >= 0 ? (
                      <TrendingUp size={14} className="text-green-500" />
                    ) : (
                      <TrendingDown size={14} className="text-red-500" />
                    )}
                    {report.summary.estimatedRevenueDelta >= 0 ? '+' : ''}
                    {report.summary.estimatedRevenueDelta.toFixed(0)}€
                  </span>
                }
                label="Erlösdelta"
                bg="bg-gray-50 border-gray-100"
              />
              <StatCard
                value={
                  report.summary.documentationComplete ? (
                    <CheckCircle size={18} className="text-green-500 mx-auto" />
                  ) : (
                    <XCircle size={18} className="text-orange-400 mx-auto" />
                  )
                }
                label="Doku"
                bg="bg-gray-50 border-gray-100"
              />
            </div>

            <p className="text-xs text-gray-500 pb-1 border-b border-gray-100">
              <strong className="text-gray-700">{report.patientName}</strong>
              {' · '}
              {report.coverageType}
              {' · '}
              {report.analysisDate}
            </p>

            {/* Findings */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {report.findings.map((f, i) => {
                const cfg = severityConfig[f.severity]
                return (
                  <div key={i} className={cn('p-3 rounded-lg border-l-4', cfg.bar, cfg.bg)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded',
                          cfg.labelColor
                        )}
                      >
                        {cfg.label}
                      </span>
                      <h4 className="text-xs font-semibold text-gray-800">{f.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600">{f.description}</p>
                    {f.codes.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {f.codes.map((c) => (
                          <span key={c} className="text-[0.65rem] font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-gray-700 mt-1.5">→ {f.action}</div>
                  </div>
                )
              })}
            </div>

            {/* Recommended codes */}
            {report.recommendedCodes.length > 0 && (
              <>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide pt-2 border-t border-gray-100">
                  Empfohlene Codes
                </h3>
                <div className="space-y-2">
                  {report.recommendedCodes.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg border-l-4 border-l-green-500 bg-green-50">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold font-mono bg-white border border-green-200 px-1.5 py-0.5 rounded">
                          {r.system} {r.code}
                        </span>
                        <span className="text-[0.65rem] text-green-600 font-medium">
                          {r.isNew ? '✦ neu' : '↻ Anpassung'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{r.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({
  value,
  label,
  color,
  bg,
}: {
  value: React.ReactNode
  label: string
  color?: string
  bg?: string
}) {
  return (
    <div className={cn('text-center p-2 rounded-lg border', bg || 'bg-gray-50 border-gray-100')}>
      <div className={cn('text-xl font-bold', color || 'text-gray-800')}>{value}</div>
      <div className="text-[0.6rem] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
