export type PracticeRuleCategory = 'billing' | 'documentation' | 'workflow'

export type PracticeRuleCondition =
  | { type: 'code_used'; code: string; system: 'GOZ' | 'BEMA' }
  | { type: 'coverage_type'; coverageType: 'GKV' | 'PKV' }
  | { type: 'always' }

export type PracticeRuleAction =
  | { type: 'require_code'; code: string; system: 'GOZ' | 'BEMA'; reason: string }
  | { type: 'prefer_multiplier'; code: string; factor: number; reason: string }
  | { type: 'warn'; message: string }

export interface PracticeRule {
  id: string
  category: PracticeRuleCategory
  name: string
  description: string
  enabled: boolean
  condition: PracticeRuleCondition
  action: PracticeRuleAction
}

export interface PracticeRuleSet {
  version: number
  updatedAt: string
  rules: PracticeRule[]
}
