/**
 * Claude LLM Billing Agent — Zahnärztlicher Abrechnungsassistent.
 *
 * Nutzt Claude claude-opus-4-6 mit Tool Use, um Befundbeschreibungen zu analysieren,
 * passende GOZ/BEMA-Codes vorzuschlagen und Kostenschätzungen zu erstellen.
 */

import Anthropic from '@anthropic-ai/sdk'
import { RuleEngine } from '../lib/billing/engine'
import { calculateCosts, calculatePatientShare } from '../lib/billing/cost-calculator'
import type { BillingItem } from '../lib/billing/types'
import type { CostItem } from '../lib/billing/cost-calculator'

// --- Public Types ---

export interface ConversationState {
  sessionId: string
  messages: Array<Anthropic.MessageParam>
  extractedFindings: string[]
  proposedItems: BillingItem[]
  kassenart: string
  isComplete: boolean
}

export interface AgentResponse {
  message: string
  proposedItems: BillingItem[]
  validationIssues: Array<{ severity: string; message: string }>
  estimatedCost?: number
  followUpQuestions: string[]
  isComplete: boolean
}

// --- Tool Definitions ---

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'suggest_billing_codes',
    description: 'Schlägt passende GOZ/BEMA-Codes basierend auf dem beschriebenen Befund vor. Gibt eine Liste von Abrechnungspositionen mit Begründung zurück.',
    input_schema: {
      type: 'object',
      properties: {
        finding_text: {
          type: 'string',
          description: 'Befundbeschreibung auf Deutsch (z.B. "Füllungstherapie Zahn 26, mesio-okklusal, 2-flächig")',
        },
        category: {
          type: 'string',
          enum: ['ZE', 'KCH', 'PAR', 'KFO', 'KB'],
          description: 'Leistungsbereich: ZE (Zahnersatz), KCH (Konservierende/Chirurgische Heilkunde), PAR (Parodontologie), KFO (Kieferorthopädie), KB (Kieferbruch)',
        },
      },
      required: ['finding_text'],
    },
  },
  {
    name: 'validate_billing_items',
    description: 'Validiert Abrechnungspositionen gegen Ausschlüsse, Inklusionen und Voraussetzungen gemäß GOZ/BEMA-Regelwerk.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'GOZ-Nummer (z.B. "0010") oder BEMA-Kürzel (z.B. "Ä 1")' },
              system: { type: 'string', enum: ['GOZ', 'BEMA'], description: 'Abrechnungssystem' },
              multiplier: { type: 'number', description: 'GOZ-Steigerungsfaktor (nur GOZ, z.B. 2.3)' },
            },
            required: ['code', 'system'],
          },
          description: 'Liste der zu validierenden Abrechnungspositionen',
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'estimate_cost',
    description: 'Berechnet eine Sofort-Kostenschätzung für die vorgeschlagenen Leistungen. Gibt Gesamtbetrag, GOZ/BEMA-Aufteilung und ggf. Eigenanteil zurück.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              system: { type: 'string', enum: ['GOZ', 'BEMA'] },
              multiplier: { type: 'number', description: 'Steigerungsfaktor für GOZ (Standard: 2.3)' },
              kassenart: { type: 'string', description: 'Kassenart für BEMA (AOK, BKK, IKK, vdek)' },
              bereich: { type: 'string', description: 'BEMA-Bereich (KCH, ZE, PAR)' },
              count: { type: 'number', description: 'Anzahl (z.B. Zähne)' },
            },
            required: ['code', 'system'],
          },
        },
        kassenart: {
          type: 'string',
          description: 'Kassenart für BEMA-Positionen: AOK, BKK, IKK, vdek. Leer für Privatpatienten.',
        },
        festzuschuss: {
          type: 'number',
          description: 'GOZ-Festzuschuss in EUR bei Kassenpatient (ZE-Leistungen). 0 oder weglassen bei rein privatärztlicher Abrechnung.',
        },
      },
      required: ['items', 'kassenart'],
    },
  },
  {
    name: 'request_followup',
    description: 'Stellt gezielte Rückfragen bei unvollständiger Dokumentation, um die korrekte Abrechnung zu ermöglichen.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste von konkreten Rückfragen an den Behandler (maximal 3)',
        },
        reason: {
          type: 'string',
          description: 'Kurze Erklärung, warum diese Informationen für die Abrechnung benötigt werden',
        },
      },
      required: ['questions'],
    },
  },
]

// --- System Prompt ---

const SYSTEM_PROMPT = `Du bist ein erfahrener zahnärztlicher Abrechnungsassistent (Billing Coach) für eine Zahnarztpraxis in Deutschland.

## Deine Aufgaben:
1. Analysiere Befundbeschreibungen und schlage passende GOZ- und BEMA-Abrechnungspositionen vor
2. Erkläre deine Vorschläge mit Begründung
3. Stelle Rückfragen wenn wichtige Informationen fehlen (welche Zähne, wie viele Flächen, etc.)
4. Validiere Positionen gegen Ausschlüsse und Regelwerk
5. Erstelle Sofort-Kostenschätzungen für den Patienten

## Dein Fachwissen:
- GOZ (Gebührenordnung für Zahnärzte) für privatärztliche Leistungen
- BEMA (Bewertungsmaßstab zahnärztlicher Leistungen) für Kassenpatienten
- Steigerungsfaktoren: Regelsatz 2.3×, Schwellenwert 3.5× (mit Begründung), max. 3.5×
- Kassenarten: AOK, BKK, IKK, vdek mit unterschiedlichen Punktwerten
- ZE = Zahnersatz, KCH = Konservierend/Chirurgisch, PAR = Parodontologie

## Workflow:
1. Befund entgegennehmen
2. Bei unvollständigen Angaben: Rückfragen stellen (Tool: request_followup) — maximal 3 Fragen auf einmal
3. Passende Codes vorschlagen (Tool: suggest_billing_codes)
4. Validierung der Positionen (Tool: validate_billing_items)
5. Kostenschätzung erstellen (Tool: estimate_cost)
6. Ergebnis klar und verständlich kommunizieren

## Kommunikation:
- Sprich den Behandler professionell an
- Erkläre die Abrechnung klar und verständlich
- Weise auf Besonderheiten hin (Begründungspflicht, Ausschlüsse)
- Sei präzise bei Codes und Faktoren`

// --- Tool Executors ---

function executeSuggestBillingCodes(engine: RuleEngine, input: Record<string, unknown>): string {
  const findingText = String(input.finding_text ?? '')
  const category = input.category as string | undefined

  // Use the patterns from the engine for structured suggestions
  const allPatterns = (engine as any)['patterns'] as Array<{
    id: string; name: string; category: string; system: string;
    required: Array<{ code: string; system: string; description: string; multiplicity: string }>
  }>
  const relevantPatterns = category
    ? allPatterns.filter(p => p.category === category)
    : allPatterns.slice(0, 10)

  const suggestions = relevantPatterns.slice(0, 5).map(pattern => ({
    patternId: pattern.id,
    patternName: pattern.name,
    category: pattern.category,
    system: pattern.system,
    positions: pattern.required.map(p => ({
      code: p.code,
      system: p.system,
      description: p.description,
      multiplicity: p.multiplicity,
    })),
  }))

  return JSON.stringify({
    findingText,
    category: category ?? 'auto-detect',
    suggestions,
    note: `Basierend auf dem Befund "${findingText.substring(0, 100)}" wurden ${suggestions.length} relevante Abrechnungsmuster gefunden.`,
  }, null, 2)
}

function executeValidateBillingItems(engine: RuleEngine, input: Record<string, unknown>): string {
  const rawItems = (input.items as Array<{ code: string; system: string; multiplier?: number }>) ?? []

  const items: BillingItem[] = rawItems.map(item => ({
    code: item.code,
    system: item.system as 'GOZ' | 'BEMA',
    multiplier: item.multiplier,
  }))

  const result = engine.validate(items)

  return JSON.stringify({
    valid: result.valid,
    issueCount: result.issues.length,
    issues: result.issues.map(issue => ({
      severity: issue.severity,
      message: issue.message,
      codes: issue.codes,
      ruleType: issue.ruleType,
    })),
  }, null, 2)
}

function executeEstimateCost(input: Record<string, unknown>): string {
  const rawItems = (input.items as Array<{
    code: string
    system: string
    multiplier?: number
    kassenart?: string
    bereich?: string
    count?: number
  }>) ?? []

  const kassenart = String(input.kassenart ?? 'AOK')
  const festzuschuss = typeof input.festzuschuss === 'number' ? input.festzuschuss : 0

  const costItems: CostItem[] = rawItems.map(item => ({
    code: item.code,
    system: item.system as 'GOZ' | 'BEMA',
    multiplier: item.multiplier,
    kassenart: item.kassenart ?? kassenart,
    bereich: item.bereich,
    count: item.count,
  }))

  try {
    const breakdown = festzuschuss > 0
      ? calculatePatientShare(costItems, festzuschuss)
      : calculateCosts(costItems)

    return JSON.stringify({
      success: true,
      totalGOZ: breakdown.totalGOZ,
      totalBEMA: breakdown.totalBEMA,
      total: breakdown.total,
      festzuschuss: breakdown.festzuschuss,
      patientShare: breakdown.patientShare,
      itemBreakdown: breakdown.items.map((item: any) => ({
        code: item.code,
        description: item.description.substring(0, 80),
        total: item.total,
        system: 'grundpreis' in item ? 'GOZ' : 'BEMA',
      })),
    }, null, 2)
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      note: 'Einige Codes konnten nicht kalkuliert werden. Bitte überprüfen Sie die Angaben.',
    }, null, 2)
  }
}

function executeRequestFollowup(input: Record<string, unknown>): string {
  const questions = (input.questions as string[]) ?? []
  const reason = String(input.reason ?? '')

  return JSON.stringify({
    type: 'followup_requested',
    questions,
    reason,
    instruction: 'Bitte beantworte diese Rückfragen für eine vollständige Abrechnung.',
  }, null, 2)
}

// --- BillingAgent Class ---

export class BillingAgent {
  private client: Anthropic
  private engine: RuleEngine

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    })
    this.engine = new RuleEngine()
  }

  /** Create a new conversation session */
  createSession(sessionId: string, kassenart: string = 'AOK'): ConversationState {
    return {
      sessionId,
      messages: [],
      extractedFindings: [],
      proposedItems: [],
      kassenart,
      isComplete: false,
    }
  }

  /** Process a user message and return agent response */
  async chat(
    state: ConversationState,
    userMessage: string,
  ): Promise<{ state: ConversationState; response: AgentResponse }> {
    const updatedState: ConversationState = {
      ...state,
      messages: [
        ...state.messages,
        { role: 'user', content: userMessage },
      ],
    }

    return this.runAgentLoop(updatedState)
  }

  /** Internal: Run the tool-use agentic loop until end_turn */
  private async runAgentLoop(
    state: ConversationState,
  ): Promise<{ state: ConversationState; response: AgentResponse }> {
    let currentMessages = [...state.messages]
    let followUpQuestions: string[] = []
    let estimatedCost: number | undefined
    let lastTextMessage = ''
    let proposedItems: BillingItem[] = [...state.proposedItems]
    let validationIssues: Array<{ severity: string; message: string }> = []

    const MAX_ITERATIONS = 10
    let iteration = 0

    while (iteration < MAX_ITERATIONS) {
      iteration++

      const response = await this.client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: currentMessages,
      })

      // Collect text from this response
      for (const block of response.content) {
        if (block.type === 'text') {
          lastTextMessage = block.text
        }
      }

      if (response.stop_reason === 'end_turn') {
        currentMessages.push({ role: 'assistant', content: response.content })
        break
      }

      if (response.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content: response.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue

          let toolOutput: string

          try {
            const toolInput = block.input as Record<string, unknown>

            switch (block.name) {
              case 'suggest_billing_codes': {
                toolOutput = executeSuggestBillingCodes(this.engine, toolInput)
                const suggestions = JSON.parse(toolOutput)
                for (const s of suggestions.suggestions ?? []) {
                  for (const pos of s.positions ?? []) {
                    const existing = proposedItems.find(i => i.code === pos.code && i.system === pos.system)
                    if (!existing) {
                      proposedItems.push({ code: pos.code, system: pos.system as 'GOZ' | 'BEMA' })
                    }
                  }
                }
                break
              }
              case 'validate_billing_items': {
                toolOutput = executeValidateBillingItems(this.engine, toolInput)
                const validation = JSON.parse(toolOutput)
                validationIssues = validation.issues ?? []
                break
              }
              case 'estimate_cost': {
                toolOutput = executeEstimateCost(toolInput)
                const cost = JSON.parse(toolOutput)
                if (cost.success && cost.total != null) {
                  estimatedCost = cost.total
                }
                break
              }
              case 'request_followup': {
                toolOutput = executeRequestFollowup(toolInput)
                const followup = JSON.parse(toolOutput)
                followUpQuestions = followup.questions ?? []
                break
              }
              default:
                toolOutput = JSON.stringify({ error: `Unknown tool: ${block.name}` })
            }
          } catch (err) {
            toolOutput = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
              tool: block.name,
            })
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: toolOutput,
          })
        }

        currentMessages.push({ role: 'user', content: toolResults })
        continue
      }

      // Unexpected stop reason
      break
    }

    const newState: ConversationState = {
      ...state,
      messages: currentMessages,
      proposedItems,
      isComplete: followUpQuestions.length === 0 && proposedItems.length > 0,
    }

    const agentResponse: AgentResponse = {
      message: lastTextMessage,
      proposedItems,
      validationIssues,
      estimatedCost,
      followUpQuestions,
      isComplete: newState.isComplete,
    }

    return { state: newState, response: agentResponse }
  }
}
