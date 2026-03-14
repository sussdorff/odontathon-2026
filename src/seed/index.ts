/**
 * Builds the complete practice transaction Bundle.
 * Order: Organizations → Practitioners → PractitionerRoles → Location → Patients → Coverages → Observations
 */
import { practiceResources } from './practice.js'
import { patients, coverages, pflegegradConditions } from './patients.js'
import { dentalFindings } from './dental-findings.js'
import { pastInvoices, pastInvoicesByType } from './past-invoices.js'

type FhirResource = Record<string, unknown>

interface BundleEntry {
  fullUrl: string
  resource: FhirResource
  request: {
    method: 'PUT'
    url: string
  }
}

function toEntry(resource: FhirResource): BundleEntry {
  const resourceType = resource.resourceType as string
  const id = resource.id as string
  return {
    fullUrl: `urn:uuid:${id}`,
    resource,
    request: {
      method: 'PUT',
      url: `${resourceType}/${id}`,
    },
  }
}

export function buildPracticeBundle(): Record<string, unknown> {
  const allResources: FhirResource[] = [
    ...practiceResources,
    ...patients,
    ...coverages,
    ...pflegegradConditions,
    ...dentalFindings,
    ...pastInvoices,
  ]

  const entries = allResources.map(toEntry)

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  }
}

export { practiceResources, patients, coverages, pflegegradConditions, dentalFindings, pastInvoices, pastInvoicesByType }
