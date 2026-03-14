import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { randomUUID } from 'node:crypto'
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
import { applyRoutes } from './api/apply-routes'
import { AidboxClient } from './fhir/client'

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

  const [patRes, covRes, obsRes, condRes, claimRes, encRes, procRes] = await Promise.all([
    fetch(`${aidboxConfig.fhirBaseUrl}/Patient?_count=100&_sort=family`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Coverage?_count=100`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Observation?_count=500&code=http://loinc.org|8339-4`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Condition?_count=200`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Claim?_count=200&_sort=-created`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Encounter?_count=200&_sort=-date`, { headers }),
    fetch(`${aidboxConfig.fhirBaseUrl}/Procedure?_count=200&_sort=-date`, { headers }),
  ])

  const [patBundle, covBundle, obsBundle, condBundle, claimBundle, encBundle, procBundle] = await Promise.all([
    patRes.json(), covRes.json(), obsRes.json(), condRes.json(), claimRes.json(), encRes.json(), procRes.json(),
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

  // Index conditions by patient ref
  const condByPatient = new Map<string, any[]>()
  for (const e of (condBundle.entry ?? [])) {
    const ref = e.resource.subject?.reference
    if (!ref) continue
    if (!condByPatient.has(ref)) condByPatient.set(ref, [])
    condByPatient.get(ref)!.push(e.resource)
  }

  // Index claims by patient ref
  const claimsByPatient = new Map<string, any[]>()
  for (const e of (claimBundle.entry ?? [])) {
    const ref = e.resource.patient?.reference
    if (!ref) continue
    if (!claimsByPatient.has(ref)) claimsByPatient.set(ref, [])
    claimsByPatient.get(ref)!.push(e.resource)
  }

  // Index encounters by patient ref
  const encByPatient = new Map<string, any[]>()
  for (const e of (encBundle.entry ?? [])) {
    const ref = e.resource.subject?.reference
    if (!ref) continue
    if (!encByPatient.has(ref)) encByPatient.set(ref, [])
    encByPatient.get(ref)!.push(e.resource)
  }

  // Index procedures by patient ref
  const procByPatient = new Map<string, any[]>()
  for (const e of (procBundle.entry ?? [])) {
    const ref = e.resource.subject?.reference
    if (!ref) continue
    if (!procByPatient.has(ref)) procByPatient.set(ref, [])
    procByPatient.get(ref)!.push(e.resource)
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

    // Pflegegrad from patient extensions
    const pflegegradExt = p.extension?.find((ex: any) => ex.url?.includes('pflegegrad-status'))
    const pflegegrad = pflegegradExt?.extension?.find((ex: any) => ex.url?.includes('pflegegrad-level'))?.valueInteger ?? null
    const eingliederungshilfe = pflegegradExt?.extension?.some((ex: any) =>
      ex.url?.includes('eingliederungshilfe') && ex.valueBoolean === true
    ) ?? false

    // Coverage details
    const coveragePayor = cov?.payor?.[0]?.reference ?? null
    const coverageId = cov?.identifier?.[0]?.value ?? null

    // Conditions
    const conditions = (condByPatient.get(ref) ?? []).map((c: any) => ({
      code: c.code?.coding?.[0]?.code ?? null,
      display: c.code?.coding?.[0]?.display ?? c.code?.text ?? null,
      clinicalStatus: c.clinicalStatus?.coding?.[0]?.code ?? null,
    }))

    // Billing history from Claims — preserve claim structure
    const claims = (claimsByPatient.get(ref) ?? []).map((claim: any) => {
      const items = (claim.item ?? []).map((item: any) => {
        const coding = item.productOrService?.coding?.[0]
        const sys = coding?.system ?? ''
        const noteExt = item.extension?.find((ex: any) => ex.url?.includes('billing-note'))
        const sessionExt = item.extension?.find((ex: any) => ex.url?.includes('treatment-session'))
        return {
          code: coding?.code ?? null,
          display: coding?.display ?? null,
          system: sys.includes('goz') ? 'GOZ' : sys.includes('goae') ? 'GOÄ' : 'BEMA',
          tooth: item.bodySite?.coding?.[0]?.code ? parseInt(item.bodySite.coding[0].code) : null,
          surfaces: (item.subSite ?? []).map((s: any) => s.coding?.[0]?.code).filter(Boolean),
          quantity: item.quantity?.value ?? 1,
          session: sessionExt?.valueInteger ?? null,
          note: noteExt?.valueString ?? null,
        }
      })
      const teeth = [...new Set(items.map((i: any) => i.tooth).filter(Boolean))].sort((a: number, b: number) => a - b)
      return {
        id: claim.id,
        date: claim.created ?? null,
        provider: claim.provider?.reference?.replace('Practitioner/', '') ?? null,
        itemCount: items.length,
        teeth,
        items,
      }
    }).sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? ''))

    // Also keep flat history for agent compatibility
    const billingHistory = claims.flatMap((c: any) =>
      c.items.map((i: any) => ({ code: i.code, system: i.system, date: c.date, tooth: i.tooth }))
    )

    return {
      id,
      name: [p.name?.[0]?.given?.join(' '), p.name?.[0]?.family].filter(Boolean).join(' '),
      birthDate: p.birthDate,
      gender: p.gender,
      coverageType,
      bonusPercent: bonusExt?.valueInteger ?? 0,
      pflegegrad,
      eingliederungshilfe,
      coveragePayor,
      coverageId,
      findingsCount: findings.length,
      findings,
      conditions,
      claims,
      billingHistory,
      encounters: (encByPatient.get(ref) ?? []).map((enc: any) => ({
        id: enc.id,
        date: enc.period?.start ?? null,
        status: enc.status,
        reason: enc.reasonCode?.[0]?.text ?? enc.reasonCode?.[0]?.coding?.[0]?.display ?? null,
        tooth: enc.extension?.find((ex: any) => ex.url?.includes('fdi-tooth-number'))?.valueInteger ?? null,
      })),
      procedures: (procByPatient.get(ref) ?? []).map((proc: any) => ({
        id: proc.id,
        date: proc.performedDateTime ?? proc.performedPeriod?.start ?? null,
        status: proc.status,
        code: proc.code?.coding?.[0]?.code ?? null,
        display: proc.code?.coding?.[0]?.display ?? proc.code?.text ?? null,
        tooth: proc.bodySite?.find((bs: any) =>
          bs.coding?.some((c: any) => c.system?.includes('fdi-tooth-number'))
        )?.coding?.[0]?.code ?? null,
        notes: proc.note?.map((n: any) => n.text).filter(Boolean) ?? [],
      })),
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

  // Enrich findings with documented treatments from Procedures
  const procRes = await fetch(
    `${aidboxConfig.fhirBaseUrl}/Procedure?subject=Patient/${patientId}&_count=100`,
    { headers },
  )
  const procBundle = await procRes.json()
  const treatmentByTooth = new Map<number, string>()
  for (const e of (procBundle.entry ?? [])) {
    const proc = e.resource
    const tooth = proc.bodySite?.[0]?.coding?.find((cd: any) =>
      cd.system?.includes('fdi-tooth-number'))?.code
    if (!tooth) continue
    const toothNum = parseInt(tooth)
    // Detect treatment type from procedure category/code
    const catCode = proc.category?.coding?.[0]?.code ?? ''
    const codeText = (proc.code?.text ?? '').toLowerCase()
    let treatment: string | undefined
    if (codeText.includes('füllung') || codeText.includes('komposit') || catCode === '274163004') {
      treatment = 'filling'
    } else if (codeText.includes('wurzelkanal') || codeText.includes('endodont')) {
      treatment = 'root-canal'
    } else if (codeText.includes('extraktion')) {
      treatment = 'extraction'
    } else if (codeText.includes('krone')) {
      treatment = 'crown'
    }
    if (treatment) treatmentByTooth.set(toothNum, treatment)
  }
  for (const f of findings) {
    const treatment = treatmentByTooth.get(f.tooth)
    if (treatment) f.treatment = treatment
  }

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

// FHIR client instance (encapsulates Aidbox access)
const fhirClient = new AidboxClient()

// GET /api/patients/:id/findings — returns FHIR Observations for a patient
app.get('/api/patients/:id/findings', async (c) => {
  const patientId = c.req.param('id')

  const observations = await fhirClient.getObservations(patientId, 'http://loinc.org|8339-4')

  const findings = observations.map((obs) => {
    const toothCode = obs.bodySite?.coding?.find((cd) =>
      cd.system?.includes('fdi-tooth-number'))?.code
    const statusCode = obs.valueCodeableConcept?.coding?.find((cd) =>
      cd.system?.includes('tooth-status'))?.code
    const surfaceExt = obs.extension?.find((ex) =>
      ex.url?.includes('tooth-surfaces'))
    const surfaces = surfaceExt?.valueString?.split(',').map(s => s.trim()).filter(Boolean) ?? []

    return {
      tooth: toothCode ? parseInt(toothCode, 10) : null,
      status: statusCode ?? 'unknown',
      surfaces,
      observationId: obs.id ?? '',
    }
  }).filter((f) => f.tooth !== null)

  return c.json({
    patientId,
    total: findings.length,
    findings,
  })
})

// POST /api/hkp/draft — generates an HKP draft from billing items
app.post('/api/hkp/draft', async (c) => {
  const body = await c.req.json()
  const { patientId, billingItems = [], kassenart } = body

  if (!patientId) {
    return c.json({ error: 'patientId ist erforderlich' }, 400)
  }

  // Look up ChargeItemDefinition descriptions from Aidbox for each code
  const codeDescriptions = new Map<string, string>()
  const allCodes = (billingItems as Array<{ code: string; system: string }>).map(i => i.code)
  if (allCodes.length > 0) {
    try {
      const bundle = await fhirClient.searchResources('ChargeItemDefinition', {
        _count: String(allCodes.length + 10),
      })
      for (const entry of bundle.entry ?? []) {
        const res = entry.resource as any
        const coding = res.code?.coding?.[0]
        if (coding?.code && coding?.display) {
          codeDescriptions.set(coding.code, coding.display)
        }
      }
    } catch {
      // If lookup fails, fall back to code as description
    }
  }

  // Build items with description and price
  let totalEstimate = 0
  const items = (billingItems as Array<{
    code: string
    system: 'GOZ' | 'BEMA'
    teeth?: number[]
    factor?: number
  }>).map((item) => {
    const description = codeDescriptions.get(item.code) ?? item.code
    let price = 0
    try {
      if (item.system === 'GOZ') {
        price = calculateGOZPrice(item.code, item.factor ?? 2.3)
      } else if (item.system === 'BEMA' && kassenart) {
        price = calculateBEMAPrice(item.code, kassenart)
      }
    } catch {
      // Unknown code — price stays 0
    }
    totalEstimate += price
    return { ...item, description, price }
  })

  return c.json({
    draftId: randomUUID(),
    patientId,
    createdAt: new Date().toISOString(),
    kassenart: kassenart ?? 'PKV',
    items,
    totalEstimate: Math.round(totalEstimate * 100) / 100,
    status: 'draft',
  })
})

// Agent & practice rules API
app.route('/api/agent', agentRoutes)
app.route('/api/claims', applyRoutes)
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
  idleTimeout: 255, // seconds — SSE streams + agent calls need long timeouts
}
