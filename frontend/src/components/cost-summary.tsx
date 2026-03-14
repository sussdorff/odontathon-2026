import { formatCurrency } from '@/lib/utils'
import type { CostResult } from '@/types'

interface CostSummaryProps {
  result: CostResult
}

export function CostSummary({ result }: CostSummaryProps) {
  return (
    <div className="bg-severity-info-bg border border-gkv rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gkv-foreground">Kostenkalkulation</h3>

      <div className="flex gap-4 flex-wrap">
        <TotalCard amount={result.totalCost} label="Gesamtkosten" />
        {result.festzuschuss > 0 && (
          <>
            <TotalCard amount={result.festzuschuss} label="Festzuschuss" className="text-success" />
            <TotalCard amount={result.patientShare} label="Eigenanteil" className="text-destructive" />
          </>
        )}
      </div>

      {result.festzuschussError && (
        <div className="text-xs text-destructive">
          Festzuschuss-Fehler: {result.festzuschussError}
        </div>
      )}

      <div className="text-xs space-y-0">
        {result.breakdown.map((b) => (
          <div
            key={`${b.system}-${b.code}`}
            className="flex justify-between py-1 border-b border-border last:border-b-0"
          >
            <span className="font-semibold">
              {b.system} {b.code}
            </span>
            <span className={b.error ? 'text-destructive' : 'font-semibold'}>
              {b.error || formatCurrency(b.price)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TotalCard({
  amount,
  label,
  className,
}: {
  amount: number
  label: string
  className?: string
}) {
  return (
    <div className="flex-1 min-w-[120px] text-center bg-card rounded-md py-2 px-4">
      <div className={`text-xl font-bold ${className || 'text-accent-foreground'}`}>
        {formatCurrency(amount)}
      </div>
      <div className="text-[0.7rem] text-muted uppercase">{label}</div>
    </div>
  )
}
