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
    system: 'GOZ' | 'BEMA' | 'GOÄ'
    multiplier?: number
    teeth?: number[]
  }>
  history?: Array<{
    code: string
    system: string
    date: string
    tooth?: number | null
  }>
  analysisDate?: string
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

/** Extract tool_use blocks from an assistant message's content */
function extractToolCalls(message: any): Array<{ name: string; input: unknown }> {
  const content = message?.message?.content
  if (!Array.isArray(content)) return []
  return content
    .filter((b: any) => b.type === 'tool_use')
    .map((b: any) => ({ name: b.name, input: b.input }))
}

/** Extract text blocks from an assistant message's content */
function extractText(message: any): string {
  const content = message?.message?.content
  if (!Array.isArray(content)) return ''
  return content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
}

/** Truncate large objects for display */
function truncate(obj: unknown, maxLen = 500): string {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen) + '…'
}

export function createBillingCoach(emitter?: ProgressEmitter) {
  const toolServer = createToolServer()

  return {
    async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
      const dateInfo = request.analysisDate ? `Abrechnungsdatum: ${request.analysisDate}` : 'Kein spezifisches Datum'
      const historySection = request.history?.length
        ? `\n## Bisherige Abrechnungshistorie (${request.history.length} Positionen vor ${request.analysisDate || 'heute'})\nDiese Daten sind für Frequenzprüfungen relevant:\n${JSON.stringify(request.history)}`
        : '\n## Abrechnungshistorie\nKeine bisherigen Abrechnungen bekannt.'

      const prompt = `Analysiere die Abrechnung für Patient ${request.patientId}.
${dateInfo}

## Abrechnungspositionen (zu prüfen)
${formatBillingItems(request.billingItems)}

## Positionen als JSON (für Tool-Aufrufe)
${formatBillingItemsJson(request.billingItems)}
${historySection}

## Auftrag
1. Rufe zuerst get_case_context auf mit patientId "${request.patientId}" um den vollständigen Patientenkontext zu laden.
2. Delegiere dann an alle 4 Sub-Agenten (compliance, documentation, optimization, practice_rules).
   Gib jedem Agent die Abrechnungspositionen UND relevante Patientendaten (Versicherungstyp, Befunde, Historie) als Text mit.
   WICHTIG: Übergib auch die Abrechnungshistorie an den Compliance-Agenten für Frequenzprüfungen.
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

      emitter?.emit('analysis_start', {
        patientId: request.patientId,
        itemCount: request.billingItems.length,
      })

      let report: ComplianceReport | null = null
      let costUsd = 0

      // Track active sub-agents by task_id
      const agentTasks = new Map<string, string>()

      try {
        const q = query({ prompt, options })

        for await (const message of q) {
          // --- Assistant messages (manager or sub-agent thinking + tool calls) ---
          if (message.type === 'assistant') {
            const isSubAgent = message.parent_tool_use_id !== null
            const text = extractText(message)
            const toolCalls = extractToolCalls(message)

            if (text && !isSubAgent) {
              emitter?.emit('manager_thinking', { text: truncate(text, 1000) })
            }

            for (const tc of toolCalls) {
              if (tc.name === 'Agent') {
                // Manager is delegating to a sub-agent
                const agentInput = tc.input as any
                emitter?.emit('agent_start', {
                  agent: agentInput?.description || agentInput?.subagent_type || 'unknown',
                  prompt: truncate(agentInput?.prompt || '', 500),
                })
              } else if (isSubAgent) {
                // Sub-agent calling a tool
                emitter?.emit('agent_tool_call', {
                  tool: tc.name,
                  input: truncate(tc.input),
                })
              } else {
                // Manager calling a tool directly
                emitter?.emit('manager_tool_call', {
                  tool: tc.name,
                  input: truncate(tc.input),
                })
              }
            }
          }

          // --- User messages (tool results coming back) ---
          if (message.type === 'user' && message.tool_use_result !== undefined) {
            const isSubAgent = message.parent_tool_use_id !== null
            if (!isSubAgent) {
              emitter?.emit('manager_tool_result', {
                result: truncate(message.tool_use_result),
              })
            }
          }

          // --- Sub-agent lifecycle (task events) ---
          if (message.type === 'system') {
            const sys = message as any
            if (sys.subtype === 'task_started') {
              agentTasks.set(sys.task_id, sys.description || 'Sub-Agent')
              emitter?.emit('agent_start', {
                taskId: sys.task_id,
                agent: sys.description || sys.task_type || 'unknown',
                prompt: truncate(sys.prompt || '', 500),
              })
            }

            if (sys.subtype === 'task_progress') {
              emitter?.emit('agent_progress', {
                taskId: sys.task_id,
                agent: agentTasks.get(sys.task_id) || 'Sub-Agent',
                lastTool: sys.last_tool_name || null,
                summary: sys.summary || null,
                toolUses: sys.usage?.tool_uses ?? 0,
              })
            }

            if (sys.subtype === 'task_notification') {
              emitter?.emit('agent_complete', {
                taskId: sys.task_id,
                agent: agentTasks.get(sys.task_id) || 'Sub-Agent',
                status: sys.status,
                summary: sys.summary || '',
                toolUses: sys.usage?.tool_uses ?? 0,
                tokens: sys.usage?.total_tokens ?? 0,
              })
              agentTasks.delete(sys.task_id)
            }
          }

          // --- Tool progress (long-running tool calls) ---
          if (message.type === 'tool_progress') {
            const tp = message as any
            emitter?.emit('agent_tool_call', {
              tool: tp.tool_name,
              elapsed: tp.elapsed_time_seconds,
              taskId: tp.task_id || null,
            })
          }

          // --- Final result ---
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

      emitter?.emit('analysis_complete', { report, costUsd })
      return { report, costUsd }
    },
  }
}
