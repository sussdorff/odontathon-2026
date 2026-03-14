import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import type { ChatResponse, Patient } from '@/types'

export interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ProposedCode {
  code: string
  system: 'GOZ' | 'BEMA'
  description?: string
  estimatedCost?: number
}

export interface CostBreakdown {
  totalCost: number
  festzuschuss: number
  patientShare: number
  items: Array<{
    code: string
    description: string
    total: number
    system: string
  }>
}

export type SessionView = 'session' | 'patient-view' | 'submitted'
export type SessionState = 'idle' | 'recording' | 'processing' | 'plan_ready'

interface SessionStoreState {
  // Navigation
  view: SessionView

  // Session flow
  sessionState: SessionState
  sessionId: string | null

  // Patient
  selectedPatient: Patient | null

  // Chat / Agent
  messages: SessionMessage[]
  isAgentThinking: boolean
  agentStatusText: string

  // Results
  proposedCodes: ProposedCode[]
  followUpQuestions: string[]
  validationIssues: Array<{ severity: string; message: string }>
  costBreakdown: CostBreakdown | null
  agentMessage: string

  // Actions
  setView: (view: SessionView) => void
  setSessionState: (state: SessionState) => void
  setSelectedPatient: (patient: Patient | null) => void
  sendMessage: (text: string) => Promise<void>
  sendFollowUp: (question: string) => Promise<void>
  calculateCosts: () => Promise<void>
  reset: () => void
}

let msgCounter = 0

const initialState = {
  view: 'session' as SessionView,
  sessionState: 'idle' as SessionState,
  sessionId: null as string | null,
  selectedPatient: null as Patient | null,
  messages: [] as SessionMessage[],
  isAgentThinking: false,
  agentStatusText: '',
  proposedCodes: [] as ProposedCode[],
  followUpQuestions: [] as string[],
  validationIssues: [] as Array<{ severity: string; message: string }>,
  costBreakdown: null as CostBreakdown | null,
  agentMessage: '',
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  ...initialState,

  setView: (view) => set({ view }),
  setSessionState: (sessionState) => set({ sessionState }),
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  sendMessage: async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || get().isAgentThinking) return

    const { sessionId, selectedPatient } = get()

    // Add user message
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `msg-${++msgCounter}`,
          role: 'user' as const,
          content: trimmed,
          timestamp: new Date(),
        },
      ],
      isAgentThinking: true,
      sessionState: 'processing',
      agentStatusText: 'Agent analysiert...',
      followUpQuestions: [],
    }))

    try {
      const res = await apiFetch<ChatResponse>('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionId ?? undefined,
          patientId: selectedPatient?.id ?? undefined,
        }),
      })

      // Add assistant message
      set((s) => ({
        sessionId: res.sessionId,
        messages: [
          ...s.messages,
          {
            id: `msg-${++msgCounter}`,
            role: 'assistant' as const,
            content: res.message,
            timestamp: new Date(),
          },
        ],
        proposedCodes: (res.proposedItems ?? []).map((item) => ({
          code: item.code,
          system: item.system,
          description: item.description ?? '',
          estimatedCost: item.estimatedCost,
        })),
        followUpQuestions: res.followUpQuestions ?? [],
        validationIssues: (res.validationIssues ?? []).map((v) => ({
          severity: v.severity ?? 'warning',
          message: v.issue ?? String(v),
        })),
        agentMessage: res.message,
        isAgentThinking: false,
        agentStatusText: '',
        sessionState: res.proposedItems?.length > 0 ? 'plan_ready' : 'idle',
      }))

      // Auto-calculate costs if we have proposed items
      if (res.proposedItems?.length > 0) {
        get().calculateCosts()
      }
    } catch (err) {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: `msg-${++msgCounter}`,
            role: 'assistant' as const,
            content: `Fehler: ${(err as Error).message}`,
            timestamp: new Date(),
          },
        ],
        isAgentThinking: false,
        agentStatusText: '',
        sessionState: 'idle',
      }))
    }
  },

  sendFollowUp: async (question: string) => {
    return get().sendMessage(question)
  },

  calculateCosts: async () => {
    const { proposedCodes } = get()
    if (proposedCodes.length === 0) return

    try {
      const items = proposedCodes.map((c) => ({
        code: c.code,
        system: c.system,
      }))

      const res = await apiFetch<{
        totalCost: number
        festzuschuss: number
        patientShare: number
        breakdown: Array<{ code: string; description?: string; price?: number; system?: string; error?: string }>
      }>('/api/billing/calculate', {
        method: 'POST',
        body: JSON.stringify({ items }),
      })

      set({
        costBreakdown: {
          totalCost: res.totalCost,
          festzuschuss: res.festzuschuss,
          patientShare: res.patientShare,
          items: (res.breakdown ?? [])
            .filter((b) => !b.error)
            .map((b) => ({
              code: b.code,
              description: b.description ?? '',
              total: b.price ?? 0,
              system: b.system ?? 'GOZ',
            })),
        },
      })
    } catch {
      // Cost calculation failed silently — not critical
    }
  },

  reset: () => set({ ...initialState }),
}))
