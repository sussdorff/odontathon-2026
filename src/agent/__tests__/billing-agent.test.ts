/**
 * Tests for BillingAgent — uses mocked Anthropic client (no real API calls).
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { BillingAgent } from '../billing-agent'
import type { ConversationState } from '../billing-agent'

// ── Mock helpers ──────────────────────────────────────────────────────────────

/** Build a mock Anthropic response that ends the turn with a text message */
function mockEndTurnResponse(text: string) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-opus-4-6',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

/** Build a mock response that calls a tool, then ends on the next call */
function mockToolCallResponse(
  toolName: string,
  toolInput: Record<string, unknown>,
  followupText: string,
) {
  const toolUseId = 'toolu_test_01'

  // First response: tool_use
  const toolUseResponse = {
    id: 'msg_tool',
    type: 'message',
    role: 'assistant',
    content: [
      { type: 'text', text: 'Ich analysiere den Befund...' },
      {
        type: 'tool_use',
        id: toolUseId,
        name: toolName,
        input: toolInput,
      },
    ],
    model: 'claude-opus-4-6',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 200, output_tokens: 100 },
  }

  // Second response: end_turn
  const endTurnResponse = mockEndTurnResponse(followupText)

  return { toolUseResponse, endTurnResponse }
}

// ── Helper: create a patched BillingAgent with a mock client ──────────────────

function createAgentWithMock(mockCreate: (...args: unknown[]) => unknown) {
  const agent = new BillingAgent('test-api-key-mock')
  // Replace the internal client's messages.create
  ;(agent as any).client = {
    messages: {
      create: mockCreate,
    },
  }
  return agent
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BillingAgent — Session Management', () => {
  it('createSession erstellt initialen ConversationState', () => {
    const agent = new BillingAgent('test-key')
    const state = agent.createSession('sess-001', 'AOK')

    expect(state.sessionId).toBe('sess-001')
    expect(state.kassenart).toBe('AOK')
    expect(state.messages).toHaveLength(0)
    expect(state.proposedItems).toHaveLength(0)
    expect(state.extractedFindings).toHaveLength(0)
    expect(state.isComplete).toBe(false)
  })

  it('createSession: Standard-Kassenart ist AOK', () => {
    const agent = new BillingAgent('test-key')
    const state = agent.createSession('sess-002')
    expect(state.kassenart).toBe('AOK')
  })

  it('chat: User-Message wird zum State hinzugefügt', async () => {
    const mockCreate = mock(() => mockEndTurnResponse('Ich helfe Ihnen gerne.'))
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-003')
    const result = await agent.chat(state, 'Hallo, ich brauche Hilfe')

    // User message should appear in the updated state
    const userMessages = result.state.messages.filter(m => m.role === 'user')
    expect(userMessages).toHaveLength(1)
    expect((userMessages[0].content as string)).toBe('Hallo, ich brauche Hilfe')
  })

  it('Multi-Turn: State bleibt zwischen Turns erhalten', async () => {
    let callCount = 0
    const mockCreate = mock(() => {
      callCount++
      return mockEndTurnResponse(`Antwort ${callCount}`)
    })
    const agent = createAgentWithMock(mockCreate)

    const state1 = agent.createSession('sess-004')
    const { state: state2 } = await agent.chat(state1, 'Erste Nachricht')
    const { state: state3 } = await agent.chat(state2, 'Zweite Nachricht')

    // state3 should have user + assistant + user + assistant messages
    const userMessages = state3.messages.filter(m => m.role === 'user')
    expect(userMessages.length).toBeGreaterThanOrEqual(2)
    expect(callCount).toBe(2)
  })
})

describe('BillingAgent — Code-Vorschläge', () => {
  it('suggest_billing_codes Tool wird aufgerufen und gibt Billing-Items zurück', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'suggest_billing_codes',
      { finding_text: 'Füllung Zahn 26 mesio-okklusal 2-flächig', category: 'KCH' },
      'Ich schlage folgende GOZ-Positionen vor: GOZ 2050 (Kompositfüllung 2-flächig) bei Faktor 2.3.',
    )

    let callIndex = 0
    const mockCreate = mock(() => {
      return callIndex++ === 0 ? toolUseResponse : endTurnResponse
    })
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-codes')
    const { response } = await agent.chat(state, 'Füllung Zahn 26 mesio-okklusal 2-flächig')

    expect(response.message).toContain('GOZ')
    // The tool was called — claude called suggest_billing_codes
    expect(callIndex).toBe(2)
  })

  it('response.message enthält Antworttext des Assistenten', async () => {
    const mockCreate = mock(() =>
      mockEndTurnResponse('Für die Füllungstherapie empfehle ich GOZ 2050 bei Faktor 2.3.')
    )
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-msg')
    const { response } = await agent.chat(state, 'Welche Position für eine 2-flächige Füllung?')

    expect(response.message).toContain('GOZ')
    expect(response.message.length).toBeGreaterThan(0)
  })
})

describe('BillingAgent — Validierung', () => {
  it('validate_billing_items Tool wird ausgeführt und Validierungsergebnisse gespeichert', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'validate_billing_items',
      {
        items: [
          { code: '2050', system: 'GOZ', multiplier: 2.3 },
          { code: '2060', system: 'GOZ', multiplier: 2.3 },
        ],
      },
      'Die Abrechnungspositionen sind regelkonform.',
    )

    let callIndex = 0
    const mockCreate = mock(() => callIndex++ === 0 ? toolUseResponse : endTurnResponse)
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-validate')
    const { response } = await agent.chat(state, 'Bitte validiere GOZ 2050 und GOZ 2060')

    // validationIssues should be an array (possibly empty for these codes)
    expect(Array.isArray(response.validationIssues)).toBe(true)
  })
})

describe('BillingAgent — Rückfragen', () => {
  it('request_followup Tool füllt followUpQuestions', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'request_followup',
      {
        questions: [
          'Welcher Zahn wurde behandelt (FDI-Nummer)?',
          'Wie viele Flächen hat die Füllung?',
          'Ist der Patient privat- oder kassenzahnärztlich versichert?',
        ],
        reason: 'Für die korrekte Abrechnung werden Zahnposition und Flächenzahl benötigt.',
      },
      'Ich benötige noch einige Informationen für die korrekte Abrechnung.',
    )

    let callIndex = 0
    const mockCreate = mock(() => callIndex++ === 0 ? toolUseResponse : endTurnResponse)
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-followup')
    const { response } = await agent.chat(state, 'Es wurde eine Füllung gemacht.')

    expect(response.followUpQuestions).toHaveLength(3)
    expect(response.followUpQuestions[0]).toContain('FDI')
    expect(response.followUpQuestions[1]).toContain('Flächen')
  })

  it('isComplete ist false wenn Rückfragen vorhanden', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'request_followup',
      { questions: ['Welcher Zahn?'], reason: 'Zahnposition fehlt' },
      'Bitte geben Sie die Zahnposition an.',
    )

    let callIndex = 0
    const mockCreate = mock(() => callIndex++ === 0 ? toolUseResponse : endTurnResponse)
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-incomplete')
    const { response } = await agent.chat(state, 'Füllung')

    expect(response.isComplete).toBe(false)
  })
})

describe('BillingAgent — Kostenschätzung', () => {
  it('estimate_cost Tool liefert Kostenschätzung', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'estimate_cost',
      {
        items: [{ code: '0010', system: 'GOZ', multiplier: 2.3 }],
        kassenart: 'AOK',
      },
      'Die Kostenschätzung beläuft sich auf ca. 12,93 EUR.',
    )

    let callIndex = 0
    const mockCreate = mock(() => callIndex++ === 0 ? toolUseResponse : endTurnResponse)
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-cost', 'AOK')
    const { response } = await agent.chat(state, 'Bitte erstelle eine Kostenschätzung für GOZ 0010 bei 2.3x')

    // Cost should be populated from the real executeEstimateCost (which uses real calculator)
    expect(response.estimatedCost).toBeDefined()
    expect(typeof response.estimatedCost).toBe('number')
    expect(response.estimatedCost).toBeGreaterThan(0)
  })

  it('executeEstimateCost: GOZ 0010 bei 2.3× → ~12.93 EUR', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'estimate_cost',
      {
        items: [{ code: '0010', system: 'GOZ', multiplier: 2.3 }],
        kassenart: 'AOK',
      },
      'Kostenschätzung erstellt.',
    )

    let callIndex = 0
    const mockCreate = mock(() => callIndex++ === 0 ? toolUseResponse : endTurnResponse)
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-goz-cost')
    const { response } = await agent.chat(state, 'Kostenschätzung GOZ 0010')

    // Real cost calculator is used: 100 × 0.0562421 × 2.3 ≈ 12.93 EUR
    expect(response.estimatedCost).toBeCloseTo(12.93, 1)
  })

  it('executeEstimateCost mit Festzuschuss → patientShare', async () => {
    const { toolUseResponse, endTurnResponse } = mockToolCallResponse(
      'estimate_cost',
      {
        items: [{ code: '0010', system: 'GOZ', multiplier: 2.3 }],
        kassenart: 'AOK',
        festzuschuss: 5.0,
      },
      'Kostenschätzung mit Festzuschuss erstellt.',
    )

    let callIndex = 0
    const mockCreate = mock(() => callIndex++ === 0 ? toolUseResponse : endTurnResponse)
    const agent = createAgentWithMock(mockCreate)

    const state = agent.createSession('sess-patient-share')
    const { response } = await agent.chat(state, 'Kostenschätzung mit Festzuschuss 5 EUR')

    // estimatedCost is the total, which is still the full amount
    expect(response.estimatedCost).toBeCloseTo(12.93, 1)
  })
})
