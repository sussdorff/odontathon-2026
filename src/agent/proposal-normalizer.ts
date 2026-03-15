import type { Proposal, BillingChange } from './report-schema'

const SEVERITY_RANK: Record<string, number> = { error: 3, warning: 2, suggestion: 1, info: 0 }

interface ClaimItem {
  code?: string
  system?: string
  tooth?: number | null
  session?: number | null
}

/**
 * Canonical key for dedup. Includes type, system, code, teeth, session, and proposal-specific fields.
 */
function canonicalKey(p: Proposal): string {
  const bc = p.billingChange
  const dc = p.documentationChange
  if (bc) {
    const teeth = (bc.teeth ?? []).sort().join(',')
    return `B:${bc.type}:${bc.system}:${bc.code}:${bc.existingItemIndex ?? ''}:${teeth}:${bc.session ?? ''}`
  }
  if (dc) {
    return `D:${dc.type}:${dc.code ?? ''}:${dc.system ?? ''}:${dc.templateId ?? ''}:${dc.fieldId ?? ''}:${p.category}`
  }
  return p.id
}

/**
 * Enrich remove_code proposals with teeth/session from claim items
 * (remove proposals only have existingItemIndex, not teeth/session).
 */
function enrichRemoveProposals(proposals: Proposal[], claimItems: ClaimItem[]): void {
  for (const p of proposals) {
    const bc = p.billingChange
    if (bc?.type === 'remove_code' && bc.existingItemIndex != null) {
      const item = claimItems[bc.existingItemIndex]
      if (item) {
        if (!bc.teeth?.length && item.tooth) bc.teeth = [item.tooth]
        if (bc.session == null && item.session != null) bc.session = item.session
      }
    }
  }
}

/**
 * Remove proposals with the same canonical key. Keep highest severity.
 */
function deduplicateProposals(proposals: Proposal[]): Proposal[] {
  const groups = new Map<string, Proposal[]>()
  for (const p of proposals) {
    const key = canonicalKey(p)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  const result: Proposal[] = []
  for (const group of groups.values()) {
    group.sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))
    result.push(group[0])
  }
  return result
}

/**
 * Match key for contradiction detection (system + code + teeth).
 */
function contradictionKey(bc: BillingChange): string {
  const teeth = (bc.teeth ?? []).sort().join(',')
  return `${bc.system}:${bc.code}:${teeth}`
}

/**
 * Detect and remove both sides of contradictory pairs:
 * - add_code + remove_code for same (system, code, teeth)
 * - update_multiplier for a code targeted by remove_code
 */
function filterContradictionPairs(proposals: Proposal[]): Proposal[] {
  const adds = new Map<string, Proposal>()
  const removes = new Map<string, Proposal>()
  const updates = new Map<string, Proposal>()

  for (const p of proposals) {
    const bc = p.billingChange
    if (!bc) continue
    const key = contradictionKey(bc)
    if (bc.type === 'add_code') adds.set(key, p)
    if (bc.type === 'remove_code') removes.set(key, p)
    if (bc.type === 'update_multiplier') updates.set(key, p)
  }

  const toRemove = new Set<string>()

  // add + remove for same key → remove both
  for (const key of adds.keys()) {
    if (removes.has(key)) {
      toRemove.add(adds.get(key)!.id)
      toRemove.add(removes.get(key)!.id)
    }
  }

  // update_multiplier for a code being removed → remove the update
  for (const key of updates.keys()) {
    if (removes.has(key)) {
      toRemove.add(updates.get(key)!.id)
    }
  }

  return proposals.filter(p => !toRemove.has(p.id))
}

/**
 * Remove proposals contradicted by claim facts.
 */
function filterClaimFacts(proposals: Proposal[], claimItems: ClaimItem[]): Proposal[] {
  return proposals.filter(p => {
    const bc = p.billingChange
    if (!bc) return true

    // add_code: reject if same code+system+tooth already in claim
    if (bc.type === 'add_code') {
      const exists = claimItems.some(ci =>
        ci.code === bc.code && ci.system === bc.system &&
        (bc.teeth?.length ? bc.teeth.some(t => t === ci.tooth) : true)
      )
      if (exists) return false
    }

    // remove_code: reject if index out of range
    if (bc.type === 'remove_code') {
      if (bc.existingItemIndex == null || bc.existingItemIndex < 0 || bc.existingItemIndex >= claimItems.length) {
        return false
      }
    }

    // update_multiplier: reject for non-GOZ
    if (bc.type === 'update_multiplier' && bc.system !== 'GOZ') {
      return false
    }

    return true
  })
}

/**
 * Full normalization pipeline: enrich → dedup → contradiction pairs → claim facts.
 */
export function normalizeProposals(proposals: Proposal[], claimItems: ClaimItem[]): Proposal[] {
  enrichRemoveProposals(proposals, claimItems)
  let result = deduplicateProposals(proposals)
  result = filterContradictionPairs(result)
  result = filterClaimFacts(result, claimItems)
  return result
}

// Export internals for testing
export { canonicalKey, deduplicateProposals, filterContradictionPairs, filterClaimFacts, enrichRemoveProposals }
