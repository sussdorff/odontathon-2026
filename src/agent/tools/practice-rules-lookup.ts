import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { PracticeRuleStore } from '../../lib/practice-rules/store'

const store = new PracticeRuleStore()

export const getPracticeRules = tool(
  'get_practice_rules',
  'Retrieve practice-specific billing rules. Optionally filter by category.',
  {
    category: z.enum(['billing', 'documentation', 'workflow']).optional()
      .describe('Filter rules by category. If omitted, returns all rules.'),
  },
  async ({ category }) => {
    const ruleSet = await store.getAll()
    let rules = ruleSet.rules.filter(r => r.enabled)

    if (category) {
      rules = rules.filter(r => r.category === category)
    }

    const result = {
      version: ruleSet.version,
      totalEnabled: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        category: r.category,
        name: r.name,
        description: r.description,
        condition: r.condition,
        action: r.action,
      })),
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)
