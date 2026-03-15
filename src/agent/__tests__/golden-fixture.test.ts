import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { complianceReportSchema } from '../report-schema'

const FIXTURES_DIR = join(import.meta.dir, '../../../data/fixtures')

async function loadFixture(path: string) {
  const raw = await readFile(join(FIXTURES_DIR, path), 'utf-8')
  return JSON.parse(raw)
}

describe('Golden fixture: patient-berg-lukas/2026-03-10', () => {
  test('validates against ComplianceReport schema', async () => {
    const data = await loadFixture('patient-berg-lukas/2026-03-10.json')
    const result = complianceReportSchema.safeParse(data)
    if (!result.success) console.error('Validation errors:', result.error.issues)
    expect(result.success).toBe(true)
  })

  test('coverageType is PKV', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    expect(report.coverageType).toBe('PKV')
  })

  test('no false GKV proposals', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    for (const p of report.proposals) {
      const text = `${p.title} ${p.description}`.toLowerCase()
      expect(text).not.toContain('mehrkostenvereinbarung')
      expect(text).not.toContain('gkv-patient')
    }
  })

  test('no duplicate proposal IDs', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    const ids = report.proposals.map((p: any) => p.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  test('contains GOZ 0070 add_code proposal', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    const p = report.proposals.find((p: any) => p.billingChange?.code === '0070')
    expect(p).toBeTruthy()
    expect(p.billingChange.type).toBe('add_code')
    expect(p.billingChange.system).toBe('GOZ')
  })

  test('contains GOZ 2100 add_code proposal (missing filling)', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    const p = report.proposals.find((p: any) => p.billingChange?.code === '2100')
    expect(p).toBeTruthy()
    expect(p.billingChange.type).toBe('add_code')
  })

  test('billing add (P2) and documentation note (P3) target the same code GOZ 0070', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    const billingAdd = report.proposals.find((p: any) => p.billingChange?.code === '0070')
    const docNote = report.proposals.find((p: any) => p.documentationChange?.code === '0070')
    expect(billingAdd).toBeTruthy()
    expect(docNote).toBeTruthy()
    // They are separate proposals (distinct persisted effects)
    expect(billingAdd.id).not.toBe(docNote.id)
  })

  test('no BEMA system conflict for GOÄ codes', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-03-10.json')
    for (const p of report.proposals) {
      if (p.billingChange?.code === '5000') {
        expect(p.billingChange.system).not.toBe('BEMA')
      }
    }
  })
})

describe('Golden fixture: patient-berg-lukas/2026-02-12', () => {
  test('validates against ComplianceReport schema', async () => {
    const data = await loadFixture('patient-berg-lukas/2026-02-12.json')
    const result = complianceReportSchema.safeParse(data)
    if (!result.success) console.error('Validation errors:', result.error.issues)
    expect(result.success).toBe(true)
  })

  test('coverageType is PKV', async () => {
    const report = await loadFixture('patient-berg-lukas/2026-02-12.json')
    expect(report.coverageType).toBe('PKV')
  })
})
