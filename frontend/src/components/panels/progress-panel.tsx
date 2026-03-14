import { useEffect, useRef } from 'react'
import { Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useBillingStore } from '@/stores/billing-store'
import { cn } from '@/lib/utils'
import type { Severity } from '@/types'

const severityConfig: Record<Severity, { bar: string; bg: string; dot: string }> = {
  error:      { bar: 'border-l-red-500',    bg: 'bg-red-50',    dot: 'bg-red-500' },
  warning:    { bar: 'border-l-orange-400', bg: 'bg-orange-50', dot: 'bg-orange-400' },
  info:       { bar: 'border-l-blue-400',   bg: 'bg-blue-50',   dot: 'bg-blue-400' },
  suggestion: { bar: 'border-l-green-500',  bg: 'bg-green-50',  dot: 'bg-green-500' },
}

export function ProgressPanel() {
  const { analysisLog, isAnalyzing, analysisStatus } = useBillingStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [analysisLog])

  return (
    <Card className="p-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Analyse</CardTitle>
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
              <Spinner className="w-3 h-3" />
              Läuft...
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {analysisLog.length === 0 && !isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <Activity size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Noch keine Analyse gestartet.</p>
            <p className="text-xs mt-1 opacity-70">
              Patient wählen, Positionen prüfen und „Analyse starten" klicken.
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-1.5 text-xs pr-1">
            {analysisLog.map((entry) => {
              const cfg = severityConfig[entry.severity]
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'px-2.5 py-2 border-l-[3px] rounded-r-lg flex items-start gap-2',
                    cfg.bar,
                    cfg.bg
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0', cfg.dot)} />
                  <span className="text-gray-600">
                    <span className="text-gray-400 mr-1.5">
                      {entry.timestamp.toLocaleTimeString('de')}
                    </span>
                    {entry.message}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2.5 mt-3 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
            <Spinner className="w-4 h-4 shrink-0" />
            <span className="truncate">{analysisStatus || 'Wird analysiert...'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
