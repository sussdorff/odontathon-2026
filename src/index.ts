import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { aidboxConfig } from './lib/config'
import {
  exclusionRules,
  inclusionRules,
  requirementRules,
  frequencyRules,
  multiplierRules,
} from './lib/billing/rules'
import { RuleEngine } from './lib/billing/engine'
import { calculateGOZPrice, calculateBEMAPrice, calculatePatientShare } from './lib/billing/calculator'
import { agentRoutes } from './api/agent-routes'
import { practiceRulesRoutes } from './api/practice-rules-routes'

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

// Patients API — list seeded patients with coverage & findings summary
app.get('/api/patients', async (c) => {
  const headers = { Authorization: aidboxConfig.authHeader }

  const [patRes, covRes, obsRes] = await Promise.all([
    fetch(`${aidboxConfig.fhirBaseUrl}/Patient?_count=100&_sort=family`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Coverage?_count=100`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Observation?_count=500&code=http://loinc.org|8339-4`, { headers }),
  ])

  const [patBundle, covBundle, obsBundle] = await Promise.all([
    patRes.json(), covRes.json(), obsRes.json(),
  ])

  // Index coverages by patient ref
  const coverageByPatient = new Map<string, any>()
  for (const e of (covBundle.entry ?? [])) {
    const ref = e.resource.beneficiary?.reference
    if (ref) coverageByPatient.set(ref, e.resource)
  }

  // Index observations by patient ref
  const obsByPatient = new Map<string, any[]>()
  for (const e of (obsBundle.entry ?? [])) {
    const ref = e.resource.subject?.reference
    if (!ref) continue
    if (!obsByPatient.has(ref)) obsByPatient.set(ref, [])
    obsByPatient.get(ref)!.push(e.resource)
  }

  const patients = (patBundle.entry ?? []).map((e: any) => {
    const p = e.resource
    const id = p.id
    const ref = `Patient/${id}`
    const cov = coverageByPatient.get(ref)
    const obs = obsByPatient.get(ref) ?? []

    const coverageType = cov?.type?.coding?.some((cd: any) =>
      cd.code === 'PKV'
    ) ? 'PKV' : 'GKV'

    const bonusExt = cov?.extension?.find((ex: any) =>
      ex.url?.includes('ze-bonus-prozent')
    )

    const findings = obs.map((o: any) => {
      const toothCode = o.bodySite?.coding?.find((cd: any) =>
        cd.system?.includes('fdi-tooth-number'))?.code
      const statusCode = o.valueCodeableConcept?.coding?.find((cd: any) =>
        cd.system?.includes('tooth-status'))?.code
      const surfaceExt = o.extension?.find((ex: any) =>
        ex.url?.includes('tooth-surfaces'))
      const surfaces = surfaceExt?.valueString?.split(',') ?? []
      return {
        tooth: toothCode ? parseInt(toothCode) : null,
        status: statusCode ?? 'unknown',
        surfaces,
      }
    }).filter((f: any) => f.tooth !== null)

    return {
      id,
      name: [p.name?.[0]?.given?.join(' '), p.name?.[0]?.family].filter(Boolean).join(' '),
      birthDate: p.birthDate,
      gender: p.gender,
      coverageType,
      bonusPercent: bonusExt?.valueInteger ?? 0,
      findingsCount: findings.length,
      findings,
    }
  })

  return c.json({ total: patients.length, patients })
})

// Billing suggestions for a patient based on their findings
app.get('/api/patients/:id/suggestions', async (c) => {
  const patientId = c.req.param('id')
  const headers = { Authorization: aidboxConfig.authHeader }

  const obsRes = await fetch(
    `${aidboxConfig.fhirBaseUrl}/Observation?subject=Patient/${patientId}&code=http://loinc.org|8339-4&_count=100`,
    { headers },
  )
  const obsBundle = await obsRes.json()

  const findings = (obsBundle.entry ?? []).map((e: any) => {
    const o = e.resource
    const toothCode = o.bodySite?.coding?.find((cd: any) =>
      cd.system?.includes('fdi-tooth-number'))?.code
    const statusCode = o.valueCodeableConcept?.coding?.find((cd: any) =>
      cd.system?.includes('tooth-status'))?.code
    const surfaceExt = o.extension?.find((ex: any) =>
      ex.url?.includes('tooth-surfaces'))
    const surfaces = surfaceExt?.valueString?.split(',') ?? []
    return {
      tooth: toothCode ? parseInt(toothCode) : 0,
      status: statusCode ?? 'unknown',
      surfaces,
    }
  }).filter((f: any) => f.tooth > 0)

  const engine = new RuleEngine()
  const patterns = engine.suggestPatterns(findings)

  // Build suggested billing items from patterns + findings
  const suggestions: Array<{
    code: string
    system: string
    description: string
    teeth: number[]
    multiplicity: string
    patternId: string
    patternName: string
    isRequired: boolean
  }> = []

  for (const pattern of patterns) {
    // Determine which teeth this pattern applies to
    const relevantTeeth = findings
      .filter(f => {
        if (pattern.category === 'ZE') return ['absent', 'bridge-anchor', 'replaced-bridge', 'crown-needs-renewal'].includes(f.status)
        if (pattern.category === 'KCH') return ['carious'].includes(f.status)
        return false
      })
      .map(f => f.tooth)

    for (const pos of pattern.required) {
      const teeth = pos.multiplicity === 'per-case' ? [] : relevantTeeth
      suggestions.push({
        code: pos.code,
        system: pos.system,
        description: pos.description,
        teeth,
        multiplicity: pos.multiplicity,
        patternId: pattern.id,
        patternName: pattern.name,
        isRequired: true,
      })
    }

    for (const pos of pattern.optional) {
      const teeth = pos.multiplicity === 'per-case' ? [] : relevantTeeth
      suggestions.push({
        code: pos.code,
        system: pos.system,
        description: pos.description,
        teeth,
        multiplicity: pos.multiplicity,
        patternId: pattern.id,
        patternName: pattern.name,
        isRequired: false,
      })
    }
  }

  // Deduplicate by code+system, keeping the first occurrence (required > optional)
  const seen = new Set<string>()
  const deduped = suggestions.filter(s => {
    const key = `${s.system}:${s.code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return c.json({ patientId, findingsCount: findings.length, patterns: patterns.length, suggestions: deduped })
})

// Catalog search for code autocomplete
// In-memory catalog cache for fast search
let catalogCache: Array<{ code: string; system: 'GOZ' | 'BEMA'; title: string; punktzahl?: number }> | null = null

async function getCatalogCache() {
  if (catalogCache) return catalogCache
  const headers = { Authorization: aidboxConfig.authHeader }
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/ChargeItemDefinition?_count=600`, { headers })
  const bundle = await res.json()
  catalogCache = (bundle.entry ?? [])
    .map((e: any) => {
      const r = e.resource
      const coding = r.code?.coding?.[0]
      if (!coding) return null
      const sys = coding.system?.includes('goz') ? 'GOZ' as const : coding.system?.includes('bema') ? 'BEMA' as const : null
      if (!sys) return null
      const punktzahl = r.propertyGroup?.[0]?.priceComponent?.[0]?.factor
      return {
        code: coding.code,
        system: sys,
        title: coding.display ?? '',
        punktzahl: typeof punktzahl === 'number' ? punktzahl : undefined,
      }
    })
    .filter(Boolean) as typeof catalogCache
  return catalogCache!
}

app.get('/api/catalog/search', async (c) => {
  const q = c.req.query('q') ?? ''
  const system = c.req.query('system') as 'GOZ' | 'BEMA' | undefined
  if (q.length < 1) return c.json({ results: [] })

  const catalog = await getCatalogCache()
  const qLower = q.toLowerCase()

  const results = catalog
    .filter((entry) => {
      if (system && entry.system !== system) return false
      return (
        entry.code.toLowerCase().includes(qLower) ||
        entry.title.toLowerCase().includes(qLower)
      )
    })
    .sort((a, b) => {
      // Exact prefix match on code first
      const aPrefix = a.code.toLowerCase().startsWith(qLower) ? 0 : 1
      const bPrefix = b.code.toLowerCase().startsWith(qLower) ? 0 : 1
      if (aPrefix !== bPrefix) return aPrefix - bPrefix
      return a.code.localeCompare(b.code)
    })
    .slice(0, 20)

  return c.json({ results })
})

// Billing calculator API
app.post('/api/billing/calculate', async (c) => {
  const body = await c.req.json()
  const { items, festzuschussBefund, bonusTier, kassenart } = body

  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'items array is required and must not be empty' }, 400)
  }

  const breakdown: Array<{ code: string; system: string; price: number; error?: string }> = []

  for (const item of items) {
    try {
      let price: number
      if (item.system === 'GOZ') {
        price = calculateGOZPrice(item.code, item.factor ?? 2.3)
      } else if (item.system === 'BEMA') {
        const kk = item.kassenart ?? kassenart
        if (!kk) {
          breakdown.push({ code: item.code, system: item.system, price: 0, error: 'Kassenart fehlt' })
          continue
        }
        price = calculateBEMAPrice(item.code, kk)
      } else {
        breakdown.push({ code: item.code, system: item.system, price: 0, error: `Unbekanntes System: ${item.system}` })
        continue
      }
      breakdown.push({ code: item.code, system: item.system, price })
    } catch (err: any) {
      breakdown.push({ code: item.code, system: item.system, price: 0, error: err.message })
    }
  }

  const totalCost = Math.round(breakdown.reduce((sum, b) => sum + b.price, 0) * 100) / 100

  let festzuschuss = 0
  let patientShare = totalCost
  if (festzuschussBefund) {
    try {
      const shareItems = items
        .filter((it: any) => !breakdown.find(b => b.code === it.code && b.error))
        .map((it: any) => ({
          code: it.code,
          system: it.system,
          factor: it.factor,
          kassenart: it.kassenart ?? kassenart,
        }))
      const result = calculatePatientShare(shareItems, festzuschussBefund, bonusTier ?? '60pct', kassenart)
      festzuschuss = result.festzuschuss
      patientShare = result.patientShare
    } catch (err: any) {
      return c.json({ totalCost, festzuschuss: 0, patientShare: totalCost, breakdown, festzuschussError: err.message })
    }
  }

  return c.json({ totalCost, festzuschuss, patientShare, breakdown })
})

// Agent & practice rules API
app.route('/api/agent', agentRoutes)
app.route('/api/practice-rules', practiceRulesRoutes)

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

// Static UI — serve React build output (after all API routes)
app.use('/*', serveStatic({ root: './frontend/dist' }))
app.use('/*', serveStatic({ root: './frontend/dist', path: 'index.html' }))

const port = parseInt(process.env.PORT ?? '3001')
if (import.meta.main) {
  console.log(`Dental Agent API running on port ${port}`)
}

export default {
  port,
  fetch: app.fetch,
}
