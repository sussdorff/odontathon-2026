import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { RuleEngine } from '../../lib/billing/engine'
import type { BillingItem, BillingHistory } from '../../lib/billing/types'

const engine = new RuleEngine()

const billingItemSchema = z.object({
  code: z.string(),
  system: z.enum(['GOZ', 'BEMA']),
  multiplier: z.number().optional(),
  teeth: z.array(z.number()).optional(),
  date: z.string().optional(),
})

const historyEntrySchema = z.object({
  code: z.string(),
  system: z.string().describe('GOZ, BEMA, or GOÄ'),
  date: z.string(),
  tooth: z.number().nullable().optional(),
})

export const validateBilling = tool(
  'validate_billing',
  'Validate billing items against all rule types (exclusions, inclusions, requirements, multipliers). Optionally check frequency limits against billing history.',
  {
    items: z.array(billingItemSchema).describe('Billing items to validate'),
    history: z.array(historyEntrySchema).optional().describe('Prior billing history for frequency checks'),
  },
  async ({ items, history }) => {
    const result = engine.validate(items as BillingItem[])

    // Add frequency checks if history is provided
    if (history && history.length > 0) {
      for (const item of items) {
        const freqCheck = engine.checkFrequency(
          item.code,
          item.system,
          history as BillingHistory,
        )
        if (!freqCheck.allowed) {
          result.valid = false
          result.issues.push({
            severity: 'error',
            ruleId: `freq-${item.code}`,
            ruleType: 'frequency',
            message: freqCheck.message,
            codes: [item.code],
          })
        }
      }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)
