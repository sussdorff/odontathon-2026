import { Hono } from 'hono'
import { aidboxConfig } from '../lib/config'
import type { BillingChange, DocumentationChange } from '../agent/report-schema'

const applyRoutes = new Hono()

interface ApplyRequest {
  claimId: string
  patientId: string
  analysisDate?: string
  approvedProposals: Array<{
    id: string
    billingChange?: BillingChange
    documentationChange?: DocumentationChange
  }>
}

interface ApplyResult {
  applied: Array<{ id: string; status: 'ok' | 'error'; message: string; resource?: string }>
  updatedResources: string[]
}

async function fhirGet(path: string) {
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/${path}`, {
    headers: { Authorization: aidboxConfig.authHeader },
  })
  if (!res.ok) throw new Error(`FHIR GET ${path}: ${res.status}`)
  return res.json()
}

async function fhirPut(path: string, body: unknown) {
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/${path}`, {
    method: 'PUT',
    headers: { Authorization: aidboxConfig.authHeader, 'Content-Type': 'application/fhir+json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`FHIR PUT ${path}: ${res.status}`)
  return res.json()
}

function systemToUrl(system: string): string {
  if (system === 'GOZ') return 'http://fhir.de/CodeSystem/goz'
  if (system === 'GOÄ') return 'http://fhir.de/CodeSystem/goae'
  return 'http://fhir.de/CodeSystem/bema'
}

applyRoutes.post('/apply', async (c) => {
  const body = await c.req.json() as ApplyRequest
  const { claimId, patientId, analysisDate, approvedProposals } = body

  if (!claimId || !approvedProposals?.length) {
    return c.json({ error: 'claimId and approvedProposals are required' }, 400)
  }

  const results: ApplyResult['applied'] = []
  const updatedResources = new Set<string>()

  // Fetch current claim
  let claim: any
  try {
    claim = await fhirGet(`Claim/${claimId}`)
  } catch {
    return c.json({ error: `Claim ${claimId} nicht gefunden` }, 404)
  }

  let claimModified = false

  // Cache for Procedure resources (fetch once, modify in-place, write back at the end)
  const procedureCache = new Map<string, any>()

  async function getOrFetchProcedure(procId: string): Promise<any> {
    if (procedureCache.has(procId)) return procedureCache.get(procId)
    const proc = await fhirGet(`Procedure/${procId}`)
    procedureCache.set(procId, proc)
    return proc
  }

  // Find Procedure for this patient + date if no procedureId given
  async function findProcedureForDate(): Promise<any | null> {
    if (!patientId || !analysisDate) return null
    try {
      const bundle = await fhirGet(
        `Procedure?subject=Patient/${patientId}&date=${analysisDate}&_count=1`
      )
      const proc = bundle.entry?.[0]?.resource
      if (proc) procedureCache.set(proc.id, proc)
      return proc ?? null
    } catch { return null }
  }

  for (const proposal of approvedProposals) {
    try {
      // ── Billing changes → patch Claim ──
      if (proposal.billingChange) {
        const bc = proposal.billingChange

        switch (bc.type) {
          case 'add_code': {
            const newItem: any = {
              sequence: (claim.item?.length ?? 0) + 1,
              productOrService: {
                coding: [{ system: systemToUrl(bc.system), code: bc.code, display: bc.description || bc.code }],
              },
              quantity: { value: 1 },
            }
            if (bc.teeth?.length) {
              newItem.bodySite = {
                coding: [{ system: 'https://mira.cognovis.de/fhir/CodeSystem/fdi-tooth-number', code: String(bc.teeth[0]) }],
              }
            }
            if (bc.session != null) {
              newItem.extension = [{ url: 'https://mira.cognovis.de/fhir/StructureDefinition/treatment-session', valueInteger: bc.session }]
            }
            if (!claim.item) claim.item = []
            claim.item.push(newItem)
            claimModified = true
            results.push({ id: proposal.id, status: 'ok', message: `${bc.system} ${bc.code} hinzugefügt`, resource: `Claim/${claimId}` })
            break
          }

          case 'remove_code': {
            const idx = bc.existingItemIndex
            if (idx != null && claim.item?.[idx]) {
              claim.item.splice(idx, 1)
              claim.item.forEach((item: any, i: number) => { item.sequence = i + 1 })
              claimModified = true
              results.push({ id: proposal.id, status: 'ok', message: `${bc.system} ${bc.code} entfernt (Pos. ${idx + 1})`, resource: `Claim/${claimId}` })
            } else {
              results.push({ id: proposal.id, status: 'error', message: `Position ${idx ?? '?'} nicht gefunden` })
            }
            break
          }

          case 'update_multiplier': {
            const item = claim.item?.find((it: any) => it.productOrService?.coding?.[0]?.code === bc.code)
            if (item) {
              if (!item.extension) item.extension = []
              const ext = item.extension.find((e: any) => e.url?.includes('multiplier'))
              if (ext) { ext.valueDecimal = bc.newMultiplier }
              else { item.extension.push({ url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-multiplier', valueDecimal: bc.newMultiplier }) }
              claimModified = true
              results.push({ id: proposal.id, status: 'ok', message: `${bc.system} ${bc.code}: Faktor ${bc.currentMultiplier}→${bc.newMultiplier}`, resource: `Claim/${claimId}` })
            } else {
              results.push({ id: proposal.id, status: 'error', message: `Code ${bc.code} nicht in Rechnung` })
            }
            break
          }

          default:
            results.push({ id: proposal.id, status: 'error', message: `Unbekannter Typ: ${bc.type}` })
        }
      }

      // ── Documentation changes → patch Procedure/Claim ──
      if (proposal.documentationChange) {
        // If this proposal already added the SAME code via billingChange, skip the Claim addition
        // to avoid double-adding. Only skip when both sides reference the exact same code+system.
        const bc = proposal.billingChange
        const dc = proposal.documentationChange
        const skipUnbilledAdd = bc?.type === 'add_code'
          && dc.type === 'flag_unbilled_service'
          && bc.code === dc.code
          && bc.system === dc.system

        switch (dc.type) {
          case 'flag_unbilled_service': {
            // Documented service not billed → add to Claim (unless billingChange already did it)
            if (skipUnbilledAdd) {
              results.push({ id: proposal.id, status: 'ok', message: `${dc.system} ${dc.code}: Abrechnung bereits durch billingChange ergänzt`, resource: `Claim/${claimId}` })
              break
            }
            if (dc.code && dc.system) {
              const newItem: any = {
                sequence: (claim.item?.length ?? 0) + 1,
                productOrService: {
                  coding: [{ system: systemToUrl(dc.system), code: dc.code, display: `${dc.code} (nachträglich hinzugefügt)` }],
                },
                quantity: { value: 1 },
              }
              if (!claim.item) claim.item = []
              claim.item.push(newItem)
              claimModified = true
              results.push({ id: proposal.id, status: 'ok', message: `${dc.system} ${dc.code} zur Rechnung hinzugefügt (war dokumentiert, nicht abgerechnet)`, resource: `Claim/${claimId}` })
            } else {
              results.push({ id: proposal.id, status: 'ok', message: `Hinweis: nicht abgerechnete Leistung vermerkt` })
            }
            break
          }

          case 'flag_missing_documentation': {
            // Billed but not documented → add documentation note to Procedure
            const proc = dc.procedureId
              ? await getOrFetchProcedure(dc.procedureId)
              : await findProcedureForDate()

            if (proc) {
              if (!proc.note) proc.note = []
              proc.note.push({
                text: `[Billing Coach ${new Date().toISOString().split('T')[0]}] Dokumentationslücke: ${dc.system} ${dc.code} abgerechnet, Dokumentation ergänzt. ${dc.reason}`,
              })
              procedureCache.set(proc.id, proc)
              results.push({ id: proposal.id, status: 'ok', message: `Dokumentationshinweis zu Procedure/${proc.id} hinzugefügt`, resource: `Procedure/${proc.id}` })
            } else {
              results.push({ id: proposal.id, status: 'ok', message: `Hinweis: fehlende Dokumentation für ${dc.system} ${dc.code} vermerkt (kein Procedure gefunden)` })
            }
            break
          }

          case 'add_field':
          case 'update_field': {
            // Add/update a documentation field → add as note or extension on Procedure
            const proc = dc.procedureId
              ? await getOrFetchProcedure(dc.procedureId)
              : await findProcedureForDate()

            if (proc) {
              if (!proc.note) proc.note = []

              const fieldNote = dc.suggestedValue
                ? `[Billing Coach] ${dc.fieldLabel || dc.fieldId}: ${dc.suggestedValue}`
                : `[Billing Coach] ${dc.fieldLabel || dc.fieldId}: (Wert ergänzen)`

              proc.note.push({ text: fieldNote })
              procedureCache.set(proc.id, proc)
              results.push({ id: proposal.id, status: 'ok', message: `Feld "${dc.fieldLabel || dc.fieldId}" zu Procedure/${proc.id} hinzugefügt`, resource: `Procedure/${proc.id}` })
            } else {
              results.push({ id: proposal.id, status: 'ok', message: `Dokumentationsfeld "${dc.fieldLabel || dc.fieldId}" vermerkt (kein Procedure gefunden)` })
            }
            break
          }

          default:
            results.push({ id: proposal.id, status: 'error', message: `Unbekannter Dokumentationstyp: ${dc.type}` })
        }
      }
    } catch (err) {
      results.push({ id: proposal.id, status: 'error', message: (err as Error).message })
    }
  }

  // Write back modified Claim
  if (claimModified) {
    try {
      await fhirPut(`Claim/${claimId}`, claim)
      updatedResources.add(`Claim/${claimId}`)
    } catch (err) {
      return c.json({ error: `Claim-Update fehlgeschlagen: ${(err as Error).message}`, applied: results, updatedResources: [] }, 500)
    }
  }

  // Write back modified Procedures
  for (const [procId, proc] of procedureCache) {
    try {
      await fhirPut(`Procedure/${procId}`, proc)
      updatedResources.add(`Procedure/${procId}`)
    } catch (err) {
      results.push({ id: `proc-${procId}`, status: 'error', message: `Procedure/${procId} Update fehlgeschlagen: ${(err as Error).message}` })
    }
  }

  return c.json({ applied: results, updatedResources: [...updatedResources] })
})

export { applyRoutes }
