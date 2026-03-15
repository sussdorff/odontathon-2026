export interface Patient {
  id: string
  name: string
  birthDate: string
  gender: string
  coverageType: 'GKV' | 'PKV'
  bonusPercent: number
  pflegegrad: number | null
  eingliederungshilfe: boolean
  coveragePayor: string | null
  coverageId: string | null
  findingsCount: number
  findings: Finding[]
  conditions: Condition[]
  claims: Claim[]
  billingHistory: HistoryEntry[]
  encounters: Encounter[]
  procedures: Procedure[]
}

export interface Condition {
  code: string | null
  display: string | null
  clinicalStatus: string | null
}

export interface ClaimItem {
  code: string | null
  display: string | null
  system: 'GOZ' | 'BEMA' | 'GOÄ'
  tooth: number | null
  surfaces: string[]
  quantity: number
  session: number | null
  note: string | null
  price: number
}

export interface Claim {
  id: string
  date: string
  provider: string | null
  itemCount: number
  teeth: number[]
  items: ClaimItem[]
  total: number
}

export interface HistoryEntry {
  code: string
  system: string
  date: string
  tooth: number | null
}

export interface Encounter {
  id: string
  date: string | null
  status: string
  reason: string | null
  tooth: number | null
}

export interface Procedure {
  id: string
  date: string | null
  status: string
  code: string | null
  display: string | null
  tooth: string | null
  notes: string[]
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
  system: 'GOZ' | 'BEMA' | 'GOÄ'
  multiplier?: number
  teeth: number[]
  description: string
  checked: boolean
  patternId?: string
  patternName?: string
  isRequired?: boolean
  session?: number | null
  note?: string | null
  originalIndex?: number
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
  claimId?: string
  summary: {
    errors: number
    warnings: number
    suggestions: number
    estimatedRevenueDelta: number
    documentationComplete: boolean
  }
  proposals: Proposal[]
}

export interface Proposal {
  id: string
  severity: Severity
  category: 'compliance' | 'documentation' | 'optimization' | 'practice-rule'
  title: string
  description: string
  billingChange?: BillingChange
  documentationChange?: DocumentationChange
}

export interface BillingChange {
  type: 'add_code' | 'remove_code' | 'update_multiplier' | 'update_tooth'
  code: string
  system: string
  description?: string
  multiplier?: number
  teeth?: number[]
  existingItemIndex?: number
  currentMultiplier?: number
  newMultiplier?: number
  session?: number | null
  reason: string
  estimatedRevenueDelta?: number
}

export interface DocumentationChange {
  type: 'add_field' | 'update_field' | 'flag_missing_documentation' | 'flag_unbilled_service'
  code?: string
  system?: string
  templateId?: string
  fieldId?: string
  fieldLabel?: string
  suggestedValue?: string
  procedureId?: string
  reason: string
}

export interface ApplyResult {
  applied: Array<{ id: string; status: 'ok' | 'error'; message: string; resource?: string }>
  updatedResources: string[]
}

export interface PracticeRule {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
}

export type Severity = 'error' | 'warning' | 'info' | 'suggestion'

// Chat / Billing Coach types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ProposedItem {
  code: string
  system: 'GOZ' | 'BEMA'
  description: string
  factor?: number
  teeth?: number[]
  estimatedCost?: number
}

export interface ValidationIssue {
  code: string
  issue: string
  severity: 'error' | 'warning'
}

export interface ChatResponse {
  sessionId: string
  message: string
  proposedItems: ProposedItem[]
  validationIssues: ValidationIssue[]
  followUpQuestions: string[]
  isComplete: boolean
}
