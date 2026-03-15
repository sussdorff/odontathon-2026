import { describe, expect, test } from 'bun:test'
import { resolveCoverageType } from '../coverage-type'

describe('resolveCoverageType', () => {
  test('PKV code returns PKV', () => {
    expect(resolveCoverageType([{ type: { coding: [{ code: 'PKV' }] } }])).toBe('PKV')
  })

  test('GKV code returns GKV', () => {
    expect(resolveCoverageType([{ type: { coding: [{ code: 'GKV' }] } }])).toBe('GKV')
  })

  test('SEL code returns PKV (legacy)', () => {
    expect(resolveCoverageType([{ type: { coding: [{ code: 'SEL' }] } }])).toBe('PKV')
  })

  test('PPO code returns PKV (legacy)', () => {
    expect(resolveCoverageType([{ type: { coding: [{ code: 'PPO' }] } }])).toBe('PKV')
  })

  test('empty coverages returns GKV', () => {
    expect(resolveCoverageType([])).toBe('GKV')
  })

  test('multi-coverage: GKV + PKV returns PKV', () => {
    expect(resolveCoverageType([
      { type: { coding: [{ code: 'GKV' }] } },
      { type: { coding: [{ code: 'PKV' }] } },
    ])).toBe('PKV')
  })

  test('multi-coverage: GKV only returns GKV', () => {
    expect(resolveCoverageType([
      { type: { coding: [{ code: 'GKV' }] } },
    ])).toBe('GKV')
  })

  test('malformed coverage: null type returns GKV', () => {
    expect(resolveCoverageType([{ type: null }])).toBe('GKV')
  })

  test('malformed coverage: no coding array returns GKV', () => {
    expect(resolveCoverageType([{ type: { coding: undefined } }])).toBe('GKV')
  })
})
