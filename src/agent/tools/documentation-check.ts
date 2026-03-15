import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { DocumentationLinkService } from '../../lib/documentation/link-service'

const docService = new DocumentationLinkService()

export const checkDocumentation = tool(
  'check_documentation',
  'Check documentation completeness for one or more billing codes. Accepts a single code or an array of codes. Returns the template with required/optional fields and which ones are missing for each code.',
  {
    codes: z.array(z.object({
      code: z.string().describe('Billing code (GOZ, BEMA, or GOÄ)'),
      system: z.enum(['GOZ', 'BEMA', 'GOÄ']).describe('Billing system'),
      filledFields: z.record(z.string(), z.unknown()).optional()
        .describe('Already filled documentation fields (fieldId → value). If omitted, treats all fields as empty.'),
    })).describe('Array of codes to check. Can also pass a single code via the legacy code/system params.'),
    // Legacy single-code params (still accepted for backwards compat)
    code: z.string().optional().describe('(Legacy) Single billing code'),
    system: z.enum(['GOZ', 'BEMA', 'GOÄ']).optional().describe('(Legacy) Single billing system'),
    filledFields: z.record(z.string(), z.unknown()).optional()
      .describe('(Legacy) Already filled documentation fields for single code'),
  },
  async ({ codes, code, system, filledFields }) => {
    // Normalize: support legacy single-code call
    const items = codes?.length
      ? codes
      : (code && system ? [{ code, system, filledFields }] : [])

    if (items.length === 0) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No codes provided' }) }] }
    }

    const results = await Promise.all(items.map(async (item) => {
      const template = await docService.getTemplateForCode(item.code, item.system)

      if (!template) {
        return {
          code: item.code,
          system: item.system,
          found: false,
          message: `Kein Dokumentations-Template für ${item.system} ${item.code} gefunden.`,
        }
      }

      const filled = item.filledFields ?? {}
      const isComplete = await docService.isDocumentationComplete(template.id, filled)

      const missingFields = template.fields
        .filter(f => f.required)
        .filter(f => {
          const val = filled[f.id]
          return val === null || val === undefined || val === ''
        })
        .map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          group: f.group ?? null,
        }))

      return {
        code: item.code,
        system: item.system,
        found: true,
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        complete: isComplete,
        totalRequiredFields: template.fields.filter(f => f.required).length,
        missingFields,
        allFields: template.fields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          group: f.group ?? null,
        })),
      }
    }))

    return { content: [{ type: 'text' as const, text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] }
  },
)
