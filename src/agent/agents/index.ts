import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'
import { complianceAgent } from './compliance'
import { documentationAgent } from './documentation'
import { optimizationAgent } from './optimization'
import { practiceRulesAgent } from './practice-rules'

export const subAgents: Record<string, AgentDefinition> = {
  compliance: complianceAgent,
  documentation: documentationAgent,
  optimization: optimizationAgent,
  practice_rules: practiceRulesAgent,
}
