import { useState } from 'react'
import { ChevronDown, ChevronRight, ClipboardList, FileText, History, Shield, Stethoscope } from 'lucide-react'
import type { Patient, Claim, ClaimItem, Procedure } from '@/types'

const SYS_COLORS: Record<string, string> = {
  GOZ: 'bg-blue-50 text-blue-700 border-blue-200',
  BEMA: 'bg-purple-50 text-purple-700 border-purple-200',
  'GOÄ': 'bg-amber-50 text-amber-700 border-amber-200',
}

interface CaseContextProps {
  patient: Patient
  beforeDate?: string
}

export function CaseContext({ patient, beforeDate }: CaseContextProps) {
  const [open, setOpen] = useState(true)

  // Filter all temporal data by beforeDate
  const claims = beforeDate
    ? patient.claims.filter((c) => c.date < beforeDate)
    : patient.claims
  const flatHistory = claims.flatMap((c) =>
    c.items.map((i) => ({ code: i.code, system: i.system, date: c.date }))
  )
  const encounters = beforeDate
    ? patient.encounters.filter((e) => e.date && e.date <= beforeDate)
    : patient.encounters
  const procedures = beforeDate
    ? patient.procedures.filter((p) => p.date && p.date <= beforeDate)
    : patient.procedures

  const label = beforeDate
    ? `Agentenkontext (Stand: ${beforeDate})`
    : 'Fallkontext'

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-800"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
      </button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          {/* Coverage */}
          <ContextSection icon={<Shield size={13} />} title="Versicherung">
            <div className="flex flex-wrap gap-1.5">
              <Pill className={patient.coverageType === 'PKV' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                {patient.coverageType}
              </Pill>
              {patient.coveragePayor && (
                <Pill>Träger: {patient.coveragePayor.replace('Organization/', '')}</Pill>
              )}
              {patient.coverageId && <Pill>Nr. <code className="text-[0.65rem]">{patient.coverageId}</code></Pill>}
              <Pill>Bonus: {patient.bonusPercent > 0 ? `${patient.bonusPercent}%` : '—'}</Pill>
              {patient.pflegegrad && <Pill className="bg-orange-50 text-orange-700">Pflegegrad {patient.pflegegrad}</Pill>}
              {patient.eingliederungshilfe && <Pill className="bg-orange-50 text-orange-700">EGH</Pill>}
            </div>
          </ContextSection>

          {/* Findings — always shown, not date-filtered (represents current dental status) */}
          <ContextSection icon={<Stethoscope size={13} />} title="Zahnbefunde" count={patient.findings.length}>
            {patient.findings.length > 0 ? (
              <FindingsInline findings={patient.findings} />
            ) : (
              <span className="text-xs text-gray-400 italic">Keine Befunde</span>
            )}
          </ContextSection>

          {/* Conditions */}
          {patient.conditions.length > 0 && (
            <ContextSection icon={<Stethoscope size={13} />} title="Diagnosen" count={patient.conditions.length}>
              <div className="flex flex-wrap gap-1.5">
                {patient.conditions.map((c, i) => (
                  <Pill key={i}>{c.display || c.code || '?'}</Pill>
                ))}
              </div>
            </ContextSection>
          )}

          {/* Encounters */}
          {encounters.length > 0 && (
            <ContextSection icon={<ClipboardList size={13} />} title="Behandlungstermine" count={encounters.length}>
              <div className="space-y-1">
                {encounters.map((enc) => (
                  <div key={enc.id} className="flex items-start gap-2 text-[0.68rem] p-1.5 bg-white rounded border border-gray-100">
                    <span className="font-semibold text-gray-700 shrink-0">{enc.date ?? '?'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-600">{enc.reason ?? 'Kein Grund angegeben'}</span>
                      {enc.tooth && <span className="ml-1 text-gray-400">Z.{enc.tooth}</span>}
                    </div>
                    <span className={`shrink-0 text-[0.6rem] px-1.5 py-px rounded-full ${
                      enc.status === 'finished' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>{enc.status}</span>
                  </div>
                ))}
              </div>
            </ContextSection>
          )}

          {/* Procedures — clinical documentation */}
          {procedures.length > 0 && (
            <ContextSection icon={<FileText size={13} />} title="Klinische Dokumentation" count={procedures.length}>
              <div className="space-y-1.5">
                {procedures.map((proc) => (
                  <ProcedureCard key={proc.id} procedure={proc} />
                ))}
              </div>
            </ContextSection>
          )}

          {/* Prior billing history */}
          <div className="md:col-span-2">
            <ContextSection
              icon={<History size={13} />}
              title={beforeDate ? `Vorige Abrechnungen (vor ${beforeDate})` : 'Abrechnungshistorie'}
              count={claims.length > 0
                ? `${flatHistory.length} Pos. in ${claims.length} Rechnungen`
                : undefined}
            >
              {claims.length > 0 ? (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {claims.map((claim) => (
                    <ClaimCard key={claim.id} claim={claim} />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">Keine früheren Abrechnungen</span>
              )}
            </ContextSection>
          </div>
        </div>
      )}
    </div>
  )
}

function FindingsInline({ findings }: { findings: Patient['findings'] }) {
  const STATUS_LABELS: Record<string, string> = {
    absent: 'fehlend', carious: 'kariös', 'crown-intact': 'Krone ok',
    'crown-needs-renewal': 'Krone ern.', 'bridge-anchor': 'Brückenanker',
    'replaced-bridge': 'Brückenglied', implant: 'Implantat',
    'implant-with-crown': 'Impl.+Krone', filled: 'Füllung',
  }
  const STATUS_COLORS: Record<string, string> = {
    absent: 'bg-red-50 border-red-200 text-red-700',
    carious: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    'crown-needs-renewal': 'bg-orange-50 border-orange-200 text-orange-700',
    'crown-intact': 'bg-green-50 border-green-200 text-green-700',
    'bridge-anchor': 'bg-purple-50 border-purple-200 text-purple-700',
    'replaced-bridge': 'bg-pink-50 border-pink-200 text-pink-700',
    implant: 'bg-blue-50 border-blue-200 text-blue-700',
    'implant-with-crown': 'bg-blue-50 border-blue-200 text-blue-700',
    filled: 'bg-green-50 border-green-200 text-green-700',
  }
  const sorted = [...findings].sort((a, b) => a.tooth - b.tooth)
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((f) => (
        <span
          key={`${f.tooth}-${f.status}`}
          className={`inline-flex items-center gap-0.5 text-[0.62rem] px-1.5 py-0.5 rounded border font-medium ${STATUS_COLORS[f.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}
          title={`${f.tooth}: ${STATUS_LABELS[f.status] || f.status}${f.surfaces.length ? ` (${f.surfaces.join(',')})` : ''}`}
        >
          <strong>{f.tooth}</strong> {STATUS_LABELS[f.status] || f.status}
          {f.surfaces.length > 0 && <span className="opacity-70">({f.surfaces.join(',')})</span>}
        </span>
      ))}
    </div>
  )
}

function ContextSection({ icon, title, count, children }: {
  icon: React.ReactNode
  title: string
  count?: string | number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1">
        {icon}
        {title}
        {count !== undefined && <span className="font-normal text-gray-400">{count}</span>}
      </div>
      {children}
    </div>
  )
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[0.68rem] px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </span>
  )
}

function ClaimCard({ claim }: { claim: Claim }) {
  const [open, setOpen] = useState(false)
  const teethStr = claim.teeth.length > 0 ? `Zähne ${claim.teeth.join(', ')}` : 'kein Zahnbezug'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        <span className="font-semibold text-gray-800">{claim.date}</span>
        <span className="text-gray-500">{claim.itemCount} Pos. · {teethStr}</span>
        <span className="ml-auto text-gray-400">{claim.provider}</span>
      </button>

      {open && (
        <div className="px-3 py-2">
          <ClaimItemTable items={claim.items} />
        </div>
      )}
    </div>
  )
}

function ClaimItemTable({ items }: { items: ClaimItem[] }) {
  // Group by session if multi-session
  const hasSessions = items.some((i) => i.session)

  if (hasSessions) {
    const bySession = new Map<number, ClaimItem[]>()
    for (const it of items) {
      const s = it.session || 0
      if (!bySession.has(s)) bySession.set(s, [])
      bySession.get(s)!.push(it)
    }
    return (
      <div className="space-y-2">
        {[...bySession.entries()].sort(([a], [b]) => a - b).map(([sess, sessItems]) => (
          <div key={sess}>
            {sess > 0 && (
              <div className="text-[0.62rem] font-semibold text-purple-600 border-t border-dashed border-purple-200 pt-1 mt-1">
                Sitzung {sess}
              </div>
            )}
            <ItemRows items={sessItems} />
          </div>
        ))}
      </div>
    )
  }

  return <ItemRows items={items} />
}

function ProcedureCard({ procedure }: { procedure: Procedure }) {
  const [open, setOpen] = useState(false)
  const hasNotes = procedure.notes.length > 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs bg-emerald-50 hover:bg-emerald-100 transition-colors"
      >
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        <span className="font-semibold text-gray-800">{procedure.date ?? '?'}</span>
        <span className="text-gray-600">{procedure.display ?? procedure.code ?? '?'}</span>
        {procedure.tooth && <span className="text-gray-400">Z.{procedure.tooth}</span>}
        <span className={`ml-auto shrink-0 text-[0.6rem] px-1.5 py-px rounded-full ${
          procedure.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>{procedure.status}</span>
      </button>

      {open && hasNotes && (
        <div className="px-3 py-2 space-y-1">
          {procedure.notes.map((note, i) => (
            <p key={i} className="text-[0.68rem] text-gray-600 leading-relaxed whitespace-pre-wrap">
              {note}
            </p>
          ))}
        </div>
      )}
      {open && !hasNotes && (
        <div className="px-3 py-2 text-[0.68rem] text-gray-400 italic">Keine Dokumentationsnotizen</div>
      )}
    </div>
  )
}

function ItemRows({ items }: { items: ClaimItem[] }) {
  return (
    <table className="w-full text-[0.68rem]">
      <tbody>
        {items.map((it, i) => (
          <tr key={i} className="border-b border-gray-50 last:border-b-0">
            <td className="py-0.5 pr-1.5 w-9">
              <span className={`inline-block px-1.5 py-px rounded text-[0.58rem] font-semibold border ${SYS_COLORS[it.system] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {it.system}
              </span>
            </td>
            <td className="py-0.5 pr-2 w-12 font-mono font-semibold text-gray-800">
              {it.code}
            </td>
            <td className="py-0.5 pr-2 text-gray-600">
              {it.display}
              {it.note && <span className="block text-[0.6rem] text-gray-400 italic">{it.note}</span>}
            </td>
            <td className="py-0.5 text-right text-gray-500 w-14 whitespace-nowrap">
              {it.tooth ? `Z.${it.tooth}` : ''}
              {it.surfaces.length > 0 ? ` (${it.surfaces.join(',')})` : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
