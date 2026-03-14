import { Hono } from 'hono'
import { aidboxConfig } from './lib/config'
import {
  exclusionRules,
  inclusionRules,
  requirementRules,
  frequencyRules,
  multiplierRules,
} from './lib/billing/rules'
import { BillingAgent } from './agent/billing-agent'
import type { ConversationState } from './agent/billing-agent'

export const VALID_RULE_TYPES = ['exclusion', 'inclusion', 'requirement', 'frequency', 'multiplier'] as const
type RuleType = (typeof VALID_RULE_TYPES)[number]

function isRuleType(value: string): value is RuleType {
  return (VALID_RULE_TYPES as readonly string[]).includes(value)
}

export const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok' }))

app.get('/api/catalogs/status', async (c) => {
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/ChargeItemDefinition?_summary=count`, {
    headers: { Authorization: aidboxConfig.authHeader },
  })
  const data = await res.json()
  return c.json({ catalogEntries: data.total ?? 0 })
})

const ruleGroups: Record<RuleType, readonly unknown[]> = {
  exclusion: exclusionRules,
  inclusion: inclusionRules,
  requirement: requirementRules,
  frequency: frequencyRules,
  multiplier: multiplierRules,
}

app.get('/api/rules', (c) => {
  const type = c.req.query('type')

  if (type !== undefined) {
    if (!isRuleType(type)) {
      return c.json({ error: 'Invalid rule type', validTypes: VALID_RULE_TYPES }, 400)
    }
    const items = ruleGroups[type]
    return c.json({ total: items.length, rules: { [type]: { count: items.length, items } } })
  }

  const rules = Object.fromEntries(
    Object.entries(ruleGroups).map(([k, v]) => [k, { count: v.length, items: v }])
  )
  const total = Object.values(ruleGroups).reduce((sum, arr) => sum + arr.length, 0)
  return c.json({ total, rules })
})

// --- Agent Endpoint ---

/** In-memory session store for the hackathon */
const sessionStore = new Map<string, ConversationState>()

const agentInstance = new BillingAgent()

app.post('/api/agent/chat', async (c) => {
  try {
    const body = await c.req.json() as {
      sessionId: string
      message: string
      kassenart?: string
      state?: ConversationState
    }

    if (!body.sessionId || !body.message) {
      return c.json({ error: 'sessionId and message are required' }, 400)
    }

    // Get or create session state
    let state: ConversationState
    if (body.state) {
      // Client provided state directly (stateless mode)
      state = body.state
    } else if (sessionStore.has(body.sessionId)) {
      state = sessionStore.get(body.sessionId)!
    } else {
      // New session
      state = agentInstance.createSession(body.sessionId, body.kassenart ?? 'AOK')
    }

    const { state: newState, response } = await agentInstance.chat(state, body.message)

    // Persist state in memory store
    sessionStore.set(body.sessionId, newState)

    return c.json({ state: newState, response })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

const port = parseInt(process.env.PORT ?? '3001')
if (import.meta.main) {
  console.log(`Dental Agent API running on port ${port}`)
}

export default {
  port,
  fetch: app.fetch,
}
