import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { useSessionStore } from '@/stores/session-store'
import { patientData } from '@/data/mock-session'
import { formatCurrency } from '@/lib/utils'

interface SubmittedPageProps {
  onNavigate: (page: 'session') => void
}

export default function SubmittedPage({ onNavigate }: SubmittedPageProps) {
  const { proposedCodes, costBreakdown, reset } = useSessionStore()

  const handleNextPatient = () => {
    reset()
    onNavigate('session')
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 text-center relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-100 rounded-full blur-3xl opacity-50"></div>

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30"
            >
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </motion.div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              HKP erfolgreich eingereicht!
            </h1>
            <p className="text-slate-500 mb-10">
              Der Plan wurde digital an die Krankenkasse uebermittelt.
            </p>

            <div className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-100 mb-10">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Patient</span>
                  <span className="font-bold text-slate-900">{patientData.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Kasse</span>
                  <span className="font-medium text-slate-900">{patientData.insurance}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Positionen</span>
                  <span className="font-medium text-teal-700">{proposedCodes.length} Codes</span>
                </div>
                {costBreakdown && (
                  <>
                    <div className="flex justify-between border-b border-slate-200 pb-3">
                      <span className="text-slate-500">Gesamtkosten</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(costBreakdown.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-3">
                      <span className="text-slate-500">Eigenanteil</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(costBreakdown.patientShare)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500">Bearbeitungszeit</span>
                  <span className="font-medium text-amber-600">ca. 2-4 Wochen</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleNextPatient}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer"
              >
                Naechster Patient
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
