import { describe, it, expect } from 'bun:test'
import { RuleEngine } from '../engine'

const engine = new RuleEngine()

describe('Frequency Rules', () => {
  it('allows first billing within limit', () => {
    const check = engine.checkFrequency('01', 'BEMA', [])
    expect(check.allowed).toBe(true)
    expect(check.currentCount).toBe(0)
    expect(check.maxCount).toBe(2)
  })

  it('blocks billing when frequency exceeded', () => {
    const today = new Date().toISOString().split('T')[0]
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const check = engine.checkFrequency('01', 'BEMA', [
      { code: '01', system: 'BEMA', date: today },
      { code: '01', system: 'BEMA', date: sixMonthsAgo.toISOString().split('T')[0] },
    ])
    expect(check.allowed).toBe(false)
    expect(check.currentCount).toBe(2)
    expect(check.message).toContain('Frequenzgrenze')
  })

  it('ignores old entries outside period', () => {
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    const check = engine.checkFrequency('01', 'BEMA', [
      { code: '01', system: 'BEMA', date: threeYearsAgo.toISOString().split('T')[0] },
    ])
    expect(check.allowed).toBe(true)
    expect(check.currentCount).toBe(0)
  })

  it('returns info for codes without frequency rule', () => {
    const check = engine.checkFrequency('9999', 'GOZ', [])
    expect(check.allowed).toBe(true)
    expect(check.maxCount).toBe(Infinity)
  })

  it('checks lifetime limits for implants', () => {
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    const check = engine.checkFrequency('9000', 'GOZ', [
      { code: '9000', system: 'GOZ', date: fiveYearsAgo.toISOString().split('T')[0], tooth: 46 },
    ])
    expect(check.allowed).toBe(false)
    expect(check.period).toBe('per-lifetime')
  })
})
