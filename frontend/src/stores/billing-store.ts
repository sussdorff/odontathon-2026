import { create } from 'zustand'
import type { BillingItem, CostResult, AnalysisReport, Severity, HistoryEntry } from '@/types'

interface LogEntry {
  id: string
  severity: Severity
  message: string
  timestamp: Date
}

interface BillingState {
  selectedPatientId: string | null
  selectedClaimDate: string | null
  priorHistory: HistoryEntry[]
  billingItems: BillingItem[]
  costResult: CostResult | null
  kassenart: string
  bonusTier: string
  festzuschussBefund: string

  // Analysis
  isAnalyzing: boolean
  analysisLog: LogEntry[]
  analysisStatus: string
  report: AnalysisReport | null

  // Actions
  setSelectedPatientId: (id: string | null) => void
  setSelectedClaimDate: (date: string | null) => void
  setPriorHistory: (history: HistoryEntry[]) => void
  setBillingItems: (items: BillingItem[]) => void
  addBillingItem: (item: BillingItem) => void
  removeBillingItem: (id: string) => void
  toggleBillingItem: (id: string) => void
  updateBillingItem: (id: string, updates: Partial<BillingItem>) => void
  setCostResult: (result: CostResult | null) => void
  setKassenart: (kassenart: string) => void
  setBonusTier: (tier: string) => void
  setFestzuschussBefund: (befund: string) => void

  // Analysis actions
  setIsAnalyzing: (analyzing: boolean) => void
  addLogEntry: (severity: Severity, message: string) => void
  clearLog: () => void
  setAnalysisStatus: (status: string) => void
  setReport: (report: AnalysisReport | null) => void
  resetAnalysis: () => void
}

let logCounter = 0

export const useBillingStore = create<BillingState>((set) => ({
  selectedPatientId: null,
  selectedClaimDate: null,
  priorHistory: [],
  billingItems: [],
  costResult: null,
  kassenart: '',
  bonusTier: '60pct',
  festzuschussBefund: '',

  isAnalyzing: false,
  analysisLog: [],
  analysisStatus: '',
  report: null,

  setSelectedPatientId: (id) => set({ selectedPatientId: id, selectedClaimDate: null, priorHistory: [], costResult: null }),
  setSelectedClaimDate: (date) => set({ selectedClaimDate: date, costResult: null }),
  setPriorHistory: (history) => set({ priorHistory: history }),
  setBillingItems: (items) => set({ billingItems: items, costResult: null }),
  addBillingItem: (item) => set((s) => ({ billingItems: [...s.billingItems, item], costResult: null })),
  removeBillingItem: (id) => set((s) => ({ billingItems: s.billingItems.filter((i) => i.id !== id), costResult: null })),
  toggleBillingItem: (id) =>
    set((s) => ({
      billingItems: s.billingItems.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
      costResult: null,
    })),
  updateBillingItem: (id, updates) =>
    set((s) => ({
      billingItems: s.billingItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      costResult: null,
    })),
  setCostResult: (result) => set({ costResult: result }),
  setKassenart: (kassenart) => set({ kassenart }),
  setBonusTier: (tier) => set({ bonusTier: tier }),
  setFestzuschussBefund: (befund) => set({ festzuschussBefund: befund }),

  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  addLogEntry: (severity, message) =>
    set((s) => ({
      analysisLog: [
        ...s.analysisLog,
        { id: `log-${++logCounter}`, severity, message, timestamp: new Date() },
      ],
    })),
  clearLog: () => set({ analysisLog: [] }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setReport: (report) => set({ report }),
  resetAnalysis: () =>
    set({ isAnalyzing: false, analysisLog: [], analysisStatus: '', report: null }),
}))
