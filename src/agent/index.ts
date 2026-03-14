import { query } from '@anthropic-ai/claude-agent-sdk'
import type { Options } from '@anthropic-ai/claude-agent-sdk'
import { createToolServer } from './tools'
import { subAgents } from './agents'
import { managerAgent } from './manager'
import { reportToJsonSchema } from './report-schema'
import type { ComplianceReport } from './report-schema'
import type { ProgressEmitter } from './hooks/progress'

export interface AnalysisRequest {
  patientId: string
  billingItems: Array<{
    code: string
    system: 'GOZ' | 'BEMA'
    multiplier?: number
    teeth?: number[]
  }>
}

export interface AnalysisResult {
  report: ComplianceReport | null
  error?: string
  costUsd: number
}

export function createBillingCoach(emitter?: ProgressEmitter) {
  const toolServer = createToolServer()

  return {
    async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
      const billingContext = request.billingItems
        .map(i => `${i.system} ${i.code}${i.multiplier ? ` (${i.multiplier}x)` : ''}${i.teeth?.length ? ` Zahn ${i.teeth.join(',')}` : ''}`)
        .join('\n')

      const prompt = `Analysiere die Abrechnung für Patient ${request.patientId}.

Abrechnungspositionen:
${billingContext}

Führe eine vollständige Analyse durch: Regelkonformität, Dokumentation, Optimierung und Praxisregeln.`

      const options: Options = {
        model: managerAgent.model,
        maxTurns: managerAgent.maxTurns,
        systemPrompt: managerAgent.prompt,
        agents: subAgents,
        mcpServers: { 'dental-billing': toolServer },
        outputFormat: {
          type: 'json_schema',
          schema: reportToJsonSchema(),
        },
        allowedTools: [
          'dental-billing:get_case_context',
          'dental-billing:validate_billing',
          'dental-billing:match_patterns',
          'dental-billing:check_documentation',
          'dental-billing:lookup_catalog_code',
          'dental-billing:get_practice_rules',
          'Agent',
        ],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        tools: [],
        persistSession: false,
      }

      emitter?.emit('analysis_start', { patientId: request.patientId })

      let report: ComplianceReport | null = null
      let costUsd = 0

      try {
        const q = query({ prompt, options })

        for await (const message of q) {
          if (message.type === 'assistant') {
            emitter?.emit('agent_progress', {
              message: 'Manager verarbeitet...',
            })
          }

          if (message.type === 'result') {
            costUsd = message.total_cost_usd
            if (message.subtype === 'success' && message.structured_output) {
              report = message.structured_output as ComplianceReport
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        emitter?.emit('analysis_error', { error: errorMsg })
        return { report: null, error: errorMsg, costUsd }
      }

      emitter?.emit('analysis_complete', { report })
      return { report, costUsd }
    },
  }
}
