/**
 * Unit tests for AidboxClient.
 * All HTTP calls are mocked via globalThis.fetch.
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'
import { AidboxClient } from '../client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/fhir+json' },
  })
}

function errorResponse(status: number, text = 'Error') {
  return new Response(text, { status })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AidboxClient', () => {
  let originalFetch: typeof fetch
  let client: AidboxClient

  beforeEach(() => {
    originalFetch = globalThis.fetch
    client = new AidboxClient('http://aidbox.test/fhir', 'Basic dGVzdDp0ZXN0')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('getPatient', () => {
    it('fetches a patient by ID', async () => {
      const patient = { resourceType: 'Patient', id: 'p-001', name: [{ family: 'Müller', given: ['Hans'] }] }
      globalThis.fetch = mock(() => Promise.resolve(jsonResponse(patient)))

      const result = await client.getPatient('p-001')

      expect(result.resourceType).toBe('Patient')
      expect(result.id).toBe('p-001')
      expect(result.name?.[0]?.family).toBe('Müller')
    })

    it('throws a descriptive error on 404', async () => {
      globalThis.fetch = mock(() => Promise.resolve(errorResponse(404, 'Resource not found')))

      await expect(client.getPatient('nonexistent')).rejects.toThrow('404')
    })

    it('sends Authorization header', async () => {
      let capturedHeaders: Headers | undefined
      const patient = { resourceType: 'Patient', id: 'p-001' }
      globalThis.fetch = mock((url: string, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers as HeadersInit)
        return Promise.resolve(jsonResponse(patient))
      })

      await client.getPatient('p-001')

      expect(capturedHeaders?.get('Authorization')).toBe('Basic dGVzdDp0ZXN0')
    })

    it('builds the correct URL', async () => {
      let capturedUrl: string | undefined
      const patient = { resourceType: 'Patient', id: 'p-002' }
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url
        return Promise.resolve(jsonResponse(patient))
      })

      await client.getPatient('p-002')

      expect(capturedUrl).toBe('http://aidbox.test/fhir/Patient/p-002')
    })
  })

  describe('getObservations', () => {
    it('returns observations for a patient', async () => {
      const bundle = {
        resourceType: 'Bundle',
        total: 2,
        entry: [
          { resource: { resourceType: 'Observation', id: 'obs-1' } },
          { resource: { resourceType: 'Observation', id: 'obs-2' } },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(jsonResponse(bundle)))

      const obs = await client.getObservations('p-001')

      expect(obs).toHaveLength(2)
      expect(obs[0].id).toBe('obs-1')
    })

    it('returns empty array when no entries', async () => {
      const bundle = { resourceType: 'Bundle', total: 0 }
      globalThis.fetch = mock(() => Promise.resolve(jsonResponse(bundle)))

      const obs = await client.getObservations('p-001')

      expect(obs).toHaveLength(0)
    })

    it('includes code parameter in URL when provided', async () => {
      let capturedUrl: string | undefined
      const bundle = { resourceType: 'Bundle', total: 0, entry: [] }
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url
        return Promise.resolve(jsonResponse(bundle))
      })

      await client.getObservations('p-001', 'http://loinc.org|8339-4')

      expect(capturedUrl).toContain('code=')
      expect(capturedUrl).toContain('8339-4')
    })

    it('includes subject parameter', async () => {
      let capturedUrl: string | undefined
      const bundle = { resourceType: 'Bundle', total: 0, entry: [] }
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url
        return Promise.resolve(jsonResponse(bundle))
      })

      await client.getObservations('p-123')

      expect(capturedUrl).toContain('subject=Patient%2Fp-123')
    })
  })

  describe('createResource', () => {
    it('POSTs a resource and returns the created resource', async () => {
      const created = { resourceType: 'Observation', id: 'obs-new' }
      globalThis.fetch = mock(() => Promise.resolve(jsonResponse(created, 201)))

      const result = await client.createResource('Observation', { resourceType: 'Observation' })

      expect((result as any).id).toBe('obs-new')
    })

    it('uses POST method', async () => {
      let capturedMethod: string | undefined
      const created = { resourceType: 'Patient', id: 'new-id' }
      globalThis.fetch = mock((_url: string, init?: RequestInit) => {
        capturedMethod = init?.method
        return Promise.resolve(jsonResponse(created, 201))
      })

      await client.createResource('Patient', { resourceType: 'Patient' })

      expect(capturedMethod).toBe('POST')
    })

    it('throws on non-2xx response', async () => {
      globalThis.fetch = mock(() => Promise.resolve(errorResponse(422, 'Unprocessable Entity')))

      await expect(client.createResource('Patient', {})).rejects.toThrow('422')
    })
  })

  describe('searchResources', () => {
    it('searches with query params and returns bundle', async () => {
      const bundle = {
        resourceType: 'Bundle',
        total: 1,
        entry: [{ resource: { resourceType: 'ChargeItemDefinition', id: 'cid-1' } }],
      }
      globalThis.fetch = mock(() => Promise.resolve(jsonResponse(bundle)))

      const result = await client.searchResources('ChargeItemDefinition', { code: 'GOZ-0010', _count: '10' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.total).toBe(1)
    })

    it('builds correct URL with params', async () => {
      let capturedUrl: string | undefined
      const bundle = { resourceType: 'Bundle', total: 0, entry: [] }
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url
        return Promise.resolve(jsonResponse(bundle))
      })

      await client.searchResources('Patient', { _count: '50' })

      expect(capturedUrl).toContain('/Patient?')
      expect(capturedUrl).toContain('_count=50')
    })
  })
})
