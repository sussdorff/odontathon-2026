import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { DocumentationLinkService } from '../../lib/documentation/link-service'

const docService = new DocumentationLinkService()

export const checkDocumentation = tool(
  'check_documentation',
  'Check documentation completeness for a billing code. Returns the template with required/optional fields and which ones are missing.',
  {
    code: z.string().describe('Billing code (GOZ, BEMA, or GOÄ)'),
    system: z.enum(['GOZ', 'BEMA', 'GOÄ']).describe('Billing system'),
    filledFields: z.record(z.string(), z.unknown()).optional()
      .describe('Already filled documentation fields (fieldId → value). If omitted, treats all fields as empty.'),
  },
  async ({ code, system, filledFields }) => {
    const template = await docService.getTemplateForCode(code, system)

    if (!template) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            found: false,
            message: `Kein Dokumentations-Template für ${system} ${code} gefunden.`,
          }),
        }],
      }
    }

    const filled = filledFields ?? {}
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

    const result = {
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

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)
