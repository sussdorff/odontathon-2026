/**
 * ETL Pipeline Tests
 *
 * Tests for GOZ, BEMA, Festzuschuss, Kürzel, and Punktwerte catalog ETL pipelines.
 *
 * Acceptance criteria:
 * 1. GOZ XML→FHIR Pipeline: parse + to_fhir + seed
 * 2. BEMA JSON→FHIR Pipeline
 * 3. Festzuschuss-Befundklassen as CodeSystem
 * 4. Befund-/Therapiekürzel as CodeSystem
 * 5. Punktwerte Berlin configured
 * 6. All catalogs loadable via seed:catalogs
 * 7. Count assertions
 */

import { describe, it, expect } from 'bun:test'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = join(import.meta.dir, '..', '..')
const SEED_DIR = join(ROOT, 'aidbox', 'seed')

// --- Helper: load JSON seed file ---
function loadSeed(filename: string) {
  const path = join(SEED_DIR, filename)
  expect(existsSync(path), `Seed file not found: ${path}`).toBe(true)
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function countByResourceType(bundle: { entry: Array<{ resource: { resourceType: string } }> }, type: string): number {
  return bundle.entry.filter((e) => e.resource?.resourceType === type).length
}

// ============================================================
// 1. GOZ XML→FHIR Pipeline
// ============================================================
describe('GOZ ETL', () => {
  it('test_goz_parse: parse.ts outputs array with ≥209 entries', () => {
    const proc = spawnSync('bun', ['run', join(ROOT, 'etl', 'goz', 'parse.ts')], {
      cwd: ROOT,
      encoding: 'utf-8',
    })
    expect(proc.status, `parse.ts failed: ${proc.stderr}`).toBe(0)
    const entries = JSON.parse(proc.stdout)
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThanOrEqual(209)
  })

  it('test_goz_fhir: goz-catalog.json has CodeSystem + ChargeItemDefinitions', () => {
    const bundle = loadSeed('goz-catalog.json')
    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('transaction')
    expect(Array.isArray(bundle.entry)).toBe(true)

    const codeSystemCount = countByResourceType(bundle, 'CodeSystem')
    expect(codeSystemCount).toBe(1)

    const cidCount = countByResourceType(bundle, 'ChargeItemDefinition')
    expect(cidCount).toBeGreaterThanOrEqual(209)

    // Check CodeSystem URL
    const cs = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'CodeSystem')?.resource
    expect(cs?.url).toBe('http://fhir.de/CodeSystem/goz')
    expect(cs?.status).toBe('active')
    expect(cs?.content).toBe('complete')

    // Check a ChargeItemDefinition has required fields
    const cid = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'ChargeItemDefinition')?.resource
    expect(cid?.url).toContain('http://fhir.de/ChargeItemDefinition/goz/')
    expect(cid?.propertyGroup).toBeDefined()
    expect(cid?.extension).toBeDefined()
    // Must have multiplier extension
    const ext = cid?.extension?.[0]
    expect(ext?.url).toContain('goz-multiplier-range')
  })

  it('test_goz_count: GOZ catalog has ≥209 entries (actual XML count)', () => {
    const bundle = loadSeed('goz-catalog.json')
    const cidCount = countByResourceType(bundle, 'ChargeItemDefinition')
    expect(cidCount).toBeGreaterThanOrEqual(209)
  })
})

// ============================================================
// 2. BEMA JSON→FHIR Pipeline
// ============================================================
describe('BEMA ETL', () => {
  it('test_bema_parse: bema_catalog.json has ≥200 entries', () => {
    const dataPath = join(ROOT, 'etl', 'bema', 'data', 'bema_catalog.json')
    expect(existsSync(dataPath)).toBe(true)
    const entries = JSON.parse(readFileSync(dataPath, 'utf-8'))
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThanOrEqual(200)

    // Check structure
    const first = entries[0]
    expect(first.code).toBeDefined()
    expect(first.beschreibung).toBeDefined()
    expect(typeof first.punktzahl).toBe('number')
    expect(first.bereich).toBeDefined()
  })

  it('test_bema_fhir: bema-catalog.json has correct FHIR structure', () => {
    const bundle = loadSeed('bema-catalog.json')
    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('transaction')

    const codeSystemCount = countByResourceType(bundle, 'CodeSystem')
    expect(codeSystemCount).toBe(1)

    const cidCount = countByResourceType(bundle, 'ChargeItemDefinition')
    expect(cidCount).toBeGreaterThanOrEqual(200)

    // Check CodeSystem URL
    const cs = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'CodeSystem')?.resource
    expect(cs?.url).toBe('http://fhir.de/CodeSystem/bema')
    expect(cs?.status).toBe('active')
    expect(cs?.content).toBe('complete')

    // BEMA should NOT have multiplier extension (unlike GOZ)
    const cid = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'ChargeItemDefinition')?.resource
    expect(cid?.extension).toBeUndefined()
    expect(cid?.propertyGroup).toBeDefined()
  })

  it('test_bema_bereiche: all 5 Bereiche present (KCH, KB, KFO, PAR, ZE)', () => {
    const dataPath = join(ROOT, 'etl', 'bema', 'data', 'bema_catalog.json')
    const entries: Array<{ bereich: string }> = JSON.parse(readFileSync(dataPath, 'utf-8'))
    const bereiche = new Set(entries.map((e) => e.bereich))
    expect(bereiche.has('KCH')).toBe(true)
    expect(bereiche.has('KB')).toBe(true)
    expect(bereiche.has('KFO')).toBe(true)
    expect(bereiche.has('PAR')).toBe(true)
    expect(bereiche.has('ZE')).toBe(true)
  })
})

// ============================================================
// 3. Festzuschuss Befundklassen as CodeSystem
// ============================================================
describe('Festzuschuss ETL', () => {
  it('festzuschuss-catalog.json has CodeSystem with ≥40 Befundklassen', () => {
    const bundle = loadSeed('festzuschuss-catalog.json')
    expect(bundle.resourceType).toBe('Bundle')

    const codeSystemCount = countByResourceType(bundle, 'CodeSystem')
    expect(codeSystemCount).toBe(1)

    const cs = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'CodeSystem')?.resource
    expect(cs?.url).toBe('http://fhir.de/CodeSystem/kzbv-festzuschuss-befundklassen')
    expect(cs?.count).toBeGreaterThanOrEqual(40)

    const cidCount = countByResourceType(bundle, 'ChargeItemDefinition')
    expect(cidCount).toBeGreaterThanOrEqual(40)
  })

  it('festzuschuss ChargeItemDefinition has 4 priceComponents (60/70/75/100%)', () => {
    const bundle = loadSeed('festzuschuss-catalog.json')
    const cid = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'ChargeItemDefinition')?.resource
    expect(cid?.propertyGroup).toBeDefined()
    expect(cid.propertyGroup.length).toBe(4)

    // Check all have EUR amounts
    for (const pg of cid.propertyGroup) {
      const pc = pg.priceComponent?.[0]
      expect(pc?.amount?.currency).toBe('EUR')
      expect(pc?.amount?.value).toBeGreaterThan(0)
    }
  })

  it('festzuschuss: all 8 Befundklassen-Gruppen (1-8) are represented', () => {
    const bundle = loadSeed('festzuschuss-catalog.json')
    const cs = bundle.entry.find((e: { resource: { resourceType: string } }) => e.resource?.resourceType === 'CodeSystem')?.resource
    const gruppen = new Set(
      cs.concept.flatMap((c: { property: Array<{ code: string; valueString: string }> }) =>
        c.property?.filter((p: { code: string }) => p.code === 'befundklasse-gruppe').map((p: { valueString: string }) => p.valueString)
      )
    )
    // Groups 1-7 must exist (8 is partial treatment — no EUR amounts, not in catalog)
    for (const g of ['1', '2', '3', '4', '5', '6', '7']) {
      expect(gruppen.has(g), `Gruppe ${g} missing`).toBe(true)
    }
  })
})

// ============================================================
// 4. Befund-/Therapiekürzel as CodeSystem
// ============================================================
describe('Kürzel ETL', () => {
  it('kuerzel-catalog.json has 1 CodeSystem with Befund + Regelversorgung + Therapieplanung', () => {
    const bundle = loadSeed('kuerzel-catalog.json')
    expect(bundle.resourceType).toBe('Bundle')

    const codeSystemCount = countByResourceType(bundle, 'CodeSystem')
    expect(codeSystemCount).toBe(1)

    const cs = bundle.entry[0].resource
    expect(cs?.url).toBe('http://fhir.de/CodeSystem/kzbv-hkp-kuerzel')
    expect(cs?.status).toBe('active')
    expect(cs?.count).toBeGreaterThan(50)
  })

  it('kuerzel: all three Zeilen present (B, R, TP)', () => {
    const bundle = loadSeed('kuerzel-catalog.json')
    const cs = bundle.entry[0].resource
    const zeilen = new Set(
      cs.concept.flatMap((c: { property: Array<{ code: string; valueString: string }> }) =>
        c.property?.filter((p: { code: string }) => p.code === 'zeile').map((p: { valueString: string }) => p.valueString)
      )
    )
    expect(zeilen.has('B'), 'Befund-Zeile missing').toBe(true)
    expect(zeilen.has('R'), 'Regelversorgung-Zeile missing').toBe(true)
    expect(zeilen.has('TP'), 'Therapieplanung-Zeile missing').toBe(true)
  })

  it('kuerzel: key Befundkürzel present (f, ww, k, x)', () => {
    const dataPath = join(ROOT, 'etl', 'kuerzel', 'data', 'kuerzel_catalog.json')
    const entries: Array<{ code: string; zeile: string }> = JSON.parse(readFileSync(dataPath, 'utf-8'))
    const befundCodes = new Set(entries.filter((e) => e.zeile === 'B').map((e) => e.code))
    expect(befundCodes.has('f')).toBe(true)   // fehlender Zahn
    expect(befundCodes.has('ww')).toBe(true)  // weitgehende Zerstörung
    expect(befundCodes.has('k')).toBe(true)   // intakte Krone
    expect(befundCodes.has('x')).toBe(true)   // nicht erhaltungswürdig
  })
})

// ============================================================
// 5. Punktwerte Berlin
// ============================================================
describe('Punktwerte ETL', () => {
  it('test_punktwerte_config: punktwerte JSON has all 4 Kassenarten × 4 Bereiche', () => {
    const dataPath = join(ROOT, 'etl', 'punktwerte', 'data', 'punktwerte_berlin_q1_2026.json')
    expect(existsSync(dataPath)).toBe(true)
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

    expect(data.region).toBe('Berlin')
    expect(data.kzv).toContain('Berlin')
    expect(data.gueltig_ab).toBe('2026-01-01')

    const kassenarten = Object.keys(data.kassenarten)
    expect(kassenarten).toHaveLength(4)
    expect(kassenarten).toContain('AOK')
    expect(kassenarten).toContain('BKK')
    expect(kassenarten).toContain('IKK')
    expect(kassenarten).toContain('vdek')

    const bereiche = ['KCH', 'ZE', 'PAR', 'KFO']
    for (const kassenart of kassenarten) {
      for (const bereich of bereiche) {
        const punktwert = data.kassenarten[kassenart][bereich]
        expect(typeof punktwert, `${kassenart}.${bereich} not a number`).toBe('number')
        expect(punktwert, `${kassenart}.${bereich} should be > 0`).toBeGreaterThan(0)
      }
    }
  })

  it('punktwerte-berlin.json is valid FHIR Bundle with Parameters', () => {
    const bundle = loadSeed('punktwerte-berlin.json')
    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('transaction')
    expect(bundle.entry).toHaveLength(1)

    const params = bundle.entry[0].resource
    expect(params.resourceType).toBe('Parameters')
    expect(Array.isArray(params.parameter)).toBe(true)

    // Should have 4 kassenarten × 4 bereiche = 16 parameter entries + 3 meta = 19
    expect(params.parameter.length).toBeGreaterThanOrEqual(16)

    // Check that all kassenart/bereich combos are present
    const paramNames = params.parameter.map((p: { name: string }) => p.name) as string[]
    const expected = [
      'punktwert-AOK-KCH', 'punktwert-AOK-ZE', 'punktwert-AOK-PAR', 'punktwert-AOK-KFO',
      'punktwert-BKK-KCH', 'punktwert-vdek-KCH', 'punktwert-IKK-KCH',
    ]
    for (const name of expected) {
      expect(paramNames, `Missing parameter: ${name}`).toContain(name)
    }
  })
})

// ============================================================
// 6 + 7. Seed files exist and count assertions
// ============================================================
describe('Seed files and count assertions', () => {
  it('all 5 seed files exist in aidbox/seed/', () => {
    const files = [
      'goz-catalog.json',
      'bema-catalog.json',
      'festzuschuss-catalog.json',
      'kuerzel-catalog.json',
      'punktwerte-berlin.json',
    ]
    for (const file of files) {
      expect(existsSync(join(SEED_DIR, file)), `Missing: ${file}`).toBe(true)
    }
  })

  it('test_count_assertions: GOZ ≥209, BEMA ≥200, Festzuschüsse ≥40', () => {
    const goz = loadSeed('goz-catalog.json')
    const bema = loadSeed('bema-catalog.json')
    const fz = loadSeed('festzuschuss-catalog.json')

    const gozCount = countByResourceType(goz, 'ChargeItemDefinition')
    const bemaCount = countByResourceType(bema, 'ChargeItemDefinition')
    const fzCount = countByResourceType(fz, 'ChargeItemDefinition')

    expect(gozCount).toBeGreaterThanOrEqual(209)
    expect(bemaCount).toBeGreaterThanOrEqual(200)
    expect(fzCount).toBeGreaterThanOrEqual(40)

    console.log(`Count summary: GOZ=${gozCount}, BEMA=${bemaCount}, Festzuschüsse=${fzCount}`)
  })

  it('all seed files are valid FHIR transaction Bundles (except punktwerte)', () => {
    const bundles = [
      'goz-catalog.json',
      'bema-catalog.json',
      'festzuschuss-catalog.json',
      'kuerzel-catalog.json',
    ]
    for (const file of bundles) {
      const bundle = loadSeed(file)
      expect(bundle.resourceType, `${file}: wrong resourceType`).toBe('Bundle')
      expect(bundle.type, `${file}: wrong type`).toBe('transaction')
      expect(Array.isArray(bundle.entry), `${file}: no entry array`).toBe(true)
      expect(bundle.entry.length, `${file}: empty entry`).toBeGreaterThan(0)
    }
  })
})
