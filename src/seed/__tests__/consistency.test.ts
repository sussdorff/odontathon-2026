/**
 * Unit tests for practice seed bundle consistency.
 * Tests run against the in-memory built bundle — no Aidbox calls.
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { buildPracticeBundle } from '../index.js'

type FhirResource = Record<string, unknown>
type BundleEntry = { resource: FhirResource; request: { url: string } }

let bundle: Record<string, unknown>
let entries: BundleEntry[]
let resources: FhirResource[]

beforeAll(() => {
  bundle = buildPracticeBundle()
  entries = (bundle.entry as BundleEntry[]) ?? []
  resources = entries.map((e) => e.resource)
})

// ─── Helper functions ─────────────────────────────────────────────────────────

function byType(rt: string): FhirResource[] {
  return resources.filter((r) => r.resourceType === rt)
}

function getToothCode(obs: FhirResource): string | undefined {
  const vc = obs.valueCodeableConcept as { coding?: Array<{ code?: string }> }
  return vc?.coding?.[0]?.code
}

function getBodySiteCode(obs: FhirResource): string | undefined {
  const bs = obs.bodySite as { coding?: Array<{ code?: string }> }
  return bs?.coding?.[0]?.code
}

function getPatientRef(obs: FhirResource): string | undefined {
  return (obs.subject as { reference?: string })?.reference
}

// ─── Bundle size ─────────────────────────────────────────────────────────────

describe('bundle size', () => {
  test('has at least 130 entries', () => {
    expect(entries.length).toBeGreaterThanOrEqual(130)
  })

  test('has exactly 10 patients', () => {
    expect(byType('Patient').length).toBe(10)
  })

  test('has exactly 10 coverages', () => {
    expect(byType('Coverage').length).toBe(10)
  })

  test('has at least 95 observations (Zahnbefunde)', () => {
    expect(byType('Observation').length).toBeGreaterThanOrEqual(95)
  })
})

// ─── Coverage: each patient has exactly 1 ────────────────────────────────────

describe('coverages', () => {
  test('each patient has exactly 1 Coverage', () => {
    const patients = byType('Patient')
    const coverages = byType('Coverage')

    for (const patient of patients) {
      const patientRef = `Patient/${patient.id as string}`
      const patientCoverages = coverages.filter(
        (c) => (c.beneficiary as { reference?: string })?.reference === patientRef,
      )
      expect(patientCoverages.length).toBe(1)
    }
  })
})

// ─── Consistency: no filling/crown on absent tooth ───────────────────────────

describe('consistency', () => {
  test('no filling or crown on a tooth marked absent in same patient', () => {
    const observations = byType('Observation')

    // Build a map: patientRef → Set of absent tooth numbers
    const absentTeeth = new Map<string, Set<string>>()

    for (const obs of observations) {
      const code = getToothCode(obs)
      if (code === 'absent') {
        const patientRef = getPatientRef(obs) ?? ''
        const toothCode = getBodySiteCode(obs) ?? ''
        if (!absentTeeth.has(patientRef)) {
          absentTeeth.set(patientRef, new Set())
        }
        absentTeeth.get(patientRef)!.add(toothCode)
      }
    }

    // Check that no filling, crown-intact, or crown-needs-renewal exists for absent teeth
    const incompatibleStatuses = new Set(['filled', 'crown-intact', 'crown-needs-renewal'])

    for (const obs of observations) {
      const code = getToothCode(obs)
      if (!code || !incompatibleStatuses.has(code)) continue

      const patientRef = getPatientRef(obs) ?? ''
      const toothCode = getBodySiteCode(obs) ?? ''
      const absent = absentTeeth.get(patientRef)

      if (absent?.has(toothCode)) {
        throw new Error(
          `Consistency violation: Patient ${patientRef} has ${code} on tooth ${toothCode} which is marked absent`,
        )
      }
    }

    // If we get here, no violations found
    expect(true).toBe(true)
  })
})

// ─── Extension URLs ───────────────────────────────────────────────────────────

describe('extension URLs', () => {
  const MIRA_NS = 'https://mira.cognovis.de/fhir/StructureDefinition/'

  function collectExtensionUrls(obj: unknown): string[] {
    if (obj === null || typeof obj !== 'object') return []

    const urls: string[] = []
    const record = obj as Record<string, unknown>

    if (Array.isArray(obj)) {
      for (const item of obj) {
        urls.push(...collectExtensionUrls(item))
      }
    } else {
      // If this object has a 'url' key and an extension-like sibling key, it's an extension
      if (typeof record.url === 'string' && ('value' in record || Object.keys(record).some(k => k.startsWith('value')))) {
        urls.push(record.url)
      }
      for (const value of Object.values(record)) {
        if (typeof value === 'object') {
          urls.push(...collectExtensionUrls(value))
        }
      }
    }

    return urls
  }

  test('all extension URLs start with MIRA namespace', () => {
    const allUrls: string[] = []

    for (const resource of resources) {
      const exts = resource.extension as Array<{ url: string }> | undefined
      if (exts) {
        for (const ext of exts) {
          allUrls.push(ext.url)
        }
      }
    }

    // Filter to only URLs that look like extension URLs (contain StructureDefinition or similar)
    const sdUrls = allUrls.filter((url) => url.includes('StructureDefinition') || url.includes('mira.cognovis'))

    for (const url of sdUrls) {
      expect(url).toMatch(new RegExp(`^${MIRA_NS.replace(/\//g, '\\/')}`))
    }
  })

  test('Observations with filled status have tooth-surfaces extension with MIRA URL', () => {
    const observations = byType('Observation')
    const filledObs = observations.filter((obs) => getToothCode(obs) === 'filled')

    for (const obs of filledObs) {
      const exts = obs.extension as Array<{ url: string; valueString?: string }> | undefined
      expect(exts).toBeDefined()
      const surfExt = exts?.find((e) => e.url.includes('tooth-surfaces'))
      expect(surfExt).toBeDefined()
      expect(surfExt!.url).toMatch(new RegExp(`^${MIRA_NS.replace(/\//g, '\\/')}`))
    }
  })

  test('Coverage ze-bonus-prozent extensions use MIRA namespace', () => {
    const coverages = byType('Coverage')
    for (const coverage of coverages) {
      const exts = coverage.extension as Array<{ url: string }> | undefined
      if (!exts) continue
      for (const ext of exts) {
        expect(ext.url).toMatch(new RegExp(`^${MIRA_NS.replace(/\//g, '\\/')}`))
      }
    }
  })
})

// ─── Resource ordering ────────────────────────────────────────────────────────

describe('bundle ordering', () => {
  function firstIndexOfType(rt: string): number {
    return entries.findIndex((e) => e.resource.resourceType === rt)
  }

  function lastIndexOfType(rt: string): number {
    let last = -1
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].resource.resourceType === rt) last = i
    }
    return last
  }

  test('Organizations appear before Practitioners', () => {
    expect(lastIndexOfType('Organization')).toBeLessThan(firstIndexOfType('Practitioner'))
  })

  test('Practitioners appear before PractitionerRoles', () => {
    expect(lastIndexOfType('Practitioner')).toBeLessThan(firstIndexOfType('PractitionerRole'))
  })

  test('Patients appear before Coverages', () => {
    expect(lastIndexOfType('Patient')).toBeLessThan(firstIndexOfType('Coverage'))
  })

  test('Coverages appear before Observations', () => {
    expect(lastIndexOfType('Coverage')).toBeLessThan(firstIndexOfType('Observation'))
  })
})

// ─── Request methods ──────────────────────────────────────────────────────────

describe('idempotency', () => {
  test('all bundle entries use PUT method', () => {
    for (const entry of entries) {
      expect(entry.request.method).toBe('PUT')
    }
  })

  test('all PUT URLs match resource type/id', () => {
    for (const entry of entries) {
      const rt = entry.resource.resourceType as string
      const id = entry.resource.id as string
      expect(entry.request.url).toBe(`${rt}/${id}`)
    }
  })
})
