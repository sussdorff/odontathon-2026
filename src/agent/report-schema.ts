import { z } from 'zod/v4'

// --- Change Proposals (actionable, not just text) ---

export const billingChangeSchema = z.object({
  type: z.enum(['add_code', 'remove_code', 'update_multiplier', 'update_tooth']),
  code: z.string(),
  system: z.string(),
  // For add_code
  description: z.string().optional(),
  multiplier: z.number().optional(),
  teeth: z.array(z.number()).optional(),
  // For remove_code — which existing item index to remove
  existingItemIndex: z.number().optional(),
  // For update_multiplier
  currentMultiplier: z.number().optional(),
  newMultiplier: z.number().optional(),
  // Session context for dedup
  session: z.number().nullable().optional(),
  // Common
  reason: z.string(),
  estimatedRevenueDelta: z.number().optional(),
})

export const documentationChangeSchema = z.object({
  type: z.enum(['add_field', 'update_field', 'flag_missing_documentation', 'flag_unbilled_service']),
  // For flag_unbilled_service — a documented service that wasn't billed
  code: z.string().optional(),
  system: z.string().optional(),
  // For add_field / update_field
  templateId: z.string().optional(),
  fieldId: z.string().optional(),
  fieldLabel: z.string().optional(),
  suggestedValue: z.string().optional(),
  // Target FHIR resource to update
  procedureId: z.string().optional(),
  // Common
  reason: z.string(),
})

export const proposalSchema = z.object({
  id: z.string(),
  severity: z.enum(['error', 'warning', 'info', 'suggestion']),
  category: z.enum(['compliance', 'documentation', 'optimization', 'practice-rule']),
  title: z.string(),
  description: z.string(),
  // The concrete change — exactly one of these
  billingChange: billingChangeSchema.optional(),
  documentationChange: documentationChangeSchema.optional(),
})

// --- Report ---

export const complianceReportSchema = z.object({
  patientName: z.string(),
  coverageType: z.enum(['GKV', 'PKV']),
  analysisDate: z.string(),
  claimId: z.string().optional(),
  summary: z.object({
    errors: z.number(),
    warnings: z.number(),
    suggestions: z.number(),
    estimatedRevenueDelta: z.number(),
    documentationComplete: z.boolean(),
  }),
  proposals: z.array(proposalSchema),
})

export type BillingChange = z.infer<typeof billingChangeSchema>
export type DocumentationChange = z.infer<typeof documentationChangeSchema>
export type Proposal = z.infer<typeof proposalSchema>
export type ComplianceReport = z.infer<typeof complianceReportSchema>

export function reportToJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(complianceReportSchema, { target: 'draft-7' })
}
