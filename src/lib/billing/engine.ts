import type {
  BillingItem, BillingHistory, DentalFinding,
  BillingPattern, BillingRule,
  ValidationResult, ValidationIssue,
  MultiplierCheck, FrequencyCheck,
} from './types'
import { exclusionRules } from './rules/exclusions'
import { inclusionRules } from './rules/inclusions'
import { requirementRules } from './rules/requirements'
import { frequencyRules } from './rules/frequency'
import { getMultiplierTiers } from './rules/multiplier'
import { allPatterns } from './patterns'

export class RuleEngine {
  private rules: {
    exclusions: typeof exclusionRules
    inclusions: typeof inclusionRules
    requirements: typeof requirementRules
    frequencies: typeof frequencyRules
  }
  private patterns: BillingPattern[]

  constructor() {
    this.rules = {
      exclusions: exclusionRules,
      inclusions: inclusionRules,
      requirements: requirementRules,
      frequencies: frequencyRules,
    }
    this.patterns = allPatterns
  }

  /** Validate a set of billing items against all rules */
  validate(items: BillingItem[]): ValidationResult {
    const issues: ValidationIssue[] = []

    issues.push(...this.checkExclusions(items))
    issues.push(...this.checkInclusions(items))
    issues.push(...this.checkRequirements(items))
    issues.push(...this.checkMultipliers(items))

    return {
      valid: issues.every(i => i.severity !== 'error'),
      issues,
    }
  }

  /** Find matching billing patterns for a set of dental findings */
  suggestPatterns(findings: DentalFinding[]): BillingPattern[] {
    const statuses = new Set(findings.map(f => f.status))
    const matched: BillingPattern[] = []

    for (const pattern of this.patterns) {
      // Match by category heuristics based on findings
      if (statuses.has('absent') || statuses.has('bridge-anchor') || statuses.has('replaced-bridge')) {
        if (pattern.category === 'ZE') matched.push(pattern)
      }
      if (statuses.has('crown-needs-renewal')) {
        if (pattern.id === 'goz-crown-renewal' || pattern.id === 'goz-single-crown') matched.push(pattern)
      }
      if (statuses.has('carious')) {
        if (pattern.category === 'KCH') matched.push(pattern)
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    return matched.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }

  /** Check a GOZ multiplier against the allowed tiers */
  checkMultiplier(code: string, factor: number): MultiplierCheck {
    const tiers = getMultiplierTiers(code)

    const withinStandard = factor <= tiers.standard
    const withinThreshold = factor <= tiers.threshold
    const exceedsMax = factor > tiers.max

    let message: string
    if (exceedsMax) {
      message = `Faktor ${factor}x überschreitet Maximum ${tiers.max}x für GOZ ${code}`
    } else if (!withinThreshold) {
      message = `Faktor ${factor}x über Schwellenwert ${tiers.threshold}x — schriftliche Begründung nach § 10 GOZ erforderlich`
    } else {
      message = `Faktor ${factor}x für GOZ ${code} im Rahmen (Schwellenwert: ${tiers.threshold}x)`
    }

    return {
      code,
      factor,
      withinStandard,
      withinThreshold,
      requiresJustification: !withinThreshold && !exceedsMax,
      exceedsMax,
      message,
    }
  }

  /** Check frequency limits for a code against billing history */
  checkFrequency(code: string, system: 'GOZ' | 'BEMA', history: BillingHistory): FrequencyCheck {
    const rule = this.rules.frequencies.find(r => r.code === code && r.system === system)
    if (!rule) {
      return {
        code, allowed: true, currentCount: 0, maxCount: Infinity,
        period: 'per-year', message: `Keine Frequenzregel für ${system} ${code}`,
      }
    }

    const now = new Date()
    const relevant = history.filter(h => {
      if (h.code !== code || h.system !== system) return false
      const d = new Date(h.date)
      switch (rule.period) {
        case 'per-session': return h.date === now.toISOString().split('T')[0]
        case 'per-year': return d >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        case 'per-2-years': return d >= new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
        case 'per-3-years': return d >= new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())
        case 'per-lifetime': return true
      }
    })

    const currentCount = relevant.length
    const allowed = currentCount < rule.maxCount

    return {
      code,
      allowed,
      currentCount,
      maxCount: rule.maxCount,
      period: rule.period,
      message: allowed
        ? `${system} ${code}: ${currentCount}/${rule.maxCount} (${rule.period})`
        : `${system} ${code}: Frequenzgrenze erreicht (${currentCount}/${rule.maxCount} ${rule.period})`,
    }
  }

  // --- Private validation methods ---

  private checkExclusions(items: BillingItem[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    for (const rule of this.rules.exclusions) {
      const itemsA = items.filter(i => i.code === rule.codeA && i.system === rule.systemA)
      const itemsB = items.filter(i => i.code === rule.codeB && i.system === rule.systemB)

      if (itemsA.length === 0 || itemsB.length === 0) continue

      if (rule.sameTooth) {
        for (const a of itemsA) {
          for (const b of itemsB) {
            const sharedTeeth = a.teeth?.filter(t => b.teeth?.includes(t)) ?? []
            if (sharedTeeth.length > 0) {
              issues.push({
                severity: 'error',
                ruleId: rule.id,
                ruleType: 'exclusion',
                message: `${rule.description} (Zahn ${sharedTeeth.join(', ')})`,
                codes: [rule.codeA, rule.codeB],
              })
            }
          }
        }
      } else {
        // Session-level or general exclusion
        issues.push({
          severity: 'error',
          ruleId: rule.id,
          ruleType: 'exclusion',
          message: rule.description,
          codes: [rule.codeA, rule.codeB],
        })
      }
    }

    return issues
  }

  private checkInclusions(items: BillingItem[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const codes = new Set(items.map(i => `${i.system}:${i.code}`))

    for (const rule of this.rules.inclusions) {
      const hasTarget = codes.has(`${rule.targetSystem}:${rule.targetCode}`)
      const hasIncluded = codes.has(`${rule.includedSystem}:${rule.includedCode}`)

      if (hasTarget && hasIncluded) {
        issues.push({
          severity: 'warning',
          ruleId: rule.id,
          ruleType: 'inclusion',
          message: rule.description,
          codes: [rule.targetCode, rule.includedCode],
        })
      }
    }

    return issues
  }

  private checkRequirements(items: BillingItem[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const codes = new Set(items.map(i => `${i.system}:${i.code}`))

    for (const rule of this.rules.requirements) {
      if (!codes.has(`${rule.system}:${rule.code}`)) continue

      for (const req of rule.requires) {
        if (!codes.has(`${req.system}:${req.code}`)) {
          issues.push({
            severity: 'warning',
            ruleId: rule.id,
            ruleType: 'requirement',
            message: `${rule.description} — ${req.system} ${req.code} fehlt`,
            codes: [rule.code, req.code],
          })
        }
      }
    }

    return issues
  }

  private checkMultipliers(items: BillingItem[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    for (const item of items) {
      if (item.system !== 'GOZ' || item.multiplier == null) continue

      const check = this.checkMultiplier(item.code, item.multiplier)

      if (check.exceedsMax) {
        issues.push({
          severity: 'error',
          ruleId: `mult-${item.code}`,
          ruleType: 'multiplier',
          message: check.message,
          codes: [item.code],
        })
      } else if (check.requiresJustification) {
        issues.push({
          severity: 'warning',
          ruleId: `mult-${item.code}`,
          ruleType: 'multiplier',
          message: check.message,
          codes: [item.code],
        })
      }
    }

    return issues
  }
}
