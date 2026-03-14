/**
 * Zahnbefunde (tooth findings) as FHIR Observations.
 * One Observation per non-healthy tooth.
 *
 * Consistency rules (enforced in buildFinding):
 * - Missing tooth (absent) → no filling or crown on same tooth (enforced structurally: absent is terminal)
 * - All Observations use LOINC 8339-4 "Tooth identification"
 * - FDI tooth number in bodySite
 * - Tooth status in valueCodeableConcept
 */
import { EXT_DENTAL, CODE_SYSTEMS_DENTAL } from '../lib/fhir-extensions.js'

type FhirResource = Record<string, unknown>

const LOINC_TOOTH_ID = {
  system: 'http://loinc.org',
  code: '8339-4',
  display: 'Tooth identification',
}

const EFFECTIVE_DATE = '2026-01-15'
const PERFORMER_REF = { reference: 'Practitioner/prac-weber' }
const SNOMED_MOLAR_PLACEHOLDER = '38671000'

type ToothStatus =
  | 'absent'
  | 'crown-intact'
  | 'crown-needs-renewal'
  | 'replaced-bridge'
  | 'replaced-needs-renewal'
  | 'bridge-pontic'
  | 'implant'
  | 'implant-with-crown'
  | 'carious'
  | 'filled'

type Surface = 'M' | 'D' | 'O' | 'B' | 'L'

function buildFinding(
  patientSlug: string,
  patientId: string,
  toothNumber: number,
  status: ToothStatus,
  surfaces?: Surface[],
): FhirResource {
  const id = `obs-${patientSlug}-${toothNumber}`

  const bodySite: Record<string, unknown> = {
    coding: [
      {
        system: CODE_SYSTEMS_DENTAL.fdiTooth,
        code: String(toothNumber),
        display: `FDI ${toothNumber}`,
      },
      {
        system: 'http://snomed.info/sct',
        code: SNOMED_MOLAR_PLACEHOLDER,
        display: 'Tooth structure',
      },
    ],
  }

  const obs: FhirResource = {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: {
      coding: [LOINC_TOOTH_ID],
    },
    subject: { reference: `Patient/${patientId}` },
    performer: [PERFORMER_REF],
    effectiveDateTime: EFFECTIVE_DATE,
    bodySite,
    valueCodeableConcept: {
      coding: [
        {
          system: CODE_SYSTEMS_DENTAL.toothStatus,
          code: status,
        },
      ],
    },
  }

  if (surfaces && surfaces.length > 0) {
    obs.extension = [
      {
        url: EXT_DENTAL.toothSurfaces,
        valueString: surfaces.join(','),
      },
    ]
  }

  return obs
}

// ─── Patient 1: Anna Müller (28) ─────────────────────────────────────────────
// 8 Observations
const muellerAnna: FhirResource[] = [
  buildFinding('mueller-anna', 'patient-mueller-anna', 18, 'absent'),
  buildFinding('mueller-anna', 'patient-mueller-anna', 28, 'absent'),
  buildFinding('mueller-anna', 'patient-mueller-anna', 38, 'absent'),
  buildFinding('mueller-anna', 'patient-mueller-anna', 48, 'absent'),
  buildFinding('mueller-anna', 'patient-mueller-anna', 16, 'filled', ['O', 'D']),
  buildFinding('mueller-anna', 'patient-mueller-anna', 26, 'filled', ['O']),
  buildFinding('mueller-anna', 'patient-mueller-anna', 36, 'filled', ['M', 'O', 'D']),
  buildFinding('mueller-anna', 'patient-mueller-anna', 46, 'carious'),
]

// ─── Patient 2: Klaus Schmidt (35) ───────────────────────────────────────────
// 7 Observations
const schmidtKlaus: FhirResource[] = [
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 46, 'absent'),
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 36, 'crown-intact'),
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 16, 'filled', ['O', 'D']),
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 26, 'filled', ['O']),
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 14, 'filled', ['M', 'O']),
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 24, 'filled', ['D']),
  buildFinding('schmidt-klaus', 'patient-schmidt-klaus', 34, 'filled', ['O']),
]

// ─── Patient 3: Petra Wagner (52) ────────────────────────────────────────────
// 15 Observations: 36+46 absent, so no fillings there
const wagnerPetra: FhirResource[] = [
  buildFinding('wagner-petra', 'patient-wagner-petra', 36, 'absent'),
  buildFinding('wagner-petra', 'patient-wagner-petra', 46, 'absent'),
  buildFinding('wagner-petra', 'patient-wagner-petra', 16, 'crown-needs-renewal'),
  buildFinding('wagner-petra', 'patient-wagner-petra', 26, 'crown-needs-renewal'),
  buildFinding('wagner-petra', 'patient-wagner-petra', 47, 'crown-needs-renewal'),
  buildFinding('wagner-petra', 'patient-wagner-petra', 15, 'filled', ['M', 'O', 'D']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 25, 'filled', ['O', 'D']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 17, 'filled', ['O']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 27, 'filled', ['O']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 14, 'filled', ['M', 'O']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 24, 'filled', ['D']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 35, 'filled', ['O']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 45, 'filled', ['O']),
  buildFinding('wagner-petra', 'patient-wagner-petra', 13, 'carious'),
  buildFinding('wagner-petra', 'patient-wagner-petra', 23, 'carious'),
]

// ─── Patient 4: Hans-Jürgen Becker (63) ──────────────────────────────────────
// 16 Observations: 35,36,45,47 absent; 46 ix (implant replaces missing)
const beckerHans: FhirResource[] = [
  buildFinding('becker-hans', 'patient-becker-hans', 35, 'absent'),
  buildFinding('becker-hans', 'patient-becker-hans', 36, 'absent'),
  buildFinding('becker-hans', 'patient-becker-hans', 45, 'absent'),
  buildFinding('becker-hans', 'patient-becker-hans', 47, 'absent'),
  buildFinding('becker-hans', 'patient-becker-hans', 46, 'implant-with-crown'),
  buildFinding('becker-hans', 'patient-becker-hans', 16, 'crown-intact'),
  buildFinding('becker-hans', 'patient-becker-hans', 26, 'crown-intact'),
  buildFinding('becker-hans', 'patient-becker-hans', 37, 'crown-intact'),
  buildFinding('becker-hans', 'patient-becker-hans', 15, 'crown-needs-renewal'),
  buildFinding('becker-hans', 'patient-becker-hans', 14, 'filled', ['M', 'O']),
  buildFinding('becker-hans', 'patient-becker-hans', 24, 'filled', ['O', 'D']),
  buildFinding('becker-hans', 'patient-becker-hans', 34, 'filled', ['O']),
  buildFinding('becker-hans', 'patient-becker-hans', 44, 'filled', ['M', 'O']),
  buildFinding('becker-hans', 'patient-becker-hans', 25, 'filled', ['D']),
  buildFinding('becker-hans', 'patient-becker-hans', 17, 'filled', ['O']),
  buildFinding('becker-hans', 'patient-becker-hans', 13, 'carious'),
]

// ─── Patient 5: Monika Fischer (71) ──────────────────────────────────────────
// 17 Observations: 8 absent, 2 crown, 4 filled, 3 carious
const fischerMonika: FhirResource[] = [
  buildFinding('fischer-monika', 'patient-fischer-monika', 18, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 17, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 27, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 28, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 37, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 38, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 47, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 48, 'absent'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 16, 'crown-intact'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 26, 'crown-intact'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 15, 'filled', ['O', 'D']),
  buildFinding('fischer-monika', 'patient-fischer-monika', 14, 'filled', ['M', 'O']),
  buildFinding('fischer-monika', 'patient-fischer-monika', 25, 'filled', ['D']),
  buildFinding('fischer-monika', 'patient-fischer-monika', 24, 'filled', ['O']),
  buildFinding('fischer-monika', 'patient-fischer-monika', 13, 'carious'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 23, 'carious'),
  buildFinding('fischer-monika', 'patient-fischer-monika', 34, 'carious'),
]

// ─── Patient 6: Mehmet Yılmaz (42) ───────────────────────────────────────────
// 9 Observations: 1 absent (46), 2 crown, 6 filled
const yilmazMehmet: FhirResource[] = [
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 46, 'absent'),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 16, 'crown-intact'),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 36, 'crown-intact'),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 14, 'filled', ['M', 'O']),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 24, 'filled', ['D']),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 25, 'filled', ['O']),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 26, 'filled', ['O', 'D']),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 35, 'filled', ['M', 'O', 'D']),
  buildFinding('yilmaz-mehmet', 'patient-yilmaz-mehmet', 45, 'filled', ['O']),
]

// ─── Patient 7: Sophie Braun (25) ────────────────────────────────────────────
// 2 Observations (very healthy)
const braunSophie: FhirResource[] = [
  buildFinding('braun-sophie', 'patient-braun-sophie', 46, 'filled', ['O']),
  buildFinding('braun-sophie', 'patient-braun-sophie', 36, 'filled', ['O', 'D']),
]

// ─── Patient 8: Wolfgang Schulz (58, PKV) ────────────────────────────────────
// 17 Observations: 3 absent, 5 crown, 2 implant, 7 filled
const schulzWolfgang: FhirResource[] = [
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 18, 'absent'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 28, 'absent'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 48, 'absent'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 16, 'crown-intact'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 26, 'crown-intact'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 36, 'crown-intact'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 46, 'crown-intact'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 17, 'crown-intact'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 37, 'implant-with-crown'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 47, 'implant-with-crown'),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 15, 'filled', ['O', 'D']),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 25, 'filled', ['M', 'O', 'D']),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 14, 'filled', ['M', 'O']),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 24, 'filled', ['D']),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 34, 'filled', ['O']),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 44, 'filled', ['O']),
  buildFinding('schulz-wolfgang', 'patient-schulz-wolfgang', 35, 'filled', ['D']),
]

// ─── Patient 9: Fatima Al-Hassan (33) ────────────────────────────────────────
// 6 Observations: 1 crown, 4 filled, 1 carious
const alHassanFatima: FhirResource[] = [
  buildFinding('al-hassan-fatima', 'patient-al-hassan-fatima', 36, 'crown-intact'),
  buildFinding('al-hassan-fatima', 'patient-al-hassan-fatima', 16, 'filled', ['O']),
  buildFinding('al-hassan-fatima', 'patient-al-hassan-fatima', 26, 'filled', ['O', 'D']),
  buildFinding('al-hassan-fatima', 'patient-al-hassan-fatima', 14, 'filled', ['M', 'O']),
  buildFinding('al-hassan-fatima', 'patient-al-hassan-fatima', 24, 'filled', ['D']),
  buildFinding('al-hassan-fatima', 'patient-al-hassan-fatima', 46, 'carious'),
]

// ─── Patient 10: Rainer Hoffmann (67, PKV) ───────────────────────────────────
// 17 Observations: 6 absent, 2 crown, 1 kw, 1 implant, 5 filled, 2 carious
const hoffmannRainer: FhirResource[] = [
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 18, 'absent'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 28, 'absent'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 38, 'absent'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 48, 'absent'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 35, 'absent'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 36, 'absent'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 16, 'crown-intact'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 26, 'crown-intact'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 46, 'crown-needs-renewal'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 37, 'implant-with-crown'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 15, 'filled', ['M', 'O', 'D']),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 14, 'filled', ['O', 'D']),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 25, 'filled', ['O']),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 24, 'filled', ['D']),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 17, 'filled', ['O']),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 13, 'carious'),
  buildFinding('hoffmann-rainer', 'patient-hoffmann-rainer', 23, 'carious'),
]

// ─── Export ──────────────────────────────────────────────────────────────────

export const dentalFindings: FhirResource[] = [
  ...muellerAnna,
  ...schmidtKlaus,
  ...wagnerPetra,
  ...beckerHans,
  ...fischerMonika,
  ...yilmazMehmet,
  ...braunSophie,
  ...schulzWolfgang,
  ...alHassanFatima,
  ...hoffmannRainer,
]
