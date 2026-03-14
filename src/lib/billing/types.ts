/**
 * Rule Engine types for GOZ/BEMA billing validation.
 *
 * Rules are TypeScript modules (not FHIR) — they're agent logic, not clinical data.
 */

export type BillingSystem = 'GOZ' | 'BEMA'
export type BillingCategory = 'ZE' | 'KCH' | 'PAR' | 'KFO' | 'KB'

// --- Rule Types (Discriminated Union) ---

export interface ExclusionRule {
  type: 'exclusion'
  id: string
  codeA: string
  systemA: BillingSystem
  codeB: string
  systemB: BillingSystem
  description: string
  /** If true, exclusion only applies within same session/tooth */
  sameSession?: boolean
  sameTooth?: boolean
}

export interface InclusionRule {
  type: 'inclusion'
  id: string
  /** The target code that already includes the sub-service */
  targetCode: string
  targetSystem: BillingSystem
  /** The code that is included (Zielleistung) and cannot be billed separately */
  includedCode: string
  includedSystem: BillingSystem
  description: string
}

export interface RequirementRule {
  type: 'requirement'
  id: string
  code: string
  system: BillingSystem
  /** Codes that must be present for this code to be billable */
  requires: Array<{ code: string; system: BillingSystem }>
  description: string
}

export type FrequencyPeriod = 'per-session' | 'per-quarter' | 'per-halfyear' | 'per-year' | 'per-2-years' | 'per-3-years' | 'per-lifetime'

export interface FrequencyRule {
  type: 'frequency'
  id: string
  code: string
  system: BillingSystem
  maxCount: number
  period: FrequencyPeriod
  /** Optional scope: per tooth, per jaw, per case */
  scope?: 'per-tooth' | 'per-jaw' | 'per-case'
  description: string
}

export interface MultiplierRule {
  type: 'multiplier'
  id: string
  code: string
  system: 'GOZ'
  /** Standard multiplier (Regelhöchstsatz) */
  standard: number
  /** Maximum without written justification (Schwellenwert) */
  threshold: number
  /** Absolute maximum */
  max: number
  description: string
}

export interface ConditionalRule {
  type: 'conditional'
  id: string
  code: string
  system: BillingSystem
  condition: string
  description: string
}

export type BillingRule =
  | ExclusionRule
  | InclusionRule
  | RequirementRule
  | FrequencyRule
  | MultiplierRule
  | ConditionalRule

// --- Billing Patterns ---

export type Multiplicity = 'per-tooth' | 'per-jaw' | 'per-case' | 'per-pontic' | 'per-abutment'

export interface PatternPosition {
  code: string
  system: BillingSystem
  multiplicity: Multiplicity
  description: string
  notes?: string
}

export interface PatternCondition {
  field: string
  operator: 'equals' | 'includes' | 'gt' | 'lt'
  value: string | number
}

export interface BillingPattern {
  id: string
  name: string
  category: BillingCategory
  system: BillingSystem | 'mixed'
  required: PatternPosition[]
  optional: PatternPosition[]
  conditions?: PatternCondition[]
  festzuschussBefunde?: string[]
}

// --- Engine Input/Output Types ---

export interface BillingItem {
  code: string
  system: BillingSystem
  /** GOZ multiplier (only for GOZ) */
  multiplier?: number
  /** FDI tooth number(s) */
  teeth?: number[]
  /** Date of service */
  date?: string
}

export interface DentalFinding {
  tooth: number
  status: string
  surfaces?: string[]
}

export interface BillingHistoryEntry {
  code: string
  system: BillingSystem
  date: string
  tooth?: number
}

export type BillingHistory = BillingHistoryEntry[]

// --- Validation Results ---

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  ruleId: string
  ruleType: BillingRule['type']
  message: string
  codes: string[]
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

export interface MultiplierCheck {
  code: string
  factor: number
  withinStandard: boolean
  withinThreshold: boolean
  requiresJustification: boolean
  exceedsMax: boolean
  message: string
}

export interface FrequencyCheck {
  code: string
  allowed: boolean
  currentCount: number
  maxCount: number
  period: FrequencyPeriod
  message: string
}
