import { describe, it, expect } from 'bun:test'
import { RuleEngine } from '../engine'
import type { BillingItem } from '../types'

const engine = new RuleEngine()

describe('RuleEngine — Integration', () => {
  it('validates a correct 3-unit bridge (Szenario 1)', () => {
    const items: BillingItem[] = [
      { code: '0030', system: 'GOZ', multiplier: 2.3 },
      { code: '2200', system: 'GOZ', teeth: [45], multiplier: 2.3 },
      { code: '2200', system: 'GOZ', teeth: [47], multiplier: 2.3 },
      { code: '5000', system: 'GOZ', teeth: [46], multiplier: 2.3 },
      { code: '5120', system: 'GOZ', multiplier: 2.3 },
      { code: '0090', system: 'GOZ', multiplier: 2.3 },
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(true)
    expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0)
  })

  it('catches exclusion + multiplier errors in bad billing', () => {
    const items: BillingItem[] = [
      { code: '2200', system: 'GOZ', teeth: [46], multiplier: 4.0 },  // over max
      { code: '2210', system: 'GOZ', teeth: [46] },                    // exclusion with 2200
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.ruleType === 'exclusion')).toBe(true)
    expect(result.issues.some(i => i.ruleType === 'multiplier')).toBe(true)
  })

  it('warns about missing HKP for crown', () => {
    const items: BillingItem[] = [
      { code: '2200', system: 'GOZ', teeth: [46] },
    ]
    const result = engine.validate(items)
    const reqIssue = result.issues.find(i => i.ruleType === 'requirement')
    expect(reqIssue).toBeDefined()
    expect(reqIssue!.message).toContain('0030')
  })

  it('warns about inclusion violation (Krone + Präparation)', () => {
    const items: BillingItem[] = [
      { code: '0030', system: 'GOZ' },
      { code: '0010', system: 'GOZ' },
      { code: '2200', system: 'GOZ', teeth: [46] },
      { code: '2030', system: 'GOZ', teeth: [46] },  // included in 2200
    ]
    const result = engine.validate(items)
    expect(result.issues.some(i => i.ruleType === 'inclusion')).toBe(true)
  })

  it('validates PKV implant case — insertion only (Szenario 8, Sitzung 1)', () => {
    const items: BillingItem[] = [
      { code: '0010', system: 'GOZ', multiplier: 2.3 },
      { code: '0030', system: 'GOZ', multiplier: 2.3 },
      { code: '9000', system: 'GOZ', teeth: [36], multiplier: 2.3 },
      { code: '9000', system: 'GOZ', teeth: [46], multiplier: 2.3 },
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(true)
  })

  it('validates PKV implant case — Freilegung + Kronen (Szenario 8, Sitzung 2)', () => {
    const items: BillingItem[] = [
      { code: '0010', system: 'GOZ', multiplier: 2.3 },
      { code: '0030', system: 'GOZ', multiplier: 2.3 },
      { code: '9010', system: 'GOZ', teeth: [36], multiplier: 2.3 },
      { code: '9010', system: 'GOZ', teeth: [46], multiplier: 2.3 },
      { code: '2200', system: 'GOZ', teeth: [36], multiplier: 2.3 },
      { code: '2200', system: 'GOZ', teeth: [46], multiplier: 2.3 },
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(true)
  })

  it('empty items list is valid', () => {
    const result = engine.validate([])
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('BEMA-only billing passes without multiplier checks', () => {
    const items: BillingItem[] = [
      { code: '13a', system: 'BEMA', teeth: [46] },
      { code: '13b', system: 'BEMA', teeth: [36] },
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(true)
  })
})
