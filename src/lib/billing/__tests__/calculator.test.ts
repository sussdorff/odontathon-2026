import { describe, it, expect } from 'bun:test'
import { calculateGOZPrice, calculateBEMAPrice, calculatePatientShare } from '../calculator'

describe('calculateGOZPrice', () => {
  it('GOZ 0010 (Eingehende Untersuchung) — Einfachsatz (factor 1.0)', () => {
    // Punktzahl=100, 100 × 0.0562421 = 5.62421 → 5.62
    expect(calculateGOZPrice('0010', 1.0)).toBe(5.62)
  })

  it('GOZ 0010 — Regelhöchstsatz (factor 2.3)', () => {
    // 100 × 0.0562421 × 2.3 = 12.93568... → 12.94
    expect(calculateGOZPrice('0010', 2.3)).toBe(12.94)
  })

  it('GOZ 0010 — defaults to factor 2.3', () => {
    expect(calculateGOZPrice('0010')).toBe(calculateGOZPrice('0010', 2.3))
  })

  it('GOZ 2200 (Vollgusskrone) — Einfachsatz (factor 1.0)', () => {
    // Punktzahl=1322, 1322 × 0.0562421 = 74.35... → 74.35
    expect(calculateGOZPrice('2200', 1.0)).toBe(74.35)
  })

  it('GOZ 2200 — Regelhöchstsatz (factor 2.3)', () => {
    // 1322 × 0.0562421 × 2.3 = 171.01... → 171.01
    expect(calculateGOZPrice('2200', 2.3)).toBe(171.01)
  })

  it('throws for unknown GOZ code', () => {
    expect(() => calculateGOZPrice('9999')).toThrow(/GOZ.*9999/)
  })
})

describe('calculateBEMAPrice', () => {
  it('BEMA Ä 1 (Beratung) — AOK', () => {
    // Punktzahl=9, AOK KCH Punktwert=1.0423, 9 × 1.0423 = 9.3807 → 9.38
    expect(calculateBEMAPrice('Ä 1', 'AOK')).toBe(9.38)
  })

  it('BEMA Ä 1 (Beratung) — BKK', () => {
    // BKK KCH Punktwert=1.0389, 9 × 1.0389 = 9.3501 → 9.35
    expect(calculateBEMAPrice('Ä 1', 'BKK')).toBe(9.35)
  })

  it('throws for unknown BEMA code', () => {
    expect(() => calculateBEMAPrice('ZZZ', 'AOK')).toThrow(/BEMA.*ZZZ/)
  })

  it('throws for unknown kassenart', () => {
    expect(() => calculateBEMAPrice('Ä 1', 'UNKNOWN')).toThrow(/Kassenart|Punktwert/)
  })
})

describe('calculatePatientShare', () => {
  it('ZE Krone (Befund 1.1) — GOZ items only, kein Bonus (60pct)', () => {
    const items = [
      { code: '2200', system: 'GOZ' as const, factor: 2.3 },
      { code: '0010', system: 'GOZ' as const, factor: 2.3 },
    ]
    const goz2200 = calculateGOZPrice('2200', 2.3)
    const goz0010 = calculateGOZPrice('0010', 2.3)
    const expectedTotal = Math.round((goz2200 + goz0010) * 100) / 100

    const result = calculatePatientShare(items, '1.1', '60pct')

    expect(result.totalCost).toBe(expectedTotal)
    expect(result.festzuschuss).toBe(229.25)
    expect(result.patientShare).toBe(Math.round((expectedTotal - 229.25) * 100) / 100)
  })

  it('ZE Krone (Befund 1.1) — Bonus 10 Jahre (75pct)', () => {
    const items = [{ code: '2200', system: 'GOZ' as const, factor: 2.3 }]
    const result = calculatePatientShare(items, '1.1', '75pct')

    expect(result.festzuschuss).toBe(286.57)
  })

  it('ZE Krone (Befund 1.1) — Härtefall (100pct)', () => {
    const items = [{ code: '2200', system: 'GOZ' as const, factor: 2.3 }]
    const result = calculatePatientShare(items, '1.1', '100pct')

    expect(result.festzuschuss).toBe(382.09)
  })

  it('Privatpatient (kein festzuschuss befund) — patientShare equals totalCost', () => {
    const items = [{ code: '0010', system: 'GOZ' as const, factor: 1.0 }]
    const result = calculatePatientShare(items, '', '60pct')

    expect(result.festzuschuss).toBe(0)
    expect(result.patientShare).toBe(result.totalCost)
  })

  it('mixed GOZ + BEMA items', () => {
    const items = [
      { code: '2200', system: 'GOZ' as const, factor: 2.3 },
      { code: 'Ä 1', system: 'BEMA' as const, kassenart: 'AOK' },
    ]
    const result = calculatePatientShare(items, '1.1', '60pct', 'AOK')
    const goz2200 = calculateGOZPrice('2200', 2.3)
    const bemaÄ1 = calculateBEMAPrice('Ä 1', 'AOK')
    const expectedTotal = Math.round((goz2200 + bemaÄ1) * 100) / 100

    expect(result.totalCost).toBe(expectedTotal)
    expect(result.festzuschuss).toBe(229.25)
    expect(result.patientShare).toBe(Math.round((expectedTotal - 229.25) * 100) / 100)
  })
})
