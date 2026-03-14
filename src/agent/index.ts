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

function formatBillingItems(items: AnalysisRequest['billingItems']): string {
  if (items.length === 0) return '(keine Positionen übergeben)'
  return items.map(i => {
    const parts = [`${i.system} ${i.code}`]
    if (i.multiplier) parts.push(`Faktor ${i.multiplier}x`)
    if (i.teeth?.length) parts.push(`Zahn ${i.teeth.join(', ')}`)
    return `- ${parts.join(' | ')}`
  }).join('\n')
}

function formatBillingItemsJson(items: AnalysisRequest['billingItems']): string {
  return JSON.stringify(items.map(i => ({
    code: i.code,
    system: i.system,
    ...(i.multiplier ? { multiplier: i.multiplier } : {}),
    ...(i.teeth?.length ? { teeth: i.teeth } : {}),
  })))
}

export function createBillingCoach(emitter?: ProgressEmitter) {
  const toolServer = createToolServer()

  return {
    async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
      const prompt = `Analysiere die Abrechnung für Patient ${request.patientId}.

## Abrechnungspositionen
${formatBillingItems(request.billingItems)}

## Positionen als JSON (für Tool-Aufrufe)
${formatBillingItemsJson(request.billingItems)}

## Auftrag
1. Rufe zuerst get_case_context auf mit patientId "${request.patientId}" um den vollständigen Patientenkontext zu laden.
2. Delegiere dann an alle 4 Sub-Agenten (compliance, documentation, optimization, practice_rules).
   Gib jedem Agent die Abrechnungspositionen UND relevante Patientendaten (Versicherungstyp, Befunde, Historie) als Text mit.
3. Sammle die Ergebnisse und erstelle den finalen ComplianceReport.`

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
