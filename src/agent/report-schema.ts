import { z } from 'zod/v4'

export const findingSchema = z.object({
  severity: z.enum(['error', 'warning', 'info', 'suggestion']),
  category: z.enum(['compliance', 'documentation', 'optimization', 'practice-rule']),
  title: z.string(),
  description: z.string(),
  codes: z.array(z.string()),
  action: z.string(),
})

export const recommendedCodeSchema = z.object({
  code: z.string(),
  system: z.enum(['GOZ', 'BEMA']),
  reason: z.string(),
  isNew: z.boolean(),
})

export const complianceReportSchema = z.object({
  patientName: z.string(),
  coverageType: z.enum(['GKV', 'PKV']),
  analysisDate: z.string(),
  summary: z.object({
    errors: z.number(),
    warnings: z.number(),
    suggestions: z.number(),
    estimatedRevenueDelta: z.number(),
    documentationComplete: z.boolean(),
  }),
  findings: z.array(findingSchema),
  recommendedCodes: z.array(recommendedCodeSchema),
})

export type ComplianceReport = z.infer<typeof complianceReportSchema>

export function reportToJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(complianceReportSchema, { target: 'draft-7' })
}
