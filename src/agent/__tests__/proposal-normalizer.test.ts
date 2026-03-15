import { describe, expect, test } from 'bun:test'
import {
  normalizeProposals,
  canonicalKey,
  deduplicateProposals,
  filterContradictionPairs,
  filterClaimFacts,
  enrichRemoveProposals,
} from '../proposal-normalizer'
import type { Proposal } from '../report-schema'

function makeProposal(id: string, overrides: Partial<Proposal> = {}): Proposal {
  return {
    id,
    severity: 'warning',
    category: 'compliance',
    title: `Proposal ${id}`,
    description: `Description for ${id}`,
    ...overrides,
  }
}

function makeBillingProposal(id: string, bc: Partial<Proposal['billingChange']> & { type: string; code: string; system: string }): Proposal {
  return makeProposal(id, { billingChange: { reason: 'test', ...bc } as any })
}

describe('canonicalKey', () => {
  test('billing proposals include type, system, code, teeth, session', () => {
    const key = canonicalKey(makeBillingProposal('P1', {
      type: 'add_code', code: '0070', system: 'GOZ', teeth: [46], session: 1,
    }))
    expect(key).toBe('B:add_code:GOZ:0070::46:1')
  })

  test('different teeth produce different keys', () => {
    const k1 = canonicalKey(makeBillingProposal('P1', { type: 'add_code', code: '0070', system: 'GOZ', teeth: [46] }))
    const k2 = canonicalKey(makeBillingProposal('P2', { type: 'add_code', code: '0070', system: 'GOZ', teeth: [47] }))
    expect(k1).not.toBe(k2)
  })

  test('different sessions produce different keys', () => {
    const k1 = canonicalKey(makeBillingProposal('P1', { type: 'remove_code', code: '2410', system: 'GOZ', session: 1 }))
    const k2 = canonicalKey(makeBillingProposal('P2', { type: 'remove_code', code: '2410', system: 'GOZ', session: 2 }))
    expect(k1).not.toBe(k2)
  })

  test('documentation proposals include templateId, fieldId, category', () => {
    const p = makeProposal('P1', {
      category: 'documentation',
      documentationChange: { type: 'add_field', templateId: 'tpl1', fieldId: 'f1', reason: 'test' },
    })
    const key = canonicalKey(p)
    expect(key).toContain('tpl1')
    expect(key).toContain('f1')
    expect(key).toContain('documentation')
  })
})

describe('deduplicateProposals', () => {
  test('removes duplicates, keeps highest severity', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'remove_code', code: '0090', system: 'GOZ' }),
      { ...makeBillingProposal('P2', { type: 'remove_code', code: '0090', system: 'GOZ' }), severity: 'error' as const },
    ]
    const result = deduplicateProposals(proposals)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('error')
  })

  test('keeps proposals with different keys', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'remove_code', code: '0090', system: 'GOZ', teeth: [46] }),
      makeBillingProposal('P2', { type: 'remove_code', code: '0100', system: 'GOZ', teeth: [46] }),
    ]
    const result = deduplicateProposals(proposals)
    expect(result).toHaveLength(2)
  })
})

describe('enrichRemoveProposals', () => {
  test('adds teeth from claim item', () => {
    const p = makeBillingProposal('P1', { type: 'remove_code', code: '0090', system: 'GOZ', existingItemIndex: 0 })
    enrichRemoveProposals([p], [{ code: '0090', system: 'GOZ', tooth: 46, session: 1 }])
    expect(p.billingChange!.teeth).toEqual([46])
    expect(p.billingChange!.session).toBe(1)
  })
})

describe('filterContradictionPairs', () => {
  test('removes both add+remove for same code/teeth', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'add_code', code: '0070', system: 'GOZ', teeth: [46] }),
      makeBillingProposal('P2', { type: 'remove_code', code: '0070', system: 'GOZ', teeth: [46] }),
    ]
    const result = filterContradictionPairs(proposals)
    expect(result).toHaveLength(0)
  })

  test('removes update_multiplier when code is also being removed', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'update_multiplier', code: '2100', system: 'GOZ', teeth: [46] }),
      makeBillingProposal('P2', { type: 'remove_code', code: '2100', system: 'GOZ', teeth: [46] }),
    ]
    const result = filterContradictionPairs(proposals)
    expect(result).toHaveLength(1)
    expect(result[0].billingChange!.type).toBe('remove_code')
  })

  test('keeps non-contradictory proposals', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'add_code', code: '0070', system: 'GOZ', teeth: [46] }),
      makeBillingProposal('P2', { type: 'remove_code', code: '0090', system: 'GOZ', teeth: [46] }),
    ]
    const result = filterContradictionPairs(proposals)
    expect(result).toHaveLength(2)
  })
})

describe('filterClaimFacts', () => {
  const claimItems = [
    { code: '0010', system: 'GOZ', tooth: null, session: null },
    { code: '2100', system: 'GOZ', tooth: 46, session: null },
  ]

  test('removes add_code for already-billed code+tooth', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'add_code', code: '2100', system: 'GOZ', teeth: [46] }),
    ]
    const result = filterClaimFacts(proposals, claimItems)
    expect(result).toHaveLength(0)
  })

  test('keeps add_code for different tooth', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'add_code', code: '2100', system: 'GOZ', teeth: [47] }),
    ]
    const result = filterClaimFacts(proposals, claimItems)
    expect(result).toHaveLength(1)
  })

  test('removes remove_code with out-of-range index', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'remove_code', code: '9999', system: 'GOZ', existingItemIndex: 99 }),
    ]
    const result = filterClaimFacts(proposals, claimItems)
    expect(result).toHaveLength(0)
  })

  test('removes update_multiplier for non-GOZ', () => {
    const proposals = [
      makeBillingProposal('P1', { type: 'update_multiplier', code: '5000', system: 'BEMA' }),
    ]
    const result = filterClaimFacts(proposals, claimItems)
    expect(result).toHaveLength(0)
  })
})

describe('normalizeProposals (full pipeline)', () => {
  test('Lukas Berg scenario: no false duplicates after normalization', () => {
    const claimItems = [
      { code: '0010', system: 'GOZ', tooth: null, session: null },
      { code: '0100', system: 'GOZ', tooth: null, session: null },
      { code: '2197', system: 'GOZ', tooth: 46, session: null },
      { code: '2020', system: 'GOZ', tooth: 46, session: null },
    ]
    const proposals: Proposal[] = [
      makeBillingProposal('P1', { type: 'add_code', code: '0070', system: 'GOZ', teeth: [46] }),
      // Duplicate of P1 from different agent
      makeBillingProposal('P2', { type: 'add_code', code: '0070', system: 'GOZ', teeth: [46] }),
      // Valid remove
      makeBillingProposal('P3', { type: 'remove_code', code: '2197', system: 'GOZ', existingItemIndex: 2 }),
    ]
    proposals[1].severity = 'suggestion'
    proposals[2].severity = 'error'

    const result = normalizeProposals(proposals, claimItems)
    // P1 and P2 are duplicates → only P1 kept (warning > suggestion)
    // P3 is valid remove
    expect(result).toHaveLength(2)
    expect(result.find(p => p.billingChange?.code === '0070')).toBeTruthy()
    expect(result.find(p => p.billingChange?.code === '2197')).toBeTruthy()
  })
})
