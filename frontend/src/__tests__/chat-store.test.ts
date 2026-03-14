import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '@/stores/chat-store'

// Mock apiFetch — not used directly in the store, but imported by chat-panel
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

describe('chat-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      sessionId: null,
      messages: [],
      proposedCodes: [],
      followUpQuestions: [],
      isLoading: false,
      costTotal: 0,
    })
  })

  it('stores sessionId and returns it on subsequent access', () => {
    const store = useChatStore.getState()

    expect(store.sessionId).toBeNull()

    store.setSessionId('session-abc-123')

    expect(useChatStore.getState().sessionId).toBe('session-abc-123')
  })

  it('reuses the same sessionId on subsequent messages', () => {
    const store = useChatStore.getState()

    // Simulate first response setting sessionId
    store.setSessionId('session-xyz')

    // Simulate second message — sessionId should still be the same
    const currentSessionId = useChatStore.getState().sessionId
    expect(currentSessionId).toBe('session-xyz')

    // After another setSessionId call with same value, it stays the same
    store.setSessionId('session-xyz')
    expect(useChatStore.getState().sessionId).toBe('session-xyz')
  })

  it('accumulates messages in conversation array', () => {
    const store = useChatStore.getState()

    expect(store.messages).toHaveLength(0)

    store.addMessage({ role: 'user', content: 'Zahn 46 kariös, MOD-Füllung' })

    let state = useChatStore.getState()
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0].role).toBe('user')
    expect(state.messages[0].content).toBe('Zahn 46 kariös, MOD-Füllung')
    expect(state.messages[0].id).toBeDefined()
    expect(state.messages[0].timestamp).toBeInstanceOf(Date)

    store.addMessage({ role: 'assistant', content: 'Ich schlage GOZ 2060 vor.' })

    state = useChatStore.getState()
    expect(state.messages).toHaveLength(2)
    expect(state.messages[1].role).toBe('assistant')
    expect(state.messages[1].content).toBe('Ich schlage GOZ 2060 vor.')
  })

  it('messages persist across multiple addMessage calls', () => {
    const store = useChatStore.getState()

    store.addMessage({ role: 'user', content: 'Erste Nachricht' })
    store.addMessage({ role: 'assistant', content: 'Erste Antwort' })
    store.addMessage({ role: 'user', content: 'Zweite Nachricht' })
    store.addMessage({ role: 'assistant', content: 'Zweite Antwort' })

    const state = useChatStore.getState()
    expect(state.messages).toHaveLength(4)
    expect(state.messages.map((m) => m.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ])
  })

  it('calculates costTotal from proposedCodes estimatedCost', () => {
    const store = useChatStore.getState()

    store.setProposedCodes([
      { code: '2060', system: 'GOZ', description: 'Füllung', estimatedCost: 85.5 },
      { code: '2080', system: 'GOZ', description: 'Kompositfüllung', estimatedCost: 120.0 },
      { code: 'Ä925', system: 'BEMA', description: 'Anästhesie' },
    ])

    const state = useChatStore.getState()
    expect(state.proposedCodes).toHaveLength(3)
    expect(state.costTotal).toBe(205.5)
  })

  it('resetChat clears all state', () => {
    const store = useChatStore.getState()
    store.setSessionId('test-session')
    store.addMessage({ role: 'user', content: 'Hallo' })
    store.setProposedCodes([
      { code: '2060', system: 'GOZ', description: 'Füllung', estimatedCost: 85.5 },
    ])

    store.resetChat()

    const state = useChatStore.getState()
    expect(state.sessionId).toBeNull()
    expect(state.messages).toHaveLength(0)
    expect(state.proposedCodes).toHaveLength(0)
    expect(state.costTotal).toBe(0)
  })
})
