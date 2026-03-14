import { describe, it, expect } from 'bun:test'
import { RuleEngine } from '../engine'
import { allPatterns } from '../patterns'
import type { DentalFinding } from '../types'

const engine = new RuleEngine()

describe('Billing Patterns', () => {
  it('has patterns for all major categories', () => {
    const categories = new Set(allPatterns.map(p => p.category))
    expect(categories.has('ZE')).toBe(true)
    expect(categories.has('KCH')).toBe(true)
    expect(categories.has('PAR')).toBe(true)
  })

  it('all patterns have at least one required position', () => {
    for (const pattern of allPatterns) {
      expect(pattern.required.length, `${pattern.id} has no required positions`).toBeGreaterThan(0)
    }
  })

  it('suggests ZE patterns for missing tooth', () => {
    const findings: DentalFinding[] = [
      { tooth: 46, status: 'absent' },
      { tooth: 45, status: 'bridge-anchor' },
      { tooth: 47, status: 'bridge-anchor' },
    ]
    const patterns = engine.suggestPatterns(findings)
    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns.some(p => p.category === 'ZE')).toBe(true)
    expect(patterns.some(p => p.id.includes('bridge'))).toBe(true)
  })

  it('suggests KCH patterns for carious tooth', () => {
    const findings: DentalFinding[] = [
      { tooth: 36, status: 'carious' },
    ]
    const patterns = engine.suggestPatterns(findings)
    expect(patterns.some(p => p.category === 'KCH')).toBe(true)
  })

  it('suggests crown renewal for crown-needs-renewal', () => {
    const findings: DentalFinding[] = [
      { tooth: 16, status: 'crown-needs-renewal' },
    ]
    const patterns = engine.suggestPatterns(findings)
    expect(patterns.some(p => p.id === 'goz-crown-renewal')).toBe(true)
  })

  it('bridge pattern includes HKP and Eingliedern', () => {
    const bridge = allPatterns.find(p => p.id === 'goz-bridge-3-unit')!
    expect(bridge.required.some(r => r.code === '0030')).toBe(true)
    expect(bridge.required.some(r => r.code === '5120')).toBe(true)
  })

  it('implant pattern includes insertion and Freilegung', () => {
    const implant = allPatterns.find(p => p.id === 'goz-single-implant')!
    expect(implant.required.some(r => r.code === '9000')).toBe(true)
    expect(implant.required.some(r => r.code === '9010')).toBe(true)
  })

  it('no duplicate pattern IDs', () => {
    const ids = allPatterns.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
