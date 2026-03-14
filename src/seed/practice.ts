/**
 * Practice master data: Organizations, Practitioners, PractitionerRoles, Location.
 * 15 FHIR resources total.
 */

type FhirResource = Record<string, unknown>

const IK_SYSTEM = 'http://fhir.de/NamingSystem/arge-ik/iknr'
const LANR_SYSTEM = 'https://fhir.kbv.de/NamingSystem/KBV_NS_Base_ANR'
const SNOMED_SYSTEM = 'http://snomed.info/sct'

// ─── Organizations ───────────────────────────────────────────────────────────

export const orgPraxisWeberKoch: FhirResource = {
  resourceType: 'Organization',
  id: 'org-praxis-weber-koch',
  identifier: [
    {
      system: 'http://fhir.de/NamingSystem/bsnr',
      value: '720000001',
    },
  ],
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'prov',
          display: 'Healthcare Provider',
        },
      ],
    },
  ],
  name: 'Zahnarztpraxis Dr. Weber & Dr. Koch',
  address: [
    {
      line: ['Friedrichstraße 123'],
      city: 'Berlin',
      postalCode: '10117',
      country: 'DE',
    },
  ],
  partOf: {
    reference: 'Organization/org-kzv-berlin',
  },
}

export const orgKzvBerlin: FhirResource = {
  resourceType: 'Organization',
  id: 'org-kzv-berlin',
  identifier: [
    {
      system: 'https://mira.cognovis.de/fhir/NamingSystem/kzv-id',
      value: 'berlin',
    },
  ],
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'ins',
          display: 'Insurance Company',
        },
      ],
    },
  ],
  name: 'KZV Berlin',
}

export const orgAokNordost: FhirResource = {
  resourceType: 'Organization',
  id: 'org-aok-nordost',
  identifier: [
    {
      system: IK_SYSTEM,
      value: '109519005',
    },
  ],
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'ins',
        },
      ],
    },
  ],
  name: 'AOK Nordost',
}

export const orgTk: FhirResource = {
  resourceType: 'Organization',
  id: 'org-tk',
  identifier: [
    {
      system: IK_SYSTEM,
      value: '101575519',
    },
  ],
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'ins',
        },
      ],
    },
  ],
  name: 'TK Techniker Krankenkasse',
}

export const orgBarmer: FhirResource = {
  resourceType: 'Organization',
  id: 'org-barmer',
  identifier: [
    {
      system: IK_SYSTEM,
      value: '104940005',
    },
  ],
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'ins',
        },
      ],
    },
  ],
  name: 'Barmer',
}

export const orgSignalIduna: FhirResource = {
  resourceType: 'Organization',
  id: 'org-signal-iduna',
  identifier: [
    {
      system: IK_SYSTEM,
      value: '168140346',
    },
  ],
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'ins',
        },
      ],
    },
  ],
  name: 'Signal Iduna',
}

export const orgLaborMueller: FhirResource = {
  resourceType: 'Organization',
  id: 'org-labor-mueller',
  type: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: 'other',
          display: 'laboratory',
        },
      ],
    },
  ],
  name: 'Zahntechnik Müller GmbH',
}

// ─── Practitioners ───────────────────────────────────────────────────────────

export const pracWeber: FhirResource = {
  resourceType: 'Practitioner',
  id: 'prac-weber',
  identifier: [
    {
      system: LANR_SYSTEM,
      value: '123456789',
    },
    {
      system: 'http://fhir.de/NamingSystem/kzbv/zahnarztnummer',
      value: '98765',
    },
  ],
  name: [
    {
      use: 'official',
      family: 'Weber',
      given: ['Thomas'],
      prefix: ['Dr. med. dent.'],
    },
  ],
  gender: 'male',
}

export const pracKoch: FhirResource = {
  resourceType: 'Practitioner',
  id: 'prac-koch',
  identifier: [
    {
      system: LANR_SYSTEM,
      value: '987654321',
    },
    {
      system: 'http://fhir.de/NamingSystem/kzbv/zahnarztnummer',
      value: '12345',
    },
  ],
  name: [
    {
      use: 'official',
      family: 'Koch',
      given: ['Sarah'],
      prefix: ['Dr. med. dent.'],
    },
  ],
  gender: 'female',
}

// ─── PractitionerRoles ────────────────────────────────────────────────────────

export const roleWeber: FhirResource = {
  resourceType: 'PractitionerRole',
  id: 'role-weber',
  practitioner: { reference: 'Practitioner/prac-weber' },
  organization: { reference: 'Organization/org-praxis-weber-koch' },
  code: [
    {
      text: 'Vertragszahnarzt',
    },
  ],
  specialty: [
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '160274005',
          display: 'Dental practitioner',
        },
      ],
    },
  ],
}

export const roleKoch: FhirResource = {
  resourceType: 'PractitionerRole',
  id: 'role-koch',
  practitioner: { reference: 'Practitioner/prac-koch' },
  organization: { reference: 'Organization/org-praxis-weber-koch' },
  code: [
    {
      text: 'Vertragszahnarzt',
    },
  ],
  specialty: [
    {
      coding: [
        {
          system: SNOMED_SYSTEM,
          code: '160274005',
          display: 'Dental practitioner',
        },
      ],
    },
  ],
}

// ─── Location ─────────────────────────────────────────────────────────────────

export const locBehandlungszimmer1: FhirResource = {
  resourceType: 'Location',
  id: 'loc-behandlungszimmer-1',
  name: 'Behandlungszimmer 1',
  managingOrganization: { reference: 'Organization/org-praxis-weber-koch' },
  address: {
    line: ['Friedrichstraße 123'],
    city: 'Berlin',
    postalCode: '10117',
    country: 'DE',
  },
}

// ─── Export all ──────────────────────────────────────────────────────────────

export const practiceResources: FhirResource[] = [
  orgKzvBerlin,
  orgPraxisWeberKoch,
  orgAokNordost,
  orgTk,
  orgBarmer,
  orgSignalIduna,
  orgLaborMueller,
  pracWeber,
  pracKoch,
  roleWeber,
  roleKoch,
  locBehandlungszimmer1,
]
