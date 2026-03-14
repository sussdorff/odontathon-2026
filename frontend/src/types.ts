export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: string
  coverageType: 'GKV' | 'PKV'
  bonusPercent: number
  findingsCount: number
  findings: Finding[]
}

export interface Finding {
  tooth: number
  status: ToothStatus
  surfaces: string[]
}

export type ToothStatus =
  | 'absent'
  | 'carious'
  | 'crown-intact'
  | 'crown-needs-renewal'
  | 'bridge-anchor'
  | 'replaced-bridge'
  | 'implant'
  | 'implant-with-crown'
  | 'filled'
  | 'unknown'

export interface BillingSuggestion {
  code: string
  system: 'GOZ' | 'BEMA'
  description: string
  teeth: number[]
  multiplicity: string
  patternId: string
  patternName: string
  isRequired: boolean
}

export interface BillingItem {
  id: string
  code: string
  system: 'GOZ' | 'BEMA'
  multiplier?: number
  teeth: number[]
  description: string
  checked: boolean
  patternId?: string
  patternName?: string
  isRequired?: boolean
}

export interface CostBreakdownItem {
  code: string
  system: string
  price: number
  error?: string
}

export interface CostResult {
  totalCost: number
  festzuschuss: number
  patientShare: number
  breakdown: CostBreakdownItem[]
  festzuschussError?: string
}

export interface AnalysisReport {
  patientName: string
  coverageType: string
  analysisDate: string
  summary: {
    errors: number
    warnings: number
    suggestions: number
    estimatedRevenueDelta: number
    documentationComplete: boolean
  }
  findings: AnalysisFinding[]
  recommendedCodes: RecommendedCode[]
}

export interface AnalysisFinding {
  severity: 'error' | 'warning' | 'info' | 'suggestion'
  title: string
  description: string
  codes: string[]
  action: string
}

export interface RecommendedCode {
  system: string
  code: string
  reason: string
  isNew: boolean
}

export interface PracticeRule {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
}

export type Severity = 'error' | 'warning' | 'info' | 'suggestion'
