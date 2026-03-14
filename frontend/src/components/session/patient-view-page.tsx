import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Shield,
} from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { patientData } from '@/data/mock-session'
import { formatCurrency, cn } from '@/lib/utils'

interface PatientViewPageProps {
  onNavigate: (page: 'session' | 'submitted') => void
}

export default function PatientViewPage({ onNavigate }: PatientViewPageProps) {
  const { proposedCodes, costBreakdown } = useSessionStore()

  const hasCosts = costBreakdown != null
  const totalCost = costBreakdown?.totalCost ?? 0
  const festzuschuss = costBreakdown?.festzuschuss ?? 0
  const patientShare = costBreakdown?.patientShare ?? 0
  const coveragePercent = totalCost > 0 ? Math.round((festzuschuss / totalCost) * 100) : 0

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 via-teal-50/20 to-white text-slate-900 font-sans">
      {/* Top nav */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => onNavigate('session')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck zur Sitzung
        </button>
        <div className="text-xs text-slate-400 font-mono">
          {patientData.name} - {patientData.insurance} {patientData.insuranceType}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Ihr Behandlungsplan
          </h1>
          <p className="text-slate-500">
            {proposedCodes.length} Positionen - Erstellt vom Billing Coach
          </p>
        </motion.div>

        {/* Plan card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden mb-6"
        >
          {/* Header */}
          <div className="px-7 py-5 text-white bg-gradient-to-r from-teal-600 to-teal-500">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
                  Abrechnungsvorschlag
                </span>
                <h2 className="text-2xl font-extrabold mt-1">
                  {proposedCodes.length} Positionen
                </h2>
                <p className="opacity-80 text-sm mt-0.5">
                  GOZ: {proposedCodes.filter((c) => c.system === 'GOZ').length} / BEMA:{' '}
                  {proposedCodes.filter((c) => c.system === 'BEMA').length}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-2xl p-3 mt-1 shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="p-7">
            {/* Cost breakdown */}
            {hasCosts && (
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-7">
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                      Eigenanteil
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tight">
                      {formatCurrency(patientShare)}
                    </div>
                  </div>
                  <div className="text-right space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                      <span className="text-slate-500">Festzuschuss</span>
                      <span className="font-bold text-teal-700">
                        {formatCurrency(festzuschuss)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-end text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                      <span>Gesamtkosten</span>
                      <span className="font-semibold text-slate-600">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {coveragePercent > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                      <span>Kassenanteil</span>
                      <span>{coveragePercent}% uebernommen</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${coveragePercent}%` }}
                        transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Code list */}
            <div className="border-t border-slate-100 pt-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Abrechnungspositionen
              </div>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Code</th>
                      <th className="px-3 py-2 text-left font-semibold">System</th>
                      <th className="px-3 py-2 text-right font-semibold">Betrag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {proposedCodes.map((item, i) => {
                      const costItem = costBreakdown?.items.find((c) => c.code === item.code)
                      return (
                        <tr key={`${item.code}-${i}`} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-teal-700 font-bold">
                            {item.code}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold',
                                item.system === 'BEMA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800',
                              )}
                            >
                              {item.system}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">
                            {costItem ? formatCurrency(costItem.total) : '--'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={() => onNavigate('submitted')}
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-base rounded-2xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Behandlungsplan bestaetigen & einreichen
          </button>
        </motion.div>
      </div>
    </div>
  )
}
