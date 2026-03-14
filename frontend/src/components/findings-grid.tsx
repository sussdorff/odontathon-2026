import { cn } from '@/lib/utils'
import type { Finding } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  absent: 'fehlend',
  carious: 'karioes',
  'crown-intact': 'Krone ok',
  'crown-needs-renewal': 'Krone erneuerungsbed.',
  'bridge-anchor': 'Brueckenanker',
  'replaced-bridge': 'Brueckenglied',
  implant: 'Implantat',
  'implant-with-crown': 'Implantat+Krone',
  filled: 'Fuellung',
}

const STATUS_COLORS: Record<string, string> = {
  absent: 'bg-red-100 border-red-300 text-red-800',
  carious: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  'crown-needs-renewal': 'bg-orange-100 border-orange-300 text-orange-800',
  'crown-intact': 'bg-green-100 border-green-300 text-green-800',
  'bridge-anchor': 'bg-purple-100 border-purple-300 text-purple-800',
  'replaced-bridge': 'bg-pink-100 border-pink-300 text-pink-800',
  implant: 'bg-blue-100 border-blue-300 text-blue-800',
  'implant-with-crown': 'bg-blue-100 border-blue-300 text-blue-800',
  filled: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  unknown: 'bg-gray-100 border-gray-300 text-gray-600',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  absent: 'bg-red-400',
  carious: 'bg-yellow-400',
  'crown-needs-renewal': 'bg-orange-400',
  'crown-intact': 'bg-green-400',
  'bridge-anchor': 'bg-purple-400',
  'replaced-bridge': 'bg-pink-400',
  implant: 'bg-blue-400',
  'implant-with-crown': 'bg-blue-400',
  filled: 'bg-emerald-400',
  unknown: 'bg-gray-400',
}

interface FindingsGridProps {
  findings: Finding[]
}

export function FindingsGrid({ findings }: FindingsGridProps) {
  if (!findings.length) {
    return (
      <div className="text-xs text-muted py-2 italic">Keine Befunde vorhanden</div>
    )
  }

  const sorted = [...findings].sort((a, b) => a.tooth - b.tooth)
  const knownFindings = sorted.filter((f) => f.status !== 'unknown')
  const unknownFindings = sorted.filter((f) => f.status === 'unknown')
  const usedStatuses = [...new Set(knownFindings.map((f) => f.status))]

  return (
    <div className="space-y-2">
      {knownFindings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {knownFindings.map((f) => (
            <FindingChip key={`${f.tooth}-${f.status}`} finding={f} />
          ))}
        </div>
      )}

      {unknownFindings.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {knownFindings.length === 0 && (
            <span className="text-xs text-muted mr-1">Zaehne ohne Status:</span>
          )}
          {unknownFindings.map((f) => (
            <span
              key={`${f.tooth}-unknown`}
              className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-sm bg-gray-100 border border-gray-300 text-gray-500"
              title="Status unbekannt"
            >
              {f.tooth}
            </span>
          ))}
        </div>
      )}

      {usedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[0.7rem] text-muted mt-1">
          {usedStatuses.map((status) => (
            <span key={status} className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-sm', STATUS_DOT_COLORS[status] || 'bg-gray-400')} />
              {STATUS_LABELS[status] || status}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function FindingChip({ finding }: { finding: Finding }) {
  const label = STATUS_LABELS[finding.status] || finding.status
  const surfaces = finding.surfaces?.length ? ` (${finding.surfaces.join(',')})` : ''

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium border',
        STATUS_COLORS[finding.status] || 'bg-gray-100 border-gray-300 text-gray-600'
      )}
      title={`Zahn ${finding.tooth}: ${label}${surfaces}`}
    >
      <span className="font-bold min-w-[1.5em] text-center">{finding.tooth}</span>
      <span className="hidden sm:inline">{label}{surfaces}</span>
    </div>
  )
}
