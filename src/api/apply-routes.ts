import { Hono } from 'hono'
import { aidboxConfig } from '../lib/config'
import type { BillingChange, DocumentationChange } from '../agent/report-schema'

const applyRoutes = new Hono()

interface ApplyRequest {
  claimId: string
  patientId: string
  approvedProposals: Array<{
    id: string
    billingChange?: BillingChange
    documentationChange?: DocumentationChange
  }>
}

interface ApplyResult {
  applied: Array<{ id: string; status: 'ok' | 'error'; message: string }>
  updatedClaimId: string | null
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
    headers: {
      Authorization: aidboxConfig.authHeader,
      'Content-Type': 'application/fhir+json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`FHIR PUT ${path}: ${res.status}`)
  return res.json()
}

applyRoutes.post('/apply', async (c) => {
  const body = await c.req.json() as ApplyRequest
  const { claimId, patientId, approvedProposals } = body

  if (!claimId || !approvedProposals?.length) {
    return c.json({ error: 'claimId and approvedProposals are required' }, 400)
  }

  const results: ApplyResult['applied'] = []

  // Fetch current claim
  let claim: any
  try {
    claim = await fhirGet(`Claim/${claimId}`)
  } catch (err) {
    return c.json({ error: `Claim ${claimId} nicht gefunden` }, 404)
  }

  let claimModified = false

  for (const proposal of approvedProposals) {
    try {
      if (proposal.billingChange) {
        const change = proposal.billingChange

        switch (change.type) {
          case 'add_code': {
            const systemUrl = change.system === 'GOZ'
              ? 'http://fhir.de/CodeSystem/goz'
              : change.system === 'BEMA'
              ? 'http://fhir.de/CodeSystem/bema'
              : 'http://fhir.de/CodeSystem/goae'

            const newItem: any = {
              sequence: (claim.item?.length ?? 0) + 1,
              productOrService: {
                coding: [{ system: systemUrl, code: change.code, display: change.description || change.code }],
              },
              quantity: { value: 1 },
            }

            if (change.teeth?.length) {
              newItem.bodySite = {
                coding: [{ system: 'https://mira.cognovis.de/fhir/CodeSystem/fdi-tooth-number', code: String(change.teeth[0]) }],
              }
            }

            if (!claim.item) claim.item = []
            claim.item.push(newItem)
            claimModified = true
            results.push({ id: proposal.id, status: 'ok', message: `${change.system} ${change.code} hinzugefügt` })
            break
          }

          case 'remove_code': {
            const idx = change.existingItemIndex
            if (idx !== undefined && idx !== null && claim.item?.[idx]) {
              claim.item.splice(idx, 1)
              // Re-sequence
              claim.item.forEach((item: any, i: number) => { item.sequence = i + 1 })
              claimModified = true
              results.push({ id: proposal.id, status: 'ok', message: `${change.system} ${change.code} entfernt (Position ${idx + 1})` })
            } else {
              results.push({ id: proposal.id, status: 'error', message: `Position ${(idx ?? '?')} nicht gefunden` })
            }
            break
          }

          case 'update_multiplier': {
            // Find matching item and update factor extension or display
            const item = claim.item?.find((it: any) =>
              it.productOrService?.coding?.[0]?.code === change.code
            )
            if (item) {
              // Store multiplier in extension
              if (!item.extension) item.extension = []
              const multExt = item.extension.find((e: any) => e.url?.includes('multiplier'))
              if (multExt) {
                multExt.valueDecimal = change.newMultiplier
              } else {
                item.extension.push({
                  url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-multiplier',
                  valueDecimal: change.newMultiplier,
                })
              }
              claimModified = true
              results.push({ id: proposal.id, status: 'ok', message: `${change.system} ${change.code}: Faktor ${change.currentMultiplier}→${change.newMultiplier}` })
            } else {
              results.push({ id: proposal.id, status: 'error', message: `Code ${change.code} nicht in Rechnung gefunden` })
            }
            break
          }

          default:
            results.push({ id: proposal.id, status: 'error', message: `Unbekannter Änderungstyp: ${change.type}` })
        }
      }

      if (proposal.documentationChange) {
        const change = proposal.documentationChange

        switch (change.type) {
          case 'flag_unbilled_service':
            // This is handled as an add_code billing change — just acknowledge
            results.push({ id: proposal.id, status: 'ok', message: `Hinweis: ${change.system} ${change.code} als nicht abgerechnet markiert` })
            break

          case 'flag_missing_documentation':
            results.push({ id: proposal.id, status: 'ok', message: `Hinweis: Dokumentation für ${change.system} ${change.code} fehlt` })
            break

          case 'add_field':
          case 'update_field':
            // Documentation changes would update a Procedure or create a DocumentReference
            // For now, acknowledge
            results.push({ id: proposal.id, status: 'ok', message: `Dokumentationsfeld ${change.fieldLabel || change.fieldId} vermerkt` })
            break

          default:
            results.push({ id: proposal.id, status: 'error', message: `Unbekannter Dokumentationstyp: ${change.type}` })
        }
      }
    } catch (err) {
      results.push({ id: proposal.id, status: 'error', message: (err as Error).message })
    }
  }

  // Write back modified claim
  let updatedClaimId: string | null = null
  if (claimModified) {
    try {
      const updated = await fhirPut(`Claim/${claimId}`, claim)
      updatedClaimId = updated.id ?? claimId
    } catch (err) {
      return c.json({
        error: `Claim-Update fehlgeschlagen: ${(err as Error).message}`,
        applied: results,
        updatedClaimId: null,
      }, 500)
    }
  }

  return c.json({ applied: results, updatedClaimId })
})

export { applyRoutes }
