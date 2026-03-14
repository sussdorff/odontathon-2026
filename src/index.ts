import { Hono } from 'hono'
import { aidboxConfig } from './lib/config'
import {
  exclusionRules,
  inclusionRules,
  requirementRules,
  frequencyRules,
  multiplierRules,
} from './lib/billing/rules'

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

app.all('/fhir/*', async (c) => {
  const subPath = c.req.path.replace(/^\/fhir/, '')
  const qs = new URL(c.req.url).search
  const target = `${aidboxConfig.fhirBaseUrl}${subPath}${qs}`

  const headers = new Headers(c.req.raw.headers)
  headers.set('Authorization', aidboxConfig.authHeader)

  const res = await fetch(target, {
    method: c.req.method,
    headers,
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
  })

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  })
})

const port = parseInt(process.env.PORT ?? '3001')
if (import.meta.main) {
  console.log(`Dental Agent API running on port ${port}`)
}

export default {
  port,
  fetch: app.fetch,
}
