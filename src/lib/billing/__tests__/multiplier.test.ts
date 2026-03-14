import { describe, it, expect } from 'bun:test'
import { RuleEngine } from '../engine'

const engine = new RuleEngine()

describe('Multiplier Rules', () => {
  it('accepts factor within threshold (2.3x)', () => {
    const check = engine.checkMultiplier('2200', 2.3)
    expect(check.withinThreshold).toBe(true)
    expect(check.requiresJustification).toBe(false)
    expect(check.exceedsMax).toBe(false)
  })

  it('flags factor above threshold but below max', () => {
    const check = engine.checkMultiplier('2200', 3.0)
    expect(check.withinThreshold).toBe(false)
    expect(check.requiresJustification).toBe(true)
    expect(check.exceedsMax).toBe(false)
    expect(check.message).toContain('Begründung')
  })

  it('rejects factor above max (3.5x)', () => {
    const check = engine.checkMultiplier('2200', 4.0)
    expect(check.exceedsMax).toBe(true)
    expect(check.message).toContain('überschreitet')
  })

  it('uses med-tech tiers for code 5170', () => {
    const check = engine.checkMultiplier('5170', 2.0)
    expect(check.withinThreshold).toBe(false) // threshold is 1.8 for med-tech
    expect(check.requiresJustification).toBe(true)
  })

  it('validates multipliers in billing items', () => {
    const result = engine.validate([
      { code: '2200', system: 'GOZ', multiplier: 4.0 },
    ])
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.ruleType === 'multiplier' && i.severity === 'error')).toBe(true)
  })

  it('warns on justification-required multipliers', () => {
    const result = engine.validate([
      { code: '0030', system: 'GOZ', multiplier: 2.3 },
      { code: '2200', system: 'GOZ', multiplier: 3.0 },
    ])
    expect(result.valid).toBe(true) // warnings don't invalidate
    expect(result.issues.some(i => i.ruleType === 'multiplier' && i.severity === 'warning')).toBe(true)
  })

  it('accepts standard multiplier (1.0x)', () => {
    const check = engine.checkMultiplier('9000', 1.0)
    expect(check.withinStandard).toBe(true)
    expect(check.withinThreshold).toBe(true)
    expect(check.exceedsMax).toBe(false)
  })
})
