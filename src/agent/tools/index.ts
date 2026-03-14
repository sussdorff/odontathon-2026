import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { getCaseContext } from './case-context'
import { validateBilling } from './billing-validation'
import { matchPatterns } from './pattern-matching'
import { checkDocumentation } from './documentation-check'
import { lookupCatalogCode } from './catalog-lookup'
import { getPracticeRules } from './practice-rules-lookup'

export const allTools = [
  getCaseContext,
  validateBilling,
  matchPatterns,
  checkDocumentation,
  lookupCatalogCode,
  getPracticeRules,
]

export function createToolServer() {
  return createSdkMcpServer({
    name: 'dental-billing',
    version: '1.0.0',
    tools: allTools,
  })
}
