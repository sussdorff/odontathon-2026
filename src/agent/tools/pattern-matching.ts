import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { RuleEngine } from '../../lib/billing/engine'
import type { DentalFinding } from '../../lib/billing/types'

const engine = new RuleEngine()

export const matchPatterns = tool(
  'match_patterns',
  'Find matching billing patterns for dental findings. Returns pattern details with required/optional codes and documentation template references.',
  {
    findings: z.array(z.object({
      tooth: z.number().describe('FDI tooth number'),
      status: z.string().describe('Tooth status code (e.g. carious, absent, crown-needs-renewal)'),
      surfaces: z.array(z.string()).optional().describe('Affected surfaces (e.g. ["m","o","d"])'),
    })).describe('Dental findings to match against billing patterns'),
  },
  async ({ findings }) => {
    const patterns = engine.suggestPatterns(findings as DentalFinding[])

    const result = patterns.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      system: p.system,
      requiredCodes: p.required.map(r => ({
        code: r.code,
        system: r.system,
        multiplicity: r.multiplicity,
        description: r.description,
      })),
      optionalCodes: p.optional.map(o => ({
        code: o.code,
        system: o.system,
        multiplicity: o.multiplicity,
        description: o.description,
      })),
      requiredDocTemplate: p.requiredDocTemplate ?? null,
      docCompletionRequired: p.docCompletionRequired ?? false,
    }))

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)
