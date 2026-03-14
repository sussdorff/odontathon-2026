/**
 * Integration tests for:
 *  - POST /api/agent/chat
 *  - GET /api/patients/:id/findings
 *  - POST /api/hkp/draft
 *
 * Anthropic SDK and Aidbox fetch calls are mocked at the module/fetch level.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import { app } from '../../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/fhir+json' },
  })
}

/** Minimal mock for Anthropic messages.create that returns a text response */
function anthropicTextResponse(text: string) {
  return {
    id: 'msg_mock',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-opus-4-6',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 50, output_tokens: 30 },
  }
}

/** Aidbox observation bundle for patient p-123 */
function mockObsBundle(patientId: string) {
  return {
    resourceType: 'Bundle',
    total: 2,
    entry: [
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-001',
          subject: { reference: `Patient/${patientId}` },
          bodySite: {
            coding: [{ system: 'http://example.org/fdi-tooth-number', code: '26' }],
          },
          valueCodeableConcept: {
            coding: [{ system: 'http://example.org/tooth-status', code: 'carious' }],
          },
          extension: [
            { url: 'http://example.org/tooth-surfaces', valueString: 'm,o' },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-002',
          subject: { reference: `Patient/${patientId}` },
          bodySite: {
            coding: [{ system: 'http://example.org/fdi-tooth-number', code: '27' }],
          },
          valueCodeableConcept: {
            coding: [{ system: 'http://example.org/tooth-status', code: 'healthy' }],
          },
          extension: [],
        },
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// POST /api/agent/chat
// ---------------------------------------------------------------------------

describe('POST /api/agent/chat', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns 400 when message is missing', async () => {
    const res = await app.request('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'sess-1' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('creates a new session when sessionId is absent', async () => {
    // Mock Anthropic SDK on the BillingAgent instance via module-level injection
    const { BillingAgent } = await import('../../agent/billing-agent')
    const originalProto = BillingAgent.prototype.chat
    BillingAgent.prototype.chat = mock(async function (state: any, _msg: string) {
      return {
        state: { ...state, messages: [{ role: 'user', content: _msg }, { role: 'assistant', content: 'Hallo!' }] },
        response: {
          message: 'Hallo! Ich bin Ihr Abrechnungsassistent.',
          proposedItems: [],
          validationIssues: [],
          followUpQuestions: [],
          isComplete: false,
        },
      }
    }) as any

    try {
      const res = await app.request('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hallo' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(typeof body.sessionId).toBe('string')
      expect(body.sessionId.length).toBeGreaterThan(0)
      expect(body.message).toBeDefined()
      expect(Array.isArray(body.proposedItems)).toBe(true)
      expect(Array.isArray(body.validationIssues)).toBe(true)
      expect(Array.isArray(body.followUpQuestions)).toBe(true)
      expect(typeof body.isComplete).toBe('boolean')
    } finally {
      BillingAgent.prototype.chat = originalProto
    }
  })

  it('reuses an existing session when sessionId is provided', async () => {
    const { BillingAgent } = await import('../../agent/billing-agent')
    let callCount = 0
    const originalProto = BillingAgent.prototype.chat
    BillingAgent.prototype.chat = mock(async function (state: any, _msg: string) {
      callCount++
      return {
        state: { ...state, messages: [...state.messages, { role: 'user', content: _msg }] },
        response: {
          message: `Antwort ${callCount}`,
          proposedItems: [],
          validationIssues: [],
          followUpQuestions: [],
          isComplete: false,
        },
      }
    }) as any

    try {
      // First request — creates session
      const res1 = await app.request('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Erste Nachricht' }),
      })
      const body1 = await res1.json()
      const sessionId = body1.sessionId

      // Second request — reuses session
      const res2 = await app.request('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Zweite Nachricht', sessionId }),
      })

      expect(res2.status).toBe(200)
      const body2 = await res2.json()
      expect(body2.sessionId).toBe(sessionId)
      expect(callCount).toBe(2)
    } finally {
      BillingAgent.prototype.chat = originalProto
    }
  })

  it('includes patientId context in the message when provided', async () => {
    const { BillingAgent } = await import('../../agent/billing-agent')
    let capturedMessage = ''
    const originalProto = BillingAgent.prototype.chat
    BillingAgent.prototype.chat = mock(async function (state: any, msg: string) {
      capturedMessage = msg
      return {
        state,
        response: {
          message: 'OK',
          proposedItems: [],
          validationIssues: [],
          followUpQuestions: [],
          isComplete: false,
        },
      }
    }) as any

    try {
      await app.request('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Befund beschreiben', patientId: 'p-999' }),
      })

      expect(capturedMessage).toContain('p-999')
    } finally {
      BillingAgent.prototype.chat = originalProto
    }
  })
})

// ---------------------------------------------------------------------------
// GET /api/patients/:id/findings
// ---------------------------------------------------------------------------

describe('GET /api/patients/:id/findings', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns findings for a patient', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse(mockObsBundle('p-123'))))

    const res = await app.request('/api/patients/p-123/findings')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.patientId).toBe('p-123')
    expect(typeof body.total).toBe('number')
    expect(Array.isArray(body.findings)).toBe(true)
  })

  it('maps tooth code to number', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse(mockObsBundle('p-123'))))

    const res = await app.request('/api/patients/p-123/findings')
    const body = await res.json()

    const tooth26 = body.findings.find((f: any) => f.tooth === 26)
    expect(tooth26).toBeDefined()
    expect(tooth26.tooth).toBe(26)
  })

  it('includes observationId in each finding', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse(mockObsBundle('p-123'))))

    const res = await app.request('/api/patients/p-123/findings')
    const body = await res.json()

    for (const finding of body.findings) {
      expect(typeof finding.observationId).toBe('string')
    }
  })

  it('maps tooth surfaces from extension', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse(mockObsBundle('p-123'))))

    const res = await app.request('/api/patients/p-123/findings')
    const body = await res.json()

    const tooth26 = body.findings.find((f: any) => f.tooth === 26)
    expect(tooth26.surfaces).toEqual(['m', 'o'])
  })

  it('returns empty findings when bundle is empty', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ resourceType: 'Bundle', total: 0 }))
    )

    const res = await app.request('/api/patients/p-empty/findings')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.findings).toHaveLength(0)
    expect(body.total).toBe(0)
  })

  it('returns the status (tooth condition)', async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse(mockObsBundle('p-123'))))

    const res = await app.request('/api/patients/p-123/findings')
    const body = await res.json()

    const tooth26 = body.findings.find((f: any) => f.tooth === 26)
    expect(tooth26.status).toBe('carious')
  })
})

// ---------------------------------------------------------------------------
// POST /api/hkp/draft
// ---------------------------------------------------------------------------

describe('POST /api/hkp/draft', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns 400 when patientId is missing', async () => {
    const res = await app.request('/api/hkp/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingItems: [], kassenart: 'PKV' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns a draft with correct shape', async () => {
    // Mock ChargeItemDefinition lookup (returns empty bundle for description fallback)
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ resourceType: 'Bundle', total: 0, entry: [] }))
    )

    const res = await app.request('/api/hkp/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p-001',
        billingItems: [],
        kassenart: 'PKV',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.draftId).toBe('string')
    expect(body.patientId).toBe('p-001')
    expect(typeof body.createdAt).toBe('string')
    expect(body.kassenart).toBe('PKV')
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.totalEstimate).toBe('number')
    expect(body.status).toBe('draft')
  })

  it('calculates totalEstimate for GOZ items', async () => {
    // Mock ChargeItemDefinition lookup
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ resourceType: 'Bundle', total: 0, entry: [] }))
    )

    const res = await app.request('/api/hkp/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p-001',
        billingItems: [
          { code: '0010', system: 'GOZ', teeth: [11], factor: 2.3 },
        ],
        kassenart: 'PKV',
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    // GOZ 0010 at 2.3x = 100 × 0.0562421 × 2.3 ≈ 12.93
    expect(body.totalEstimate).toBeGreaterThan(0)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].code).toBe('0010')
  })

  it('generates a unique draftId (UUID)', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ resourceType: 'Bundle', total: 0, entry: [] }))
    )

    const [res1, res2] = await Promise.all([
      app.request('/api/hkp/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: 'p-001', billingItems: [], kassenart: 'GKV' }),
      }),
      app.request('/api/hkp/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: 'p-002', billingItems: [], kassenart: 'PKV' }),
      }),
    ])

    const b1 = await res1.json()
    const b2 = await res2.json()
    expect(b1.draftId).not.toBe(b2.draftId)
  })

  it('uses code as description fallback when ChargeItemDefinition not found', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ resourceType: 'Bundle', total: 0, entry: [] }))
    )

    const res = await app.request('/api/hkp/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'p-001',
        billingItems: [{ code: '0010', system: 'GOZ', teeth: [], factor: 2.3 }],
        kassenart: 'PKV',
      }),
    })

    const body = await res.json()
    // description should at least contain the code
    expect(body.items[0].description).toBeDefined()
  })
})
