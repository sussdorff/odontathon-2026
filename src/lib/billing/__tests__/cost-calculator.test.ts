import { describe, it, expect } from 'bun:test'
import {
  calculateGOZPrice,
  calculateBEMAPrice,
  calculatePatientShare,
  calculateCosts,
  detectBEMABereich,
} from '../cost-calculator'

describe('Kostenkalkulator — GOZ', () => {
  it('calculateGOZPrice: GOZ 0010 bei Faktor 2.3 → ~12.93 EUR', () => {
    const result = calculateGOZPrice('0010', 2.3)
    expect(result.code).toBe('0010')
    expect(result.punktzahl).toBe(100)
    // Grundpreis = 100 × 0.0562421 = 5.62 EUR (pre-computed in catalog)
    expect(result.grundpreis).toBeCloseTo(5.62, 1)
    // Total = 5.62 × 2.3 ≈ 12.93 EUR
    expect(result.total).toBeCloseTo(12.93, 1)
    expect(result.factor).toBe(2.3)
    expect(result.description).toContain('Untersuchung')
  })

  it('calculateGOZPrice: GOZ 0010 bei Faktor 1.0 → Grundpreis', () => {
    const result = calculateGOZPrice('0010', 1.0)
    expect(result.total).toBeCloseTo(result.grundpreis, 2)
  })

  it('calculateGOZPrice wirft Fehler für unbekannte GOZ-Nummer', () => {
    expect(() => calculateGOZPrice('9999', 2.3)).toThrow('not found in catalog')
  })

  it('calculateGOZPrice: Faktor 3.5 (Höchstsatz)', () => {
    const result = calculateGOZPrice('0010', 3.5)
    // 5.62 × 3.5 = 19.67 EUR
    expect(result.total).toBeCloseTo(5.62 * 3.5, 1)
  })

  it('calculateGOZPrice: Referenzpreis GOZ 2000 (Pfeilerschnitt)', () => {
    // GOZ 2000 exists in catalog — test it loads and calculates
    const result = calculateGOZPrice('2000', 2.3)
    expect(result.code).toBe('2000')
    expect(result.grundpreis).toBeGreaterThan(0)
    expect(result.total).toBeGreaterThan(result.grundpreis)
  })
})

describe('Kostenkalkulator — BEMA', () => {
  it('calculateBEMAPrice: BEMA "Ä 1" für AOK → 9 × 1.0423 = 9.38 EUR', () => {
    const result = calculateBEMAPrice('Ä 1', 'AOK')
    expect(result.code).toBe('Ä 1')
    expect(result.punktzahl).toBe(9)
    expect(result.punktwert).toBeCloseTo(1.0423, 4)
    expect(result.total).toBeCloseTo(9 * 1.0423, 2)  // 9.38 EUR
    expect(result.kassenart).toBe('AOK')
    expect(result.bereich).toBe('KCH')
  })

  it('calculateBEMAPrice: BEMA "Ä 1" für BKK', () => {
    const result = calculateBEMAPrice('Ä 1', 'BKK')
    expect(result.punktwert).toBeCloseTo(1.0389, 4)
    expect(result.total).toBeCloseTo(9 * 1.0389, 2)
  })

  it('calculateBEMAPrice: BEMA "Ä 1" für vdek', () => {
    const result = calculateBEMAPrice('Ä 1', 'vdek')
    expect(result.punktwert).toBeCloseTo(1.0412, 4)
    expect(result.total).toBeCloseTo(9 * 1.0412, 2)
  })

  it('calculateBEMAPrice wirft Fehler für unbekannte Kassenart', () => {
    expect(() => calculateBEMAPrice('Ä 1', 'UNKNOWN_KASSE')).toThrow('Kassenart')
  })

  it('calculateBEMAPrice wirft Fehler für unbekannte BEMA-Nummer', () => {
    expect(() => calculateBEMAPrice('ZZZ 999', 'AOK')).toThrow('not found in catalog')
  })
})

describe('Kostenkalkulator — BEMA Bereich-Erkennung', () => {
  it('Ä-Codes → KCH', () => {
    expect(detectBEMABereich('Ä 1')).toBe('KCH')
    expect(detectBEMABereich('Ä 161')).toBe('KCH')
  })

  it('P-Codes → KCH', () => {
    expect(detectBEMABereich('P 1')).toBe('KCH')
  })

  it('Beh-Codes → KCH', () => {
    expect(detectBEMABereich('Beh 1')).toBe('KCH')
  })

  it('PAR-Codes → PAR', () => {
    expect(detectBEMABereich('PAR 1')).toBe('PAR')
    expect(detectBEMABereich('MHU')).toBe('PAR')
    expect(detectBEMABereich('UPT 1')).toBe('PAR')
  })

  it('Z-Codes → ZE', () => {
    expect(detectBEMABereich('Z 1')).toBe('ZE')
  })

  it('Numerische Codes → KCH', () => {
    expect(detectBEMABereich('01')).toBe('KCH')
    expect(detectBEMABereich('02')).toBe('KCH')
  })
})

describe('Kostenkalkulator — Patientenanteil', () => {
  it('calculatePatientShare: Eigenanteil = Gesamt - Festzuschuss', () => {
    const items = [
      { code: '0010', system: 'GOZ' as const, multiplier: 2.3 },
    ]
    const gozPrice = calculateGOZPrice('0010', 2.3)
    const breakdown = calculatePatientShare(items, 5.0)

    expect(breakdown.festzuschuss).toBe(5.0)
    expect(breakdown.total).toBeCloseTo(gozPrice.total, 2)
    expect(breakdown.patientShare).toBeCloseTo(gozPrice.total - 5.0, 2)
  })

  it('calculatePatientShare: Festzuschuss 0 → patientShare = total', () => {
    const items = [{ code: '0010', system: 'GOZ' as const, multiplier: 2.3 }]
    const breakdown = calculatePatientShare(items, 0)
    expect(breakdown.patientShare).toBeCloseTo(breakdown.total, 2)
  })

  it('calculatePatientShare: Festzuschuss > total → patientShare = 0', () => {
    const items = [{ code: '0010', system: 'GOZ' as const, multiplier: 2.3 }]
    const breakdown = calculatePatientShare(items, 9999)
    expect(breakdown.patientShare).toBe(0)
  })

  it('calculatePatientShare: gemischte GOZ + BEMA Items', () => {
    const items = [
      { code: '0010', system: 'GOZ' as const, multiplier: 2.3 },
      { code: 'Ä 1', system: 'BEMA' as const, kassenart: 'AOK' },
    ]
    const breakdown = calculatePatientShare(items, 500)
    expect(breakdown.totalGOZ).toBeGreaterThan(0)
    expect(breakdown.totalBEMA).toBeGreaterThan(0)
    expect(breakdown.total).toBeCloseTo(breakdown.totalGOZ + breakdown.totalBEMA, 2)
    expect(breakdown.patientShare).toBe(0) // 500 EUR Festzuschuss covers it
    expect(breakdown.festzuschuss).toBe(500)
  })
})

describe('Kostenkalkulator — calculateCosts', () => {
  it('berechnet mehrere GOZ-Positionen', () => {
    const items = [
      { code: '0010', system: 'GOZ' as const, multiplier: 2.3 },
      { code: '0010', system: 'GOZ' as const, multiplier: 1.0 },  // same code, different factor
    ]
    const breakdown = calculateCosts(items)
    expect(breakdown.items).toHaveLength(2)
    expect(breakdown.totalGOZ).toBeGreaterThan(0)
    expect(breakdown.totalBEMA).toBe(0)
    expect(breakdown.total).toBeCloseTo(breakdown.totalGOZ, 2)
  })

  it('count multipliziert den Preis', () => {
    const single = calculateCosts([{ code: '0010', system: 'GOZ' as const, multiplier: 2.3, count: 1 }])
    const triple = calculateCosts([{ code: '0010', system: 'GOZ' as const, multiplier: 2.3, count: 3 }])
    expect(triple.totalGOZ).toBeCloseTo(single.totalGOZ * 3, 2)
  })

  it('Referenzpreise: GOZ 0010 an 2.3× ≈ 12.93 EUR', () => {
    const breakdown = calculateCosts([{ code: '0010', system: 'GOZ' as const, multiplier: 2.3 }])
    expect(breakdown.total).toBeCloseTo(12.93, 1)
  })

  it('Referenzpreise: BEMA Ä 1 für AOK ≈ 9.38 EUR', () => {
    const breakdown = calculateCosts([{ code: 'Ä 1', system: 'BEMA' as const, kassenart: 'AOK' }])
    expect(breakdown.total).toBeCloseTo(9.38, 1)
  })
})
