import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Send,
  User,
  MessageSquare,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DentalChart } from '@/components/dental-chart'
import { cn, formatCurrency } from '@/lib/utils'
import { Markdown } from '@/components/markdown'
import { useSessionStore } from '@/stores/session-store'
import { apiFetch } from '@/lib/api'
import type { Patient } from '@/types'

interface SessionPageProps {
  onNavigate: (page: 'patient-view' | 'submitted') => void
}

export default function SessionPage({ onNavigate }: SessionPageProps) {
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<'plan' | 'kosten' | 'chat'>('chat')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [patientPickerOpen, setPatientPickerOpen] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const {
    sessionState,
    messages,
    isAgentThinking,
    proposedCodes,
    followUpQuestions,
    costBreakdown,
    selectedPatient,
    setSelectedPatient,
    sendMessage,
  } = useSessionStore()

  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => apiFetch<{ total: number; patients: Patient[] }>('/api/patients'),
  })

  const patients = patientsData?.patients ?? []
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()),
  )

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPatientPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isIdle = sessionState === 'idle' && messages.length === 0
  const hasPlan = proposedCodes.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isAgentThinking) return
    setInput('')
    await sendMessage(trimmed)
  }, [input, isAgentThinking, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleFollowUp = useCallback(
    async (question: string) => {
      await sendMessage(question)
    },
    [sendMessage],
  )

  // Determine highlighted teeth from selected patient findings
  const highlightedTeeth = selectedPatient?.findings
    ?.filter((f) => f.status !== 'unknown')
    .map((f) => f.tooth) ?? []

  return (
    <div className="flex gap-8 h-[calc(100vh-120px)]">
      {/* LEFT COLUMN: Patient Context */}
      <div className="w-[40%] flex flex-col gap-6 overflow-y-auto pb-24 pr-2">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Patientensitzung</h2>

        {/* Patient picker */}
        <div ref={pickerRef} className="relative">
          {selectedPatient ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h3>
                  <p className="text-slate-500 mt-1">geb. {selectedPatient.birthDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Im Raum
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatient(null)
                      setPatientPickerOpen(false)
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title="Patient wechseln"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">
                    Versicherung
                  </p>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-md font-bold uppercase',
                    selectedPatient.coverageType === 'PKV'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-teal-50 text-teal-700',
                  )}>
                    {selectedPatient.coverageType}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">
                    Bonus
                  </p>
                  <p className="font-medium text-amber-600">{selectedPatient.bonusPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">
                    Befunde
                  </p>
                  <p className="font-medium text-slate-700">{selectedPatient.findingsCount} Befunde</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">
                    Geschlecht
                  </p>
                  <p className="font-medium text-slate-700">
                    {selectedPatient.gender === 'male' ? 'Maennlich' : selectedPatient.gender === 'female' ? 'Weiblich' : selectedPatient.gender}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setPatientPickerOpen(!patientPickerOpen)}
              className="w-full bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-300 hover:border-teal-400
                p-6 flex items-center justify-center gap-3 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
            >
              <User className="w-5 h-5" />
              <span className="font-medium">
                {patientsLoading ? 'Patienten werden geladen...' : 'Patient auswaehlen'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {/* Dropdown */}
          {patientPickerOpen && !selectedPatient && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-80">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
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
                    {patientsLoading ? 'Laden...' : 'Keine Patienten gefunden'}
                  </div>
                ) : (
                  filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p)
                        setPatientPickerOpen(false)
                        setPatientSearch('')
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          geb. {p.birthDate} &middot; {p.findingsCount} Befunde
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

        {selectedPatient && (
          <>
            <DentalChart highlightedTeeth={highlightedTeeth} darkTeeth={
              selectedPatient.findings
                ?.filter((f) => f.status === 'absent')
                .map((f) => f.tooth) ?? []
            } />

            {selectedPatient.findings.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Befunde
                </h3>
                <div className="flex flex-col gap-3">
                  {selectedPatient.findings.map((f, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="text-sm text-slate-500 font-mono shrink-0">Zahn {f.tooth}</div>
                      <div className="text-sm text-slate-700">
                        {f.status}{f.surfaces.length > 0 ? ` (${f.surfaces.join(', ')})` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* RIGHT COLUMN: AI Interaction */}
      <div className="w-[60%] flex flex-col relative">
        <AnimatePresence mode="wait">
          {/* STATE: IDLE — Welcome + input */}
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-12"
            >
              <div className="w-32 h-32 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-xl shadow-teal-600/20 mb-8">
                <MessageSquare className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Behandlung beschreiben
              </h2>
              <p className="mt-3 text-slate-500 max-w-md">
                Beschreiben Sie den Behandlungsplan. Der Agent ordnet automatisch alle BEMA/GOZ
                Codes zu und berechnet die Kosten.
              </p>

              <div className="mt-8 w-full max-w-lg">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="z.B. &quot;Krone auf Zahn 34, VMK, und Krone auf 45, Vollkeramik&quot;"
                  rows={3}
                  className="w-full resize-none text-base px-5 py-4 border-2 border-slate-200 rounded-2xl
                    focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                    transition-all placeholder:text-slate-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isAgentThinking}
                  className="mt-4 w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg rounded-xl
                    shadow-lg shadow-teal-600/20 transition-all hover:-translate-y-0.5
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                    flex items-center justify-center gap-3"
                >
                  <Send className="w-5 h-5" />
                  Analyse starten
                </button>
              </div>

              <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 max-w-lg">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Beispiele:
                </p>
                <p className="text-sm text-slate-600 italic">
                  &quot;Patient braucht Krone auf Zahn 46, Zirkon, GKV AOK&quot;
                </p>
                <p className="text-sm text-slate-600 italic mt-2">
                  &quot;Implantat regio 36 mit Keramikkrone, Privatpatient&quot;
                </p>
                <p className="text-sm text-slate-600 italic mt-2">
                  &quot;Fuellungstherapie Zahn 26, mesio-okklusal, 2-flaechig&quot;
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE: PROCESSING — Agent is thinking */}
          {sessionState === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-center bg-white rounded-3xl shadow-sm border border-slate-200 p-16"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">
                Agent erstellt Abrechnungsvorschlag
              </h2>

              <div className="max-w-md mx-auto w-full space-y-6">
                {[
                  'Befund wird analysiert...',
                  'BEMA/GOZ Codes werden zugeordnet...',
                  'Regelvalidierung...',
                  'Kostenschaetzung wird berechnet...',
                ].map((label, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.3 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
                    </div>
                    <span className="text-lg font-medium text-teal-700">{label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STATE: CONVERSATION — Chat + results */}
          {!isIdle && sessionState !== 'processing' && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-4 gap-6">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    'pb-4 text-sm font-bold border-b-2 transition-colors',
                    activeTab === 'chat'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700',
                  )}
                >
                  Chat
                </button>
                {hasPlan && (
                  <>
                    <button
                      onClick={() => setActiveTab('plan')}
                      className={cn(
                        'pb-4 text-sm font-bold border-b-2 transition-colors',
                        activeTab === 'plan'
                          ? 'border-teal-600 text-teal-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700',
                      )}
                    >
                      Vorgeschlagene Codes ({proposedCodes.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('kosten')}
                      className={cn(
                        'pb-4 text-sm font-bold border-b-2 transition-colors',
                        activeTab === 'kosten'
                          ? 'border-teal-600 text-teal-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700',
                      )}
                    >
                      Kosten
                    </button>
                  </>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {/* CHAT TAB */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl px-5 py-3',
                              msg.role === 'user'
                                ? 'bg-teal-600 text-white rounded-br-sm text-sm leading-relaxed'
                                : 'bg-slate-100 text-slate-800 rounded-bl-sm',
                            )}
                          >
                            {msg.role === 'assistant' ? (
                              <Markdown content={msg.content} />
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                      ))}
                      {isAgentThinking && (
                        <div className="flex justify-start">
                          <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-5 py-3">
                            <Loader2 size={16} className="animate-spin text-slate-500" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Follow-up buttons */}
                    {followUpQuestions.length > 0 && (
                      <div className="px-6 py-3 flex flex-wrap gap-2 border-t border-slate-100">
                        {followUpQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleFollowUp(q)}
                            disabled={isAgentThinking}
                            className="text-xs px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200
                              hover:bg-teal-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-slate-100 flex gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Antwort eingeben oder Befund ergaenzen..."
                        rows={2}
                        disabled={isAgentThinking}
                        className="flex-1 resize-none text-sm px-4 py-3 border border-slate-200 rounded-xl
                          focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100
                          transition-colors disabled:opacity-50"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isAgentThinking}
                        className="self-end px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700
                          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* PLAN TAB — Proposed codes */}
                {activeTab === 'plan' && (
                  <div className="p-6 space-y-4">
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 mb-2">
                      <div className="text-teal-800 font-semibold mb-1">
                        Vorgeschlagene Abrechnungspositionen
                      </div>
                      <div className="text-teal-600 text-sm">
                        {proposedCodes.length} Positionen vom Agent vorgeschlagen
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                          <tr>
                            <th className="p-4 border-b">#</th>
                            <th className="p-4 border-b">Code</th>
                            <th className="p-4 border-b">System</th>
                            <th className="p-4 border-b">Preis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {proposedCodes.map((item, idx) => {
                            const costItem = costBreakdown?.items.find(
                              (c) => c.code === item.code,
                            )
                            return (
                              <tr key={`${item.code}-${idx}`} className="hover:bg-slate-50/50">
                                <td className="p-4 text-slate-500">{idx + 1}</td>
                                <td className="p-4 font-mono text-sm text-teal-700 bg-teal-50/30 font-medium">
                                  {item.code}
                                </td>
                                <td className="p-4">
                                  <span
                                    className={cn(
                                      'text-xs px-2 py-1 rounded-md font-medium',
                                      item.system === 'BEMA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800',
                                    )}
                                  >
                                    {item.system}
                                  </span>
                                </td>
                                <td className="p-4 font-medium">
                                  {costItem
                                    ? formatCurrency(costItem.total)
                                    : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* KOSTEN TAB */}
                {activeTab === 'kosten' && (
                  <div className="p-6">
                    {costBreakdown ? (
                      <div className="space-y-6">
                        {/* Summary cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center">
                            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                              Gesamtkosten
                            </div>
                            <div className="text-3xl font-black text-slate-900">
                              {formatCurrency(costBreakdown.totalCost)}
                            </div>
                          </div>
                          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 text-center">
                            <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-2">
                              Festzuschuss
                            </div>
                            <div className="text-3xl font-black text-emerald-700">
                              {formatCurrency(costBreakdown.festzuschuss)}
                            </div>
                          </div>
                          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 text-center">
                            <div className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-2">
                              Eigenanteil
                            </div>
                            <div className="text-3xl font-black text-amber-700">
                              {formatCurrency(costBreakdown.patientShare)}
                            </div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        {costBreakdown.items.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <tr>
                                  <th className="p-4 border-b">Code</th>
                                  <th className="p-4 border-b">Beschreibung</th>
                                  <th className="p-4 border-b">System</th>
                                  <th className="p-4 border-b text-right">Betrag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {costBreakdown.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="p-4 font-mono text-sm text-teal-700">
                                      {item.code}
                                    </td>
                                    <td className="p-4 text-slate-700 text-sm">
                                      {item.description}
                                    </td>
                                    <td className="p-4">
                                      <span
                                        className={cn(
                                          'text-xs px-2 py-1 rounded-md font-medium',
                                          item.system === 'BEMA'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800',
                                        )}
                                      >
                                        {item.system}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right font-semibold">
                                      {formatCurrency(item.total)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        Kosten werden berechnet...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky action bar */}
              {hasPlan && (
                <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-white/90 backdrop-blur">
                  <div className="text-sm text-slate-500">
                    {proposedCodes.length} Positionen
                    {costBreakdown
                      ? ` - ${formatCurrency(costBreakdown.totalCost)} gesamt`
                      : ''}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onNavigate('patient-view')}
                      className="px-5 py-2.5 font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-2 text-sm"
                    >
                      <User className="w-4 h-4" />
                      Patient zeigen
                    </button>
                    <button
                      onClick={() => onNavigate('submitted')}
                      className="px-6 py-2.5 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2 text-sm"
                    >
                      <Send className="w-4 h-4" />
                      An Kasse senden
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
