/**
 * AidboxClient — typed FHIR client for Aidbox access.
 *
 * Encapsulates all HTTP calls to the Aidbox FHIR API.
 * Uses aidboxConfig as the single source of truth for base URL and auth.
 */

import { aidboxConfig } from '../lib/config'

// ---------------------------------------------------------------------------
// FHIR resource types (minimal, extend as needed)
// ---------------------------------------------------------------------------

export interface FHIRCoding {
  system?: string
  code?: string
  display?: string
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[]
  text?: string
}

export interface FHIRHumanName {
  family?: string
  given?: string[]
  use?: string
}

export interface FHIRPatient {
  resourceType: 'Patient'
  id?: string
  name?: FHIRHumanName[]
  birthDate?: string
  gender?: string
  [key: string]: unknown
}

export interface FHIRExtension {
  url?: string
  valueString?: string
  valueInteger?: number
  valueDecimal?: number
  valueBoolean?: boolean
  [key: string]: unknown
}

export interface FHIRObservation {
  resourceType: 'Observation'
  id?: string
  status?: string
  code?: FHIRCodeableConcept
  subject?: { reference?: string }
  bodySite?: FHIRCodeableConcept
  valueCodeableConcept?: FHIRCodeableConcept
  extension?: FHIRExtension[]
  [key: string]: unknown
}

export interface FHIRBundle<T = unknown> {
  resourceType: 'Bundle'
  total?: number
  entry?: Array<{ resource: T }>
}

// ---------------------------------------------------------------------------
// AidboxClient
// ---------------------------------------------------------------------------

export class AidboxClient {
  private readonly baseUrl: string
  private readonly authHeader: string

  constructor(baseUrl?: string, authHeader?: string) {
    this.baseUrl = (baseUrl ?? aidboxConfig.fhirBaseUrl).replace(/\/$/, '')
    this.authHeader = authHeader ?? aidboxConfig.authHeader
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
        ...(options?.headers ?? {}),
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)')
      throw new Error(`Aidbox ${options?.method ?? 'GET'} ${path} → ${res.status} ${res.statusText}: ${body}`)
    }

    return res.json() as Promise<T>
  }

  /**
   * Fetch a single Patient resource by ID.
   * Throws if not found (404) or any other non-2xx response.
   */
  async getPatient(id: string): Promise<FHIRPatient> {
    return this.request<FHIRPatient>(`/Patient/${id}`)
  }

  /**
   * Search Observation resources for a patient, optionally filtered by code.
   *
   * @param patientId  Patient FHIR ID (without "Patient/" prefix)
   * @param code  Optional LOINC code, e.g. 'http://loinc.org|8339-4'
   */
  async getObservations(patientId: string, code?: string): Promise<FHIRObservation[]> {
    const params = new URLSearchParams({
      subject: `Patient/${patientId}`,
      _count: '100',
    })
    if (code) {
      params.set('code', code)
    }
    const bundle = await this.request<FHIRBundle<FHIRObservation>>(`/Observation?${params}`)
    return (bundle.entry ?? []).map((e) => e.resource)
  }

  /**
   * Create a new FHIR resource.
   *
   * @param resourceType  e.g. 'Patient', 'Observation'
   * @param data  The resource body (without server-assigned id)
   */
  async createResource<T>(resourceType: string, data: T): Promise<T> {
    return this.request<T>(`/${resourceType}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Generic FHIR search returning the raw Bundle.
   *
   * @param resourceType  e.g. 'ChargeItemDefinition'
   * @param params  Query parameters as a plain object
   */
  async searchResources(resourceType: string, params: Record<string, string>): Promise<FHIRBundle> {
    const qs = new URLSearchParams(params).toString()
    const path = qs ? `/${resourceType}?${qs}` : `/${resourceType}`
    return this.request<FHIRBundle>(path)
  }
}

/** Singleton client — use this in route handlers */
export const aidboxClient = new AidboxClient()
