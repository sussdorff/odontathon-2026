import { describe, it, expect } from 'bun:test'
import { RuleEngine } from '../engine'
import type { BillingItem } from '../types'

const engine = new RuleEngine()

describe('Exclusion Rules', () => {
  it('detects filling exclusion on same tooth (GOZ 2060 + 2080)', () => {
    const items: BillingItem[] = [
      { code: '2060', system: 'GOZ', teeth: [46] },
      { code: '2080', system: 'GOZ', teeth: [46] },
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(false)
    const excl = result.issues.find(i => i.ruleId === 'excl-2060-2080')
    expect(excl).toBeDefined()
    expect(excl!.severity).toBe('error')
  })

  it('allows different fillings on different teeth', () => {
    const items: BillingItem[] = [
      { code: '2060', system: 'GOZ', teeth: [46] },
      { code: '2080', system: 'GOZ', teeth: [36] },
    ]
    const result = engine.validate(items)
    const excl = result.issues.find(i => i.ruleId === 'excl-2060-2080')
    expect(excl).toBeUndefined()
  })

  it('detects crown type exclusion on same tooth (2200 + 2210)', () => {
    const items: BillingItem[] = [
      { code: '2200', system: 'GOZ', teeth: [16] },
      { code: '2210', system: 'GOZ', teeth: [16] },
    ]
    const result = engine.validate(items)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.ruleId === 'excl-2200-2210')).toBe(true)
  })

  it('detects extraction exclusions (3000 + 3010 same tooth)', () => {
    const items: BillingItem[] = [
      { code: '3000', system: 'GOZ', teeth: [48] },
      { code: '3010', system: 'GOZ', teeth: [48] },
    ]
    const result = engine.validate(items)
    expect(result.issues.some(i => i.ruleId === 'excl-3000-3010')).toBe(true)
  })

  it('detects session-level exclusion (PZR + subgingival scaling)', () => {
    const items: BillingItem[] = [
      { code: '1040', system: 'GOZ' },
      { code: '4050', system: 'GOZ' },
    ]
    const result = engine.validate(items)
    expect(result.issues.some(i => i.ruleId === 'excl-1040-4050')).toBe(true)
  })

  it('detects BEMA filling exclusion', () => {
    const items: BillingItem[] = [
      { code: '13a', system: 'BEMA', teeth: [36] },
      { code: '13b', system: 'BEMA', teeth: [36] },
    ]
    const result = engine.validate(items)
    expect(result.issues.some(i => i.ruleId === 'excl-bema-13a-13b')).toBe(true)
  })
})
