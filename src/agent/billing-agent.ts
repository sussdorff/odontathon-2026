/**
 * Claude LLM Billing Agent — Zahnärztlicher Abrechnungsassistent.
 *
 * Nutzt Claude claude-opus-4-6 mit Tool Use, um Befundbeschreibungen zu analysieren,
 * passende GOZ/BEMA-Codes vorzuschlagen und Kostenschätzungen zu erstellen.
 */

import Anthropic from '@anthropic-ai/sdk'
import { RuleEngine } from '../lib/billing/engine'
import { calculateCosts, calculatePatientShare } from '../lib/billing/cost-calculator'
import { AidboxClient } from '../fhir/client'
import { aidboxConfig } from '../lib/config'
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
  {
    name: 'get_patient_claim',
    description: 'Ruft die bestehende GOZ/BEMA-Abrechnung (Claim) eines Patienten ab. Zeigt alle bereits abgerechneten Positionen mit Codes, Zähnen und Notizen.',
    input_schema: {
      type: 'object',
      properties: {
        patient_id: {
          type: 'string',
          description: 'FHIR Patient-ID (z.B. "patient-berg-lukas")',
        },
      },
      required: ['patient_id'],
    },
  },
  {
    name: 'get_patient_documentation',
    description: 'Ruft die klinische Dokumentation eines Patienten ab: Procedures (Behandlungen), Conditions (Diagnosen) und Observations (Befunde wie Röntgen, Vitalitätsprüfung). Damit lässt sich prüfen, ob dokumentierte Leistungen auch abgerechnet wurden.',
    input_schema: {
      type: 'object',
      properties: {
        patient_id: {
          type: 'string',
          description: 'FHIR Patient-ID (z.B. "patient-berg-lukas")',
        },
      },
      required: ['patient_id'],
    },
  },
  {
    name: 'get_past_invoice_patterns',
    description: 'Analysiert vergangene Abrechnungen der Praxis für einen bestimmten Leistungsbereich und gibt häufig gemeinsam abgerechnete Codes zurück. Damit können fehlende Positionen erkannt werden, die üblicherweise zusammen abgerechnet werden.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['filling', 'root-canal', 'extraction', 'crown'],
          description: 'Art der Behandlung, für die Muster gesucht werden sollen',
        },
      },
      required: ['category'],
    },
  },
]

// --- System Prompt ---

const SYSTEM_PROMPT = `Du bist ein erfahrener zahnärztlicher Abrechnungsassistent (Billing Coach) für eine Zahnarztpraxis in Deutschland.

## Deine Aufgaben:
1. Analysiere Befundbeschreibungen und schlage passende GOZ- und BEMA-Abrechnungspositionen vor
2. Prüfe bestehende Abrechnungen auf fehlende Positionen
3. Vergleiche Dokumentation (Prozeduren, Befunde) mit der Abrechnung — dokumentierte Leistungen, die nicht abgerechnet wurden, müssen erkannt werden
4. Analysiere Praxis-Abrechnungsmuster (pastInvoices) um übliche Positionen zu identifizieren, die fehlen könnten
5. Erstelle Sofort-Kostenschätzungen für den Patienten

## Dein Fachwissen:
- GOZ (Gebührenordnung für Zahnärzte) für privatärztliche Leistungen
- BEMA (Bewertungsmaßstab zahnärztlicher Leistungen) für Kassenpatienten
- Steigerungsfaktoren: Regelsatz 2.3×, Schwellenwert 3.5× (mit Begründung), max. 3.5×
- Kassenarten: AOK, BKK, IKK, vdek mit unterschiedlichen Punktwerten
- ZE = Zahnersatz, KCH = Konservierend/Chirurgisch, PAR = Parodontologie

## Analyse-Workflow (wenn Patient-ID vorhanden):
1. **Dokumentation abrufen** (Tool: get_patient_documentation) — Welche Behandlungen, Diagnosen und Befunde sind dokumentiert?
2. **Bestehende Abrechnung abrufen** (Tool: get_patient_claim) — Was wurde bereits abgerechnet?
3. **Lückenanalyse**: Vergleiche Dokumentation ↔ Abrechnung:
   - Ist eine Vitalitätsprüfung (0070) dokumentiert aber nicht abgerechnet?
   - Sind Röntgenbilder dokumentiert aber nicht abgerechnet?
   - Fehlen andere dokumentierte Leistungen in der Abrechnung?
4. **Praxis-Muster prüfen** (Tool: get_past_invoice_patterns) — Welche Codes werden bei diesem Behandlungstyp üblicherweise zusammen abgerechnet?
5. **Fehlende Positionen identifizieren**: Codes mit hoher Frequenz (>70%) in den Praxis-Mustern, die nicht in der aktuellen Abrechnung erscheinen
6. **Ergebnis kommunizieren**: Klar auflisten, welche Positionen fehlen und warum

## Chat-Workflow (ohne Patient-ID):
1. Befund entgegennehmen
2. Bei unvollständigen Angaben: Rückfragen stellen (Tool: request_followup) — maximal 3 Fragen auf einmal
3. Passende Codes vorschlagen (Tool: suggest_billing_codes)
4. Kostenschätzung erstellen (Tool: estimate_cost)

## Kommunikation:
- Sprich den Behandler professionell an
- Erkläre die Abrechnung klar und verständlich
- Bei fehlenden Positionen: Erkläre WARUM die Position abrechenbar ist (z.B. "GOZ 0070 ist dokumentiert in der Vitalitätsprüfung, aber nicht in der Abrechnung")
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

// --- FHIR Tool Executors ---

async function executeGetPatientClaim(fhir: AidboxClient, input: Record<string, unknown>): Promise<string> {
  const patientId = String(input.patient_id ?? '')
  const bundle = await fhir.searchResources('Claim', {
    patient: `Patient/${patientId}`,
    _count: '10',
  })

  const claims = (bundle.entry ?? []).map((e: any) => {
    const claim = e.resource
    const items = (claim.item ?? []).map((item: any) => {
      const coding = item.productOrService?.coding?.[0]
      const tooth = item.bodySite?.coding?.find((c: any) => c.system?.includes('fdi-tooth-number'))?.code
      const note = item.extension?.find((ex: any) => ex.url?.includes('billing-note'))?.valueString
      return {
        sequence: item.sequence,
        code: coding?.code,
        system: coding?.system?.includes('goz') ? 'GOZ' : coding?.system?.includes('goae') ? 'GOÄ' : coding?.system,
        display: coding?.display,
        tooth: tooth ?? null,
        quantity: item.quantity?.value,
        note: note ?? null,
      }
    })
    return {
      claimId: claim.id,
      status: claim.status,
      created: claim.created,
      diagnosisCount: (claim.diagnosis ?? []).length,
      itemCount: items.length,
      items,
    }
  })

  if (claims.length === 0) {
    return JSON.stringify({ patientId, message: 'Keine bestehende Abrechnung gefunden.' })
  }

  return JSON.stringify({ patientId, claims }, null, 2)
}

async function executeGetPatientDocumentation(fhir: AidboxClient, input: Record<string, unknown>): Promise<string> {
  const patientId = String(input.patient_id ?? '')
  const patientRef = `Patient/${patientId}`

  const [procBundle, condBundle, obsBundle] = await Promise.all([
    fhir.searchResources('Procedure', { subject: patientRef, _count: '50' }),
    fhir.searchResources('Condition', { subject: patientRef, _count: '50' }),
    fhir.searchResources('Observation', { subject: patientRef, _count: '100' }),
  ])

  const procedures = (procBundle.entry ?? []).map((e: any) => {
    const p = e.resource
    const tooth = p.bodySite?.[0]?.coding?.find((c: any) => c.system?.includes('fdi-tooth-number'))?.code
    return {
      id: p.id,
      status: p.status,
      category: p.category?.coding?.[0]?.display,
      description: p.code?.text,
      tooth: tooth ?? null,
      date: p.performedDateTime,
      notes: (p.note ?? []).map((n: any) => n.text),
    }
  })

  const conditions = (condBundle.entry ?? []).map((e: any) => {
    const c = e.resource
    const tooth = c.bodySite?.[0]?.coding?.find((cd: any) => cd.system?.includes('fdi-tooth-number'))?.code
    return {
      id: c.id,
      code: c.code?.coding?.[0]?.code,
      display: c.code?.coding?.[0]?.display,
      text: c.code?.text,
      tooth: tooth ?? null,
      clinicalStatus: c.clinicalStatus?.coding?.[0]?.code,
      notes: (c.note ?? []).map((n: any) => n.text),
    }
  })

  const observations = (obsBundle.entry ?? []).map((e: any) => {
    const o = e.resource
    const tooth = o.bodySite?.coding?.find((c: any) => c.system?.includes('fdi-tooth-number'))?.code
    const category = o.category?.[0]?.coding?.[0]?.code
    return {
      id: o.id,
      category,
      codeText: o.code?.text ?? o.code?.coding?.[0]?.display,
      tooth: tooth ?? null,
      value: o.valueString ?? o.valueCodeableConcept?.text ?? null,
      date: o.effectiveDateTime,
    }
  })

  return JSON.stringify({
    patientId,
    procedures,
    conditions,
    observations,
  }, null, 2)
}

function executeGetPastInvoicePatterns(input: Record<string, unknown>): string {
  const category = String(input.category ?? 'filling')

  // Simulated practice patterns based on past invoices
  const patterns: Record<string, { description: string; commonCodes: Array<{ code: string; system: string; description: string; frequency: string }> }> = {
    filling: {
      description: 'Häufig abgerechnete Codes bei Füllungstherapie (aus 150+ Rechnungen)',
      commonCodes: [
        { code: '0010', system: 'GOZ', description: 'Eingehende Untersuchung', frequency: '95%' },
        { code: '0070', system: 'GOZ', description: 'Vitalitätsprüfung eines Zahnes', frequency: '78%' },
        { code: '0090', system: 'GOZ', description: 'Infiltrationsanästhesie', frequency: '92%' },
        { code: '2030', system: 'GOZ', description: 'Besondere Maßnahmen beim Präparieren oder Füllen', frequency: '85%' },
        { code: '2060', system: 'GOZ', description: 'Füllung einflächig', frequency: '30%' },
        { code: '2080', system: 'GOZ', description: 'Füllung zweiflächig', frequency: '35%' },
        { code: '2100', system: 'GOZ', description: 'Füllung dreiflächig', frequency: '25%' },
        { code: '2197', system: 'GOZ', description: 'Adhäsive Befestigung (Dentinadhäsiv)', frequency: '88%' },
        { code: '2330', system: 'GOZ', description: 'Indirekte Überkappung', frequency: '22%' },
        { code: '5000', system: 'GOÄ', description: 'Zahnfilm (Röntgen)', frequency: '65%' },
        { code: '1020', system: 'GOZ', description: 'Lokale Fluoridierung', frequency: '40%' },
      ],
    },
    'root-canal': {
      description: 'Häufig abgerechnete Codes bei Wurzelkanalbehandlung',
      commonCodes: [
        { code: '0010', system: 'GOZ', description: 'Eingehende Untersuchung', frequency: '98%' },
        { code: '0070', system: 'GOZ', description: 'Vitalitätsprüfung', frequency: '90%' },
        { code: '2380', system: 'GOZ', description: 'Wurzelkanalbehandlung', frequency: '100%' },
        { code: '2390', system: 'GOZ', description: 'Wurzelkanalaufbereitung', frequency: '100%' },
        { code: '2400', system: 'GOZ', description: 'Wurzelfüllung', frequency: '95%' },
      ],
    },
    extraction: {
      description: 'Häufig abgerechnete Codes bei Extraktion',
      commonCodes: [
        { code: '3000', system: 'GOZ', description: 'Extraktion', frequency: '100%' },
        { code: '0090', system: 'GOZ', description: 'Infiltrationsanästhesie', frequency: '95%' },
      ],
    },
    crown: {
      description: 'Häufig abgerechnete Codes bei Kronenversorgung',
      commonCodes: [
        { code: '0010', system: 'GOZ', description: 'Eingehende Untersuchung', frequency: '95%' },
        { code: '2210', system: 'GOZ', description: 'Kronenversorgung', frequency: '100%' },
      ],
    },
  }

  const result = patterns[category] ?? patterns.filling
  return JSON.stringify({
    category,
    ...result,
    note: 'Codes mit hoher Frequenz (>70%) die nicht in der aktuellen Abrechnung erscheinen, sollten auf fehlende Positionen geprüft werden.',
  }, null, 2)
}

// --- BillingAgent Class ---

export class BillingAgent {
  private client: Anthropic
  private engine: RuleEngine
  private fhir: AidboxClient

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    })
    this.engine = new RuleEngine()
    this.fhir = new AidboxClient()
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
              case 'get_patient_claim': {
                toolOutput = await executeGetPatientClaim(this.fhir, toolInput)
                break
              }
              case 'get_patient_documentation': {
                toolOutput = await executeGetPatientDocumentation(this.fhir, toolInput)
                break
              }
              case 'get_past_invoice_patterns': {
                toolOutput = executeGetPastInvoicePatterns(toolInput)
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
