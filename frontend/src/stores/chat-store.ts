import { create } from 'zustand'
import type { ChatMessage, ProposedItem } from '@/types'

interface ChatState {
  sessionId: string | null
  messages: ChatMessage[]
  proposedCodes: ProposedItem[]
  followUpQuestions: string[]
  isLoading: boolean
  costTotal: number

  // Actions
  setSessionId: (id: string) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setProposedCodes: (codes: ProposedItem[]) => void
  setFollowUpQuestions: (questions: string[]) => void
  setIsLoading: (loading: boolean) => void
  resetChat: () => void
}

let msgCounter = 0

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  messages: [],
  proposedCodes: [],
  followUpQuestions: [],
  isLoading: false,
  costTotal: 0,

  setSessionId: (id) => set({ sessionId: id }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          ...msg,
          id: `msg-${++msgCounter}`,
          timestamp: new Date(),
        },
      ],
    })),

  setProposedCodes: (codes) =>
    set({
      proposedCodes: codes,
      costTotal: codes.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0),
    }),

  setFollowUpQuestions: (questions) => set({ followUpQuestions: questions }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  resetChat: () =>
    set({
      sessionId: null,
      messages: [],
      proposedCodes: [],
      followUpQuestions: [],
      isLoading: false,
      costTotal: 0,
    }),
}))
