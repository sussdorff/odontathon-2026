/**
 * Behandlungsdokumentation Lukas Berg — Zahn 46 Sekundärkaries
 *
 * Klinische Geschichte:
 *   Patient kommt mit Beschwerden an Zahn 46 in die Praxis.
 *   Röntgenbild zeigt große bestehende Füllung mit Sekundärkaries.
 *   Vitalitätsprüfung positiv (Zahn vital).
 *   Infiltrationsanästhesie bukkal + lingual (1 Amp. Ultracain) +
 *   Leitungsanästhesie (1 Amp. Ultracain).
 *   Exkavation: alte Füllung entfernt, Karies exkaviert.
 *   Befund: Pulpa nicht eröffnet, aber freiliegend (pulpanah).
 *   Indirekte Überkappung (cp) mit Dycal.
 *   Kunststofffüllung in Mehrschicht- und Mehrfarbtechnik.
 *   Ausarbeitung nach gnathologischen Gesichtspunkten.
 *   Duraphat-Schutzlack.
 *   Nächster Termin: Kontrolle. Prognose positiv.
 *
 * FHIR resources: Encounter, Condition, 2× Observation, Claim
 */
import { CODE_SYSTEMS } from '../lib/fhir-extensions.js'

type FhirResource = Record<string, unknown>

const PATIENT_REF = { reference: 'Patient/patient-berg-lukas' }
const PRACTITIONER_REF = { reference: 'Practitioner/prac-weber' }
const ENCOUNTER_ID = 'enc-berg-lukas-2026-03-10'
const ENCOUNTER_REF = { reference: `Encounter/${ENCOUNTER_ID}` }
const VISIT_DATE = '2026-03-10'

const GOZ = CODE_SYSTEMS.goz
const GOAE = 'http://fhir.de/CodeSystem/goae'
const FDI = 'https://mira.cognovis.de/fhir/CodeSystem/fdi-tooth-number'
const TOOTH_SURFACE = 'https://mira.cognovis.de/fhir/CodeSystem/tooth-surface'

// ─── Encounter ──────────────────────────────────────────────────────────────

export const encounterBergLukas: FhirResource = {
  resourceType: 'Encounter',
  id: ENCOUNTER_ID,
  status: 'finished',
  class: {
    system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    code: 'AMB',
    display: 'ambulatory',
  },
  type: [
    {
      coding: [
        {
          system: 'https://mira.cognovis.de/fhir/CodeSystem/besuchs-setting',
          code: 'praxis',
          display: 'Behandlung in der Praxis',
        },
      ],
    },
  ],
  subject: PATIENT_REF,
  participant: [
    {
      individual: PRACTITIONER_REF,
    },
  ],
  period: {
    start: `${VISIT_DATE}T09:30:00+01:00`,
    end: `${VISIT_DATE}T10:15:00+01:00`,
  },
  reasonCode: [
    {
      text: 'Beschwerden Zahn 46',
    },
  ],
}

// ─── Condition: Sekundärkaries Zahn 46 ──────────────────────────────────────

export const conditionBergLukasSekundaerkaries: FhirResource = {
  resourceType: 'Condition',
  id: 'cond-berg-lukas-sekundaerkaries-46',
  clinicalStatus: {
    coding: [
      { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' },
    ],
  },
  verificationStatus: {
    coding: [
      { system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' },
    ],
  },
  category: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
          code: 'encounter-diagnosis',
        },
      ],
    },
  ],
  code: {
    coding: [
      {
        system: 'http://fhir.de/CodeSystem/bfarm/icd-10-gm',
        code: 'K02.1',
        display: 'Karies des Dentins',
      },
    ],
    text: 'Sekundärkaries unter bestehender Füllung Zahn 46',
  },
  bodySite: [
    {
      coding: [{ system: FDI, code: '46', display: 'FDI 46' }],
    },
  ],
  subject: PATIENT_REF,
  encounter: ENCOUNTER_REF,
  recordedDate: VISIT_DATE,
  note: [
    {
      text: 'Röntgenologisch Sekundärkaries unter bestehender großer Kompositfüllung sichtbar. '
        + 'Nach Exkavation: Pulpa nicht eröffnet, aber freiliegend (pulpanah). Prognose positiv.',
    },
  ],
}

// ─── Observation: Röntgenbefund ─────────────────────────────────────────────

export const obsBergLukasRoentgen: FhirResource = {
  resourceType: 'Observation',
  id: 'obs-berg-lukas-roentgen-46',
  status: 'final',
  category: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'imaging',
          display: 'Imaging',
        },
      ],
    },
  ],
  code: {
    coding: [
      {
        system: 'http://loinc.org',
        code: '38150-3',
        display: 'Dental X-ray',
      },
    ],
    text: 'Zahnfilm Zahn 46',
  },
  subject: PATIENT_REF,
  encounter: ENCOUNTER_REF,
  effectiveDateTime: VISIT_DATE,
  performer: [PRACTITIONER_REF],
  bodySite: {
    coding: [{ system: FDI, code: '46', display: 'FDI 46' }],
  },
  valueString: 'Große bestehende Kompositfüllung MOD. Sekundärkaries mesial und distal unter der Füllung sichtbar. '
    + 'Keine apikale Aufhellung. Parodontaler Spalt unauffällig.',
}

// ─── Observation: Vitalitätsprüfung ─────────────────────────────────────────

export const obsBergLukasVitalitaet: FhirResource = {
  resourceType: 'Observation',
  id: 'obs-berg-lukas-vitalitaet-46',
  status: 'final',
  category: [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'exam',
          display: 'Exam',
        },
      ],
    },
  ],
  code: {
    coding: [
      {
        system: 'http://loinc.org',
        code: '8339-4',
        display: 'Tooth identification',
      },
    ],
    text: 'Vitalitätsprüfung (Kältetest CO₂) Zahn 46',
  },
  subject: PATIENT_REF,
  encounter: ENCOUNTER_REF,
  effectiveDateTime: VISIT_DATE,
  performer: [PRACTITIONER_REF],
  bodySite: {
    coding: [{ system: FDI, code: '46', display: 'FDI 46' }],
  },
  valueCodeableConcept: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '64957009',
        display: 'Positive (qualifier value)',
      },
    ],
    text: 'Positiv — Zahn vital, verzögerte aber adäquate Reizantwort',
  },
}

// ─── Procedure: Behandlung ──────────────────────────────────────────────────

export const procedureBergLukas46: FhirResource = {
  resourceType: 'Procedure',
  id: 'proc-berg-lukas-fuellung-46',
  status: 'completed',
  category: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '274163004',
        display: 'Dental restoration (procedure)',
      },
    ],
  },
  code: {
    text: 'Exkavation Sekundärkaries, indirekte Überkappung (cp Dycal), '
      + 'Kompositfüllung MOD Mehrschicht-/Mehrfarbtechnik, '
      + 'gnathologische Ausarbeitung, Duraphat-Schutzlack',
  },
  subject: PATIENT_REF,
  encounter: ENCOUNTER_REF,
  performedDateTime: VISIT_DATE,
  performer: [{ actor: PRACTITIONER_REF }],
  bodySite: [
    {
      coding: [{ system: FDI, code: '46', display: 'FDI 46' }],
    },
  ],
  reasonReference: [{ reference: 'Condition/cond-berg-lukas-sekundaerkaries-46' }],
  note: [
    {
      text: 'Anästhesie: Infiltration bukkal + lingual (1 Amp. Ultracain) '
        + '+ Leitungsanästhesie (1 Amp. Ultracain). '
        + 'Alte Füllung entfernt, Karies vollständig exkaviert. '
        + 'Pulpa nicht eröffnet, aber freiliegend (pulpanah). '
        + 'Indirekte Überkappung mit Dycal (Calciumhydroxid). '
        + 'Kompositfüllung MOD in Mehrschicht- und Mehrfarbtechnik. '
        + 'Ausarbeitung nach gnathologischen Gesichtspunkten. '
        + 'Abschließend Duraphat-Schutzlack appliziert. '
        + 'Prognose positiv. Kontrolle beim nächsten Termin.',
    },
  ],
  usedCode: [
    { text: 'Ultracain D-S forte, 2 Ampullen' },
    { text: 'Dycal (Calciumhydroxid-Liner)' },
    { text: 'Komposit (Mehrfarbtechnik)' },
    { text: 'Duraphat Schutzlack (Natriumfluorid 2,26%)' },
  ],
  followUp: [
    { text: 'Kontrolle in 2–4 Wochen: Vitalitätsprüfung, Beschwerdefreiheit prüfen' },
  ],
}

// ─── Claim: GOZ-Abrechnung für die Sitzung ─────────────────────────────────
// Dies ist die erwartete Abrechnung, die der Billing-Agent validieren/vorschlagen soll.

export const claimBergLukas46: FhirResource = {
  resourceType: 'Claim',
  id: 'claim-berg-lukas-fuellung-46',
  status: 'active',
  type: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'oral', display: 'Oral' }],
  },
  use: 'claim',
  patient: PATIENT_REF,
  created: VISIT_DATE,
  provider: PRACTITIONER_REF,
  insurance: [{
    sequence: 1,
    focal: true,
    coverage: { reference: 'Coverage/coverage-berg-lukas' },
  }],
  priority: { coding: [{ code: 'normal' }] },
  diagnosis: [
    {
      sequence: 1,
      diagnosisReference: { reference: 'Condition/cond-berg-lukas-sekundaerkaries-46' },
    },
  ],
  item: [
    // 1. Eingehende Untersuchung
    {
      sequence: 1,
      productOrService: {
        coding: [{ system: GOZ, code: '0010', display: 'Eingehende Untersuchung' }],
      },
      quantity: { value: 1 },
    },
    // 2. Röntgendiagnostik — Zahnfilm
    {
      sequence: 2,
      productOrService: {
        coding: [{ system: GOAE, code: '5000', display: 'Zahnfilm' }],
      },
      bodySite: {
        coding: [{ system: FDI, code: '46' }],
      },
      quantity: { value: 1 },
    },
    // NOTE: GOZ 0070 (Vitalitätsprüfung) ist klinisch dokumentiert (Observation obs-berg-lukas-vitalitaet-46)
    // aber hier bewusst NICHT abgerechnet — der Billing-Agent soll erkennen, dass eine dokumentierte
    // Leistung nicht in der Abrechnung erscheint und darauf hinweisen.
    // 3. Infiltrationsanästhesie (bukkal + lingual, 1 Amp. Ultracain)
    {
      sequence: 3,
      productOrService: {
        coding: [{ system: GOZ, code: '0090', display: 'Infiltrationsanästhesie' }],
      },
      quantity: { value: 1 },
      extension: [
        {
          url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note',
          valueString: 'Bukkal + lingual, 1 Amp. Ultracain D-S forte',
        },
      ],
    },
    // 5. Leitungsanästhesie (1 Amp. Ultracain)
    {
      sequence: 4,
      productOrService: {
        coding: [{ system: GOZ, code: '0100', display: 'Leitungsanästhesie' }],
      },
      quantity: { value: 1 },
      extension: [
        {
          url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note',
          valueString: '1 Amp. Ultracain D-S forte',
        },
      ],
    },
    // 6. Indirekte Überkappung (cp) mit Dycal
    // NOTE: GOZ 2030 (Besondere Maßnahmen beim Präparieren) fehlt hier bewusst —
    // der Billing-Agent soll sie anhand der pastInvoices-Patterns erkennen und vorschlagen.
    {
      sequence: 5,
      productOrService: {
        coding: [{ system: GOZ, code: '2330', display: 'Indirekte Überkappung der Pulpa (cp)' }],
      },
      bodySite: {
        coding: [{ system: FDI, code: '46' }],
      },
      quantity: { value: 1 },
      extension: [
        {
          url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note',
          valueString: 'Material: Dycal (Calciumhydroxid)',
        },
      ],
    },
    // 6. Kompositfüllung dreiflächig MOD — Mehrschicht-/Mehrfarbtechnik
    {
      sequence: 6,
      productOrService: {
        coding: [{ system: GOZ, code: '2100', display: 'Kompositfüllung dreiflächig (dentin-/schmelzadhäsiv)' }],
      },
      bodySite: {
        coding: [{ system: FDI, code: '46' }],
      },
      subSite: [
        { coding: [{ system: TOOTH_SURFACE, code: 'M' }] },
        { coding: [{ system: TOOTH_SURFACE, code: 'O' }] },
        { coding: [{ system: TOOTH_SURFACE, code: 'D' }] },
      ],
      quantity: { value: 1 },
      extension: [
        {
          url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note',
          valueString: 'Mehrschicht- und Mehrfarbtechnik',
        },
      ],
    },
    // 7. Adhäsive Befestigung (Dentinadhäsiv)
    {
      sequence: 7,
      productOrService: {
        coding: [{ system: GOZ, code: '2197', display: 'Adhäsive Befestigung' }],
      },
      quantity: { value: 1 },
    },
    // 8. Funktionsprüfung / Ausarbeitung nach gnathologischen Gesichtspunkten
    {
      sequence: 8,
      productOrService: {
        coding: [{ system: GOZ, code: '8000', display: 'Funktionsanalytische Maßnahmen' }],
      },
      quantity: { value: 1 },
      extension: [
        {
          url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note',
          valueString: 'Ausarbeitung nach gnathologischen Gesichtspunkten, Okklusionskontrolle',
        },
      ],
    },
    // 9. Lokale Fluoridierung — Duraphat Schutzlack
    {
      sequence: 9,
      productOrService: {
        coding: [{ system: GOZ, code: '1020', display: 'Lokale Fluoridierung mit individuellem Löffel' }],
      },
      bodySite: {
        coding: [{ system: FDI, code: '46' }],
      },
      quantity: { value: 1 },
      extension: [
        {
          url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note',
          valueString: 'Duraphat Schutzlack (Natriumfluorid 2,26%)',
        },
      ],
    },
  ],
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const treatmentBergLukas: FhirResource[] = [
  encounterBergLukas,
  conditionBergLukasSekundaerkaries,
  obsBergLukasRoentgen,
  obsBergLukasVitalitaet,
  procedureBergLukas46,
  claimBergLukas46,
]
