import { query } from '@anthropic-ai/claude-agent-sdk'
import type { Options } from '@anthropic-ai/claude-agent-sdk'
import { createToolServer } from './tools'
import { subAgents } from './agents'
import { managerAgent } from './manager'
import { reportToJsonSchema } from './report-schema'
import type { ComplianceReport } from './report-schema'
import type { ProgressEmitter } from './hooks/progress'
import { normalizeProposals } from './proposal-normalizer'

export interface AnalysisRequest {
  patientId: string
  billingItems: Array<{
    code: string
    system: 'GOZ' | 'BEMA' | 'GOÄ'
    multiplier?: number
    teeth?: number[]
    index?: number
    session?: number | null
    note?: string | null
    quantity?: number
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
  return items.map((i, idx) => {
    const parts = [`[${i.index ?? idx}] ${i.system} ${i.code}`]
    if (i.multiplier) parts.push(`Faktor ${i.multiplier}x`)
    if (i.teeth?.length) parts.push(`Zahn ${i.teeth.join(', ')}`)
    if (i.session != null) parts.push(`Sitzung ${i.session}`)
    if (i.note) parts.push(`(${i.note})`)
    return `- ${parts.join(' | ')}`
  }).join('\n')
}

function formatBillingItemsJson(items: AnalysisRequest['billingItems']): string {
  return JSON.stringify(items.map((i, idx) => ({
    index: i.index ?? idx,
    code: i.code,
    system: i.system,
    ...(i.multiplier ? { multiplier: i.multiplier } : {}),
    ...(i.teeth?.length ? { teeth: i.teeth } : {}),
    ...(i.session != null ? { session: i.session } : {}),
    ...(i.note ? { note: i.note } : {}),
    ...(i.quantity && i.quantity > 1 ? { quantity: i.quantity } : {}),
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

/** Clean MCP tool name for status display */
function cleanToolName(name: string): string {
  return name.replace(/^mcp__[^_]+__/, '').replace(/^dental-billing:/, '')
}

export function createBillingCoach(emitter?: ProgressEmitter) {
  const toolServer = createToolServer()

  return {
    async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
      const dateInfo = request.analysisDate ? `Abrechnungsdatum: ${request.analysisDate}` : 'Kein spezifisches Datum'
      const historySection = request.history?.length
        ? `\n## Bisherige Abrechnungshistorie (${request.history.length} Positionen vor ${request.analysisDate || 'heute'})\n${JSON.stringify(request.history)}`
        : '\n## Abrechnungshistorie\nKeine bisherigen Abrechnungen bekannt.'

      const prompt = `Analysiere die Rechnung für Patient ${request.patientId}.
${dateInfo}

## Abrechnungspositionen (zu prüfen)
${formatBillingItems(request.billingItems)}

## Positionen als JSON (für Tool-Aufrufe)
${formatBillingItemsJson(request.billingItems)}
${historySection}

## Auftrag
Rufe zuerst get_case_context auf mit patientId "${request.patientId}"${request.analysisDate ? ` und beforeDate "${request.analysisDate}"` : ''}.
Analysiere dann die Rechnung direkt mit den verfügbaren Tools:
1. validate_billing für Regelprüfung
2. check_documentation für jeden Code
3. match_patterns für Optimierung
4. lookup_catalog_code für Erlösberechnung

Erstelle den finalen ComplianceReport.`

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
        ],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        disallowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'NotebookEdit', 'Agent'],
        persistSession: false,
      }

      emitter?.emit('analysis_start', {
        patientId: request.patientId,
        itemCount: request.billingItems.length,
      })

      let report: ComplianceReport | null = null
      let costUsd = 0
      let lastStatus = ''

      function emitStatus(label: string) {
        if (label !== lastStatus) {
          lastStatus = label
          emitter?.emit('analysis_status', { label })
        }
      }

      try {
        const q = query({ prompt, options })

        for await (const message of q) {
          // Tool calls → emit status based on tool name
          if (message.type === 'assistant') {
            const toolCalls = extractToolCalls(message)
            for (const tc of toolCalls) {
              const name = cleanToolName(tc.name)
              if (name === 'get_case_context') {
                emitStatus('Kontext wird geladen...')
              } else if (name === 'validate_billing') {
                emitStatus('Abrechnung wird geprüft...')
              } else if (name === 'check_documentation') {
                emitStatus('Dokumentation wird geprüft...')
              }
              // lookup_catalog_code and match_patterns keep the current label
            }
          }

          // Final result
          if (message.type === 'result') {
            emitStatus('Vorschläge werden erstellt...')
            costUsd = message.total_cost_usd
            if (message.subtype === 'success' && message.structured_output) {
              report = message.structured_output as ComplianceReport
              if (report.proposals) {
                const claimItems = request.billingItems.map((i) => ({
                  code: i.code, system: i.system, tooth: i.teeth?.[0] ?? null, session: i.session ?? null,
                }))
                report.proposals = normalizeProposals(report.proposals, claimItems)
              }
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
