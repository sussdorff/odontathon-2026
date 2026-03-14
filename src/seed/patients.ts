/**
 * Patient and Coverage seed data.
 * 10 patients + 10 coverages = 20 FHIR resources.
 *
 * Birthdates computed relative to reference date 2026-03-14.
 */
import { EXT_DENTAL, EXT_PFLEGE } from '../lib/fhir-extensions.js'

type FhirResource = Record<string, unknown>

/** Compute birthdate string "YYYY-MM-DD" given age in years relative to 2026-03-14 */
function birthdate(age: number): string {
  return `${2026 - age}-03-14`
}

const GKV_VERSICHERUNGSART = {
  system: 'http://fhir.de/ValueSet/versicherungsart-de-basis',
  code: 'GKV',
  display: 'gesetzliche Krankenversicherung',
}

const PKV_VERSICHERUNGSART = {
  system: 'http://fhir.de/ValueSet/versicherungsart-de-basis',
  code: 'PKV',
  display: 'private Krankenversicherung',
}

function makeGkvCoverage(
  id: string,
  patientId: string,
  payorOrgId: string,
  versichertennummer: string,
  zeBonusProzent: number,
): FhirResource {
  const coverage: FhirResource = {
    resourceType: 'Coverage',
    id,
    status: 'active',
    type: {
      coding: [GKV_VERSICHERUNGSART],
    },
    beneficiary: { reference: `Patient/${patientId}` },
    payor: [{ reference: `Organization/${payorOrgId}` }],
    identifier: [
      {
        system: 'http://fhir.de/NamingSystem/gkv/kvid-10',
        value: versichertennummer,
      },
    ],
  }

  if (zeBonusProzent > 0) {
    coverage.extension = [
      {
        url: EXT_DENTAL.zeBonusProzent,
        valueInteger: zeBonusProzent,
      },
    ]
  }

  return coverage
}

function makePkvCoverage(
  id: string,
  patientId: string,
  payorOrgId: string,
  versichertennummer: string,
): FhirResource {
  return {
    resourceType: 'Coverage',
    id,
    status: 'active',
    type: {
      coding: [PKV_VERSICHERUNGSART],
    },
    beneficiary: { reference: `Patient/${patientId}` },
    payor: [{ reference: `Organization/${payorOrgId}` }],
    identifier: [
      {
        system: 'http://fhir.de/NamingSystem/pkv/pid',
        value: versichertennummer,
      },
    ],
  }
}

// ─── Patients ────────────────────────────────────────────────────────────────

export const patientMuellerAnna: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-mueller-anna',
  name: [{ use: 'official', family: 'Müller', given: ['Anna'] }],
  gender: 'female',
  birthDate: birthdate(28),
}

export const patientSchmidtKlaus: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-schmidt-klaus',
  name: [{ use: 'official', family: 'Schmidt', given: ['Klaus'] }],
  gender: 'male',
  birthDate: birthdate(35),
}

export const patientWagnerPetra: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-wagner-petra',
  name: [{ use: 'official', family: 'Wagner', given: ['Petra'] }],
  gender: 'female',
  birthDate: birthdate(52),
}

export const patientBeckerHans: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-becker-hans',
  name: [{ use: 'official', family: 'Becker', given: ['Hans-Jürgen'] }],
  gender: 'male',
  birthDate: birthdate(63),
}

export const patientFischerMonika: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-fischer-monika',
  name: [{ use: 'official', family: 'Fischer', given: ['Monika'] }],
  gender: 'female',
  birthDate: birthdate(71),
  extension: [
    {
      url: EXT_PFLEGE.pflegegradStatus,
      extension: [
        { url: EXT_PFLEGE.pflegegradLevel, valueInteger: 3 },
        { url: EXT_PFLEGE.eingliederungshilfe, valueBoolean: false },
        { url: EXT_PFLEGE.bescheidDatum, valueDate: '2025-06-15' },
      ],
    },
  ],
}

export const patientYilmazMehmet: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-yilmaz-mehmet',
  name: [{ use: 'official', family: 'Yılmaz', given: ['Mehmet'] }],
  gender: 'male',
  birthDate: birthdate(42),
}

export const patientBraunSophie: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-braun-sophie',
  name: [{ use: 'official', family: 'Braun', given: ['Sophie'] }],
  gender: 'female',
  birthDate: birthdate(25),
}

export const patientSchulzWolfgang: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-schulz-wolfgang',
  name: [{ use: 'official', family: 'Schulz', given: ['Wolfgang'] }],
  gender: 'male',
  birthDate: birthdate(58),
}

export const patientAlHassanFatima: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-al-hassan-fatima',
  name: [{ use: 'official', family: 'Al-Hassan', given: ['Fatima'] }],
  gender: 'female',
  birthDate: birthdate(33),
}

export const patientHoffmannRainer: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-hoffmann-rainer',
  name: [{ use: 'official', family: 'Hoffmann', given: ['Rainer'] }],
  gender: 'male',
  birthDate: birthdate(67),
  extension: [
    {
      url: EXT_PFLEGE.pflegegradStatus,
      extension: [
        { url: EXT_PFLEGE.pflegegradLevel, valueInteger: 2 },
        { url: EXT_PFLEGE.eingliederungshilfe, valueBoolean: false },
        { url: EXT_PFLEGE.bescheidDatum, valueDate: '2025-09-20' },
        { url: EXT_PFLEGE.befristungBis, valueDate: '2027-09-19' },
      ],
    },
  ],
}

export const patientKleinGerda: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-klein-gerda',
  name: [{ use: 'official', family: 'Klein', given: ['Gerda'] }],
  gender: 'female',
  birthDate: birthdate(68),
  extension: [
    {
      url: EXT_PFLEGE.pflegegradStatus,
      extension: [
        { url: EXT_PFLEGE.eingliederungshilfe, valueBoolean: true },
        { url: EXT_PFLEGE.bescheidDatum, valueDate: '2023-03-01' },
      ],
    },
  ],
}

export const patientRichterErika: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-richter-erika',
  name: [{ use: 'official', family: 'Richter', given: ['Erika'] }],
  gender: 'female',
  birthDate: birthdate(65),
}

export const patientBergLukas: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-berg-lukas',
  name: [{ use: 'official', family: 'Berg', given: ['Lukas'] }],
  gender: 'male',
  birthDate: birthdate(22),
}

export const patientVogelHildegard: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-vogel-hildegard',
  name: [{ use: 'official', family: 'Vogel', given: ['Hildegard'] }],
  gender: 'female',
  birthDate: birthdate(72),
  extension: [
    {
      url: EXT_PFLEGE.pflegegradStatus,
      extension: [
        { url: EXT_PFLEGE.pflegegradLevel, valueInteger: 4 },
        { url: EXT_PFLEGE.eingliederungshilfe, valueBoolean: false },
        { url: EXT_PFLEGE.bescheidDatum, valueDate: '2024-11-01' },
      ],
    },
  ],
}

export const patientWeberStefan: FhirResource = {
  resourceType: 'Patient',
  id: 'patient-weber-stefan',
  name: [{ use: 'official', family: 'Weber', given: ['Stefan'] }],
  gender: 'male',
  birthDate: birthdate(48),
}

// ─── Coverages ───────────────────────────────────────────────────────────────

export const coverageMuellerAnna = makeGkvCoverage(
  'coverage-mueller-anna',
  'patient-mueller-anna',
  'org-tk',
  'A100000001',
  0,
)

export const coverageSchmidtKlaus = makeGkvCoverage(
  'coverage-schmidt-klaus',
  'patient-schmidt-klaus',
  'org-aok-nordost',
  'A100000002',
  60,
)

export const coverageWagnerPetra = makeGkvCoverage(
  'coverage-wagner-petra',
  'patient-wagner-petra',
  'org-barmer',
  'A100000003',
  70,
)

export const coverageBeckerHans = makeGkvCoverage(
  'coverage-becker-hans',
  'patient-becker-hans',
  'org-aok-nordost',
  'A100000004',
  70,
)

export const coverageFischerMonika = makeGkvCoverage(
  'coverage-fischer-monika',
  'patient-fischer-monika',
  'org-tk',
  'A100000005',
  70,
)

export const coverageYilmazMehmet = makeGkvCoverage(
  'coverage-yilmaz-mehmet',
  'patient-yilmaz-mehmet',
  'org-aok-nordost',
  'A100000006',
  60,
)

export const coverageBraunSophie = makeGkvCoverage(
  'coverage-braun-sophie',
  'patient-braun-sophie',
  'org-barmer',
  'A100000007',
  0,
)

export const coverageSchulzWolfgang = makePkvCoverage(
  'coverage-schulz-wolfgang',
  'patient-schulz-wolfgang',
  'org-signal-iduna',
  'PKV2026-0001',
)

export const coverageAlHassanFatima = makeGkvCoverage(
  'coverage-al-hassan-fatima',
  'patient-al-hassan-fatima',
  'org-tk',
  'A100000009',
  60,
)

export const coverageHoffmannRainer = makePkvCoverage(
  'coverage-hoffmann-rainer',
  'patient-hoffmann-rainer',
  'org-signal-iduna',
  'PKV2026-0002',
)

export const coverageKleinGerda = makeGkvCoverage(
  'coverage-klein-gerda',
  'patient-klein-gerda',
  'org-aok-nordost',
  'A100000011',
  0,
)

export const coverageRichterErika = makeGkvCoverage(
  'coverage-richter-erika',
  'patient-richter-erika',
  'org-barmer',
  'A100000012',
  70,
)

export const coverageBergLukas = makeGkvCoverage(
  'coverage-berg-lukas',
  'patient-berg-lukas',
  'org-tk',
  'A100000013',
  0,
)

export const coverageVogelHildegard = makeGkvCoverage(
  'coverage-vogel-hildegard',
  'patient-vogel-hildegard',
  'org-aok-nordost',
  'A100000014',
  0,
)

export const coverageWeberStefan = makePkvCoverage(
  'coverage-weber-stefan',
  'patient-weber-stefan',
  'org-signal-iduna',
  'PKV2026-0003',
)

// ─── Pflegegrad Conditions ───────────────────────────────────────────────────
// Condition resources document the care needs — queryable by the billing engine

const PFLEGEGRAD_SYSTEM = 'https://mira.cognovis.de/fhir/CodeSystem/pflegegrad'

function makePflegegradCondition(
  patientId: string,
  pflegegrad: number,
  recordedDate: string,
): FhirResource {
  return {
    resourceType: 'Condition',
    id: `cond-${patientId}-pflegegrad`,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: PFLEGEGRAD_SYSTEM,
          code: `${pflegegrad}`,
          display: `Pflegegrad ${pflegegrad}`,
        },
      ],
      text: `Pflegegrad ${pflegegrad} nach §15 SGB XI`,
    },
    subject: { reference: `Patient/${patientId}` },
    recordedDate,
  }
}

function makeEingliederungshilfeCondition(
  patientId: string,
  recordedDate: string,
): FhirResource {
  return {
    resourceType: 'Condition',
    id: `cond-${patientId}-eingliederungshilfe`,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
          code: 'Z73.9',
          display: 'Probleme verbunden mit Schwierigkeiten bei der Lebensbewältigung',
        },
      ],
      text: 'Eingliederungshilfe nach §53 SGB XII',
    },
    subject: { reference: `Patient/${patientId}` },
    recordedDate,
  }
}

export const pflegegradConditions: FhirResource[] = [
  makePflegegradCondition('patient-fischer-monika', 3, '2025-06-15'),
  makePflegegradCondition('patient-vogel-hildegard', 4, '2024-11-01'),
  makePflegegradCondition('patient-hoffmann-rainer', 2, '2025-09-20'),
  makeEingliederungshilfeCondition('patient-klein-gerda', '2023-03-01'),
]

// ─── Export ──────────────────────────────────────────────────────────────────

export const patients: FhirResource[] = [
  patientMuellerAnna,
  patientSchmidtKlaus,
  patientWagnerPetra,
  patientBeckerHans,
  patientFischerMonika,
  patientYilmazMehmet,
  patientBraunSophie,
  patientSchulzWolfgang,
  patientAlHassanFatima,
  patientHoffmannRainer,
  patientKleinGerda,
  patientRichterErika,
  patientBergLukas,
  patientVogelHildegard,
  patientWeberStefan,
]

export const coverages: FhirResource[] = [
  coverageMuellerAnna,
  coverageSchmidtKlaus,
  coverageWagnerPetra,
  coverageBeckerHans,
  coverageFischerMonika,
  coverageYilmazMehmet,
  coverageBraunSophie,
  coverageSchulzWolfgang,
  coverageAlHassanFatima,
  coverageHoffmannRainer,
  coverageKleinGerda,
  coverageRichterErika,
  coverageBergLukas,
  coverageVogelHildegard,
  coverageWeberStefan,
]
