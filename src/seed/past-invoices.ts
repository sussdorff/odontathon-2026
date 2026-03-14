/**
 * Past invoice seed data — fake Claims for pattern-based billing suggestions.
 *
 * The agent learns from these historical invoices which codes are commonly
 * billed together for a given treatment type, beyond what the rule engine knows.
 *
 * 3 treatment types × 10 invoices each = 30 Claims.
 *
 * Code systems:
 *   GOZ  = http://fhir.de/CodeSystem/goz
 *   BEMA = http://fhir.de/CodeSystem/bema  (Ä-codes are BEMA-embedded GOÄ)
 *   GOÄ  = http://fhir.de/CodeSystem/goae
 */
import { CODE_SYSTEMS, EXT_DENTAL } from '../lib/fhir-extensions.js'

type FhirResource = Record<string, unknown>

const GOZ = CODE_SYSTEMS.goz
const BEMA = 'http://fhir.de/CodeSystem/bema'
const GOAE = 'http://fhir.de/CodeSystem/goae'

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ClaimLineItem {
  code: string
  system: string
  display: string
  tooth?: number        // FDI tooth number
  quantity?: number     // default 1
  surfaces?: string     // e.g. "M,O,D"
  note?: string         // e.g. "Material: NiTi-Feilen"
  session?: number      // for multi-session treatments
}

let claimCounter = 0

function makeClaim(
  treatmentType: string,
  patientId: string,
  practitionerId: string,
  date: string,
  items: ClaimLineItem[],
): FhirResource {
  claimCounter++
  const id = `claim-${treatmentType}-${String(claimCounter).padStart(3, '0')}`

  return {
    resourceType: 'Claim',
    id,
    status: 'active',
    type: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'oral', display: 'Oral' }],
    },
    use: 'claim',
    patient: { reference: `Patient/${patientId}` },
    created: date,
    provider: { reference: `Practitioner/${practitionerId}` },
    insurance: [{
      sequence: 1,
      focal: true,
      coverage: { display: 'Versicherung (aus Patientenstammdaten)' },
    }],
    priority: { coding: [{ code: 'normal' }] },
    item: items.map((it, idx) => {
      const item: Record<string, unknown> = {
        sequence: idx + 1,
        productOrService: {
          coding: [{ system: it.system, code: it.code, display: it.display }],
        },
        quantity: { value: it.quantity ?? 1 },
      }
      // Tooth reference
      if (it.tooth) {
        item.bodySite = {
          coding: [{ system: 'https://mira.cognovis.de/fhir/CodeSystem/fdi-tooth-number', code: String(it.tooth) }],
        }
      }
      // Surfaces
      if (it.surfaces) {
        item.subSite = it.surfaces.split(',').map(s => ({
          coding: [{ system: 'https://mira.cognovis.de/fhir/CodeSystem/tooth-surface', code: s.trim() }],
        }))
      }
      // Session marker for multi-session treatments
      if (it.session) {
        item.extension = [{ url: 'https://mira.cognovis.de/fhir/StructureDefinition/treatment-session', valueInteger: it.session }]
      }
      // Notes (e.g. material) — stored as extension since Claim.item has no note field
      if (it.note) {
        const exts = (item.extension as Array<Record<string, unknown>>) ?? []
        exts.push({ url: 'https://mira.cognovis.de/fhir/StructureDefinition/billing-note', valueString: it.note })
        item.extension = exts
      }
      return item
    }),
  }
}

// ─── Code shorthand helpers ─────────────────────────────────────────────────

const goz = (code: string, display: string, opts?: Partial<ClaimLineItem>): ClaimLineItem =>
  ({ code, system: GOZ, display, ...opts })

const bema = (code: string, display: string, opts?: Partial<ClaimLineItem>): ClaimLineItem =>
  ({ code, system: BEMA, display, ...opts })

const goae = (code: string, display: string, opts?: Partial<ClaimLineItem>): ClaimLineItem =>
  ({ code, system: GOAE, display, ...opts })

// ─── Common positions (reusable) ────────────────────────────────────────────

const ae1 = bema('Ä 1', 'Beratung')
const ae5 = goae('5', 'Symptombezogene Untersuchung')
const untersuchung = goz('0010', 'Eingehende Untersuchung')
const vipr = goz('0070', 'Vitalitätsprüfung')
const infiltration = goz('0090', 'Infiltrationsanästhesie')
const infiltrationMat = goz('0090', 'Infiltrationsanästhesie — Material: Anästhetikum', { note: 'Material: Anästhetikum' })
const leitung = goz('0100', 'Leitungsanästhesie')
const leitungMat = goz('0100', 'Leitungsanästhesie — Material: Anästhetikum', { note: 'Material: Anästhetikum' })
const zahnfilm = goae('5000', 'Zahnfilm')
const opMikroskop = goz('0110', 'Zuschlag OP-Mikroskop')

// ─────────────────────────────────────────────────────────────────────────────
// 1. KOMPOSITFÜLLUNG (GOZ) — 10 Invoices
// ─────────────────────────────────────────────────────────────────────────────

const kompositInvoices: FhirResource[] = [
  // Invoice 1: Anna Müller, Zahn 16, 2-flächig MO — volle Untersuchung
  makeClaim('komposit', 'patient-mueller-anna', 'prac-weber', '2025-11-05', [
    untersuchung,
    ae1,
    vipr,
    zahnfilm,
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2030', 'Besondere Maßnahmen beim Präparieren', { tooth: 16 }),
    goz('2080', 'Kompositfüllung zweiflächig', { tooth: 16, surfaces: 'M,O' }),
  ]),

  // Invoice 2: Klaus Schmidt, Zahn 36, 3-flächig MOD — Leitungsanästhesie UK
  makeClaim('komposit', 'patient-schmidt-klaus', 'prac-weber', '2025-10-18', [
    untersuchung,
    ae1,
    vipr,
    zahnfilm,
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2030', 'Besondere Maßnahmen beim Präparieren', { tooth: 36 }),
    goz('2100', 'Kompositfüllung dreiflächig', { tooth: 36, surfaces: 'M,O,D' }),
  ]),

  // Invoice 3: Petra Wagner, Zahn 24, 1-flächig O — keine volle Untersuchung, nur Ä1+Ä5
  makeClaim('komposit', 'patient-wagner-petra', 'prac-koch', '2025-09-22', [
    ae1,
    ae5,
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2060', 'Kompositfüllung einflächig', { tooth: 24, surfaces: 'O' }),
  ]),

  // Invoice 4: Hans-Jürgen Becker, Zahn 46, 4-flächig MOBD — tiefe Kavität
  makeClaim('komposit', 'patient-becker-hans', 'prac-weber', '2025-08-11', [
    untersuchung,
    ae1,
    vipr,
    zahnfilm,
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2030', 'Besondere Maßnahmen beim Präparieren', { tooth: 46 }),
    goz('2120', 'Kompositfüllung >3 Flächen', { tooth: 46, surfaces: 'M,O,B,D' }),
  ]),

  // Invoice 5: Mehmet Yılmaz, Zahn 15, 2-flächig MO — Standard
  makeClaim('komposit', 'patient-yilmaz-mehmet', 'prac-koch', '2025-12-03', [
    untersuchung,
    ae1,
    vipr,
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2080', 'Kompositfüllung zweiflächig', { tooth: 15, surfaces: 'M,O' }),
  ]),

  // Invoice 6: Sophie Braun, Zahn 26, 3-flächig MOD — mit Röntgen + 2030
  makeClaim('komposit', 'patient-braun-sophie', 'prac-weber', '2025-07-14', [
    untersuchung,
    ae1,
    vipr,
    zahnfilm,
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2030', 'Besondere Maßnahmen beim Präparieren', { tooth: 26 }),
    goz('2100', 'Kompositfüllung dreiflächig', { tooth: 26, surfaces: 'M,O,D' }),
  ]),

  // Invoice 7: Fatima Al-Hassan, Zahn 35, 2-flächig DO — Leitungsanästhesie
  makeClaim('komposit', 'patient-al-hassan-fatima', 'prac-koch', '2025-06-28', [
    ae1,
    ae5,
    zahnfilm,
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2080', 'Kompositfüllung zweiflächig', { tooth: 35, surfaces: 'D,O' }),
  ]),

  // Invoice 8: Erika Richter, Zahn 14, 1-flächig O — einfach, ohne Röntgen
  makeClaim('komposit', 'patient-richter-erika', 'prac-weber', '2026-01-09', [
    untersuchung,
    ae1,
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2060', 'Kompositfüllung einflächig', { tooth: 14, surfaces: 'O' }),
  ]),

  // Invoice 9: Lukas Berg, Zahn 47, 3-flächig MOD — mit ViPr und 2030
  makeClaim('komposit', 'patient-berg-lukas', 'prac-koch', '2026-02-04', [
    untersuchung,
    ae1,
    vipr,
    zahnfilm,
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2030', 'Besondere Maßnahmen beim Präparieren', { tooth: 47 }),
    goz('2100', 'Kompositfüllung dreiflächig', { tooth: 47, surfaces: 'M,O,D' }),
  ]),

  // Invoice 10: Stefan Weber (PKV), Zahn 25, 2-flächig MO — volle Diagnostik
  makeClaim('komposit', 'patient-weber-stefan', 'prac-weber', '2025-11-20', [
    untersuchung,
    ae1,
    vipr,
    zahnfilm,
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('2030', 'Besondere Maßnahmen beim Präparieren', { tooth: 25 }),
    goz('2080', 'Kompositfüllung zweiflächig', { tooth: 25, surfaces: 'M,O' }),
  ]),
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. DREIGLIEDRIGE BRÜCKE (GOZ) — 10 Invoices
// ─────────────────────────────────────────────────────────────────────────────

const brueckeInvoices: FhirResource[] = [
  // Invoice 1: Anna Müller, Brücke 45-46-47 (Pfeiler 45+47, Spanne 46)
  makeClaim('bruecke', 'patient-mueller-anna', 'prac-weber', '2025-09-15', [
    goz('0060', 'Situationsmodelle beider Kiefer'),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 45 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 47 }),
    goz('5070', 'Brückenspanne', { tooth: 46 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 45 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 47 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 46 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 2: Klaus Schmidt, Brücke 34-35-36
  makeClaim('bruecke', 'patient-schmidt-klaus', 'prac-koch', '2025-08-22', [
    goz('0050', 'Situationsmodell ein Kiefer'),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 34 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 36 }),
    goz('5070', 'Brückenspanne', { tooth: 35 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 34 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 36 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 35 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 3: Petra Wagner, Brücke 25-26-27
  makeClaim('bruecke', 'patient-wagner-petra', 'prac-weber', '2025-07-10', [
    goz('0060', 'Situationsmodelle beider Kiefer'),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 25 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 27 }),
    goz('5070', 'Brückenspanne', { tooth: 26 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 25 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 27 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 26 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 4: Wolfgang Schulz (PKV), Brücke 14-15-16
  makeClaim('bruecke', 'patient-schulz-wolfgang', 'prac-weber', '2025-06-18', [
    goz('0060', 'Situationsmodelle beider Kiefer'),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 14 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 16 }),
    goz('5070', 'Brückenspanne', { tooth: 15 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 14 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 16 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 15 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 5: Fatima Al-Hassan, Brücke 23-24-25
  makeClaim('bruecke', 'patient-al-hassan-fatima', 'prac-koch', '2025-10-01', [
    goz('0050', 'Situationsmodell ein Kiefer'),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 23 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 25 }),
    goz('5070', 'Brückenspanne', { tooth: 24 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 23 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 25 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 24 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 6: Erika Richter, Brücke 36-37-38 — Leitungsanästhesie UK
  makeClaim('bruecke', 'patient-richter-erika', 'prac-weber', '2025-11-12', [
    goz('0060', 'Situationsmodelle beider Kiefer'),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 36 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 38 }),
    goz('5070', 'Brückenspanne', { tooth: 37 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 36 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 38 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 37 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 7: Stefan Weber (PKV), Brücke 24-25-26
  makeClaim('bruecke', 'patient-weber-stefan', 'prac-koch', '2025-05-28', [
    goz('0060', 'Situationsmodelle beider Kiefer'),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 24 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 26 }),
    goz('5070', 'Brückenspanne', { tooth: 25 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 24 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 26 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 25 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 8: Rainer Hoffmann (PKV), Brücke 44-45-46
  makeClaim('bruecke', 'patient-hoffmann-rainer', 'prac-weber', '2025-04-15', [
    goz('0050', 'Situationsmodell ein Kiefer'),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 44 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 46 }),
    goz('5070', 'Brückenspanne', { tooth: 45 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 44 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 46 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 45 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 9: Hans-Jürgen Becker, Brücke 13-14-15
  makeClaim('bruecke', 'patient-becker-hans', 'prac-koch', '2025-12-08', [
    goz('0060', 'Situationsmodelle beider Kiefer'),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 13 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 15 }),
    goz('5070', 'Brückenspanne', { tooth: 14 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 13 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 15 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 14 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),

  // Invoice 10: Lukas Berg, Brücke 43-44-45
  makeClaim('bruecke', 'patient-berg-lukas', 'prac-weber', '2026-01-20', [
    goz('0050', 'Situationsmodell ein Kiefer'),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum' }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 43 }),
    goz('5010', 'Brückenanker Vollkrone Hohlkehlpräparation', { tooth: 45 }),
    goz('5070', 'Brückenspanne', { tooth: 44 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 43 }),
    goz('5120', 'Provisorische Brücke je Zahn', { tooth: 45 }),
    goz('5140', 'Provisorische Brücke je Spanne', { tooth: 44 }),
    goz('2197', 'Adhäsive Befestigung'),
  ]),
]

// ─────────────────────────────────────────────────────────────────────────────
// 3. WURZELKANALBEHANDLUNG (GOZ) — 10 Invoices, Multi-Session
//
// Typical flow:
//   Sitzung 1: 0010, Ä1, 0070, GOÄ 5000, Anästhesie+Mat, 2390 (Trepanation),
//              2410×n (Aufbereitung je Kanal + NiTi-Feilen), 2400×n (Längenmessung),
//              2430 (Med. Einlage), 2020 (temp. Verschluss), 2197, ggf. 0110 (OP-Mikroskop)
//   Sitzung 2: Ä1, Ä5, ggf. 2410×n, 2400×n, 2430, 2020, 2197
//   Sitzung 3: Ä1, Ä5, GOÄ 5000 (Kontrollaufnahme), 2440×n (Wurzelfüllung je Kanal),
//              2020 (temp. Verschluss), 2197
//
// NiTi-Feilen: Einmal-Material, wird dem Patienten ausgehändigt, nicht wiederverwendbar.
// 0110 (OP-Mikroskop): In ~7/10 Fällen abgerechnet (praxisindividuell).
// ─────────────────────────────────────────────────────────────────────────────

const wkbInvoices: FhirResource[] = [
  // Invoice 1: Mehmet Yılmaz, Zahn 46 (3 Kanäle), 3 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-yilmaz-mehmet', 'prac-weber', '2025-10-01', [
    // Sitzung 1
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 46, session: 1 }),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 46, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 46, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 46, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3', { tooth: 46, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 46, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 46, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 46, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 46, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 46, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 46, session: 1 }),
    opMikroskop,
    // Sitzung 2
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Messaufnahme)', { tooth: 46, session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1 (Nachaufbereitung)', { tooth: 46, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2 (Nachaufbereitung)', { tooth: 46, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3 (Nachaufbereitung)', { tooth: 46, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 46, session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 46, session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 46, session: 2 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 46, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 46, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 46, session: 2 }),
    goz('0110', 'Zuschlag OP-Mikroskop', { session: 2 }),
    // Sitzung 3
    { ...ae1, session: 3 },
    { ...ae5, session: 3 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 46, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 46, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 46, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 3', { tooth: 46, session: 3 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 46, session: 3 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 46, session: 3 }),
  ]),

  // Invoice 2: Anna Müller, Zahn 26 (3 Kanäle), 3 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-mueller-anna', 'prac-weber', '2025-08-18', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 26, session: 1 }),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 26, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 26, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 26, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3', { tooth: 26, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 26, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 26, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 26, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 26, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 26, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 26, session: 1 }),
    opMikroskop,
    // Sitzung 2
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goz('2430', 'Medikamentöse Einlage', { tooth: 26, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 26, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 26, session: 2 }),
    // Sitzung 3
    { ...ae1, session: 3 },
    { ...ae5, session: 3 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 26, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 26, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 26, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 3', { tooth: 26, session: 3 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 26, session: 3 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 26, session: 3 }),
  ]),

  // Invoice 3: Klaus Schmidt, Zahn 36 (2 Kanäle), 2 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-schmidt-klaus', 'prac-koch', '2025-07-05', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 36, session: 1 }),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 36, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 36, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 36, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 36, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 36, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 36, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 36, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 36, session: 1 }),
    opMikroskop,
    // Sitzung 2: direkt Wurzelfüllung
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 36, session: 2 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 36, session: 2 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 36, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 36, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 36, session: 2 }),
  ]),

  // Invoice 4: Wolfgang Schulz (PKV), Zahn 16 (3 Kanäle), 3 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-schulz-wolfgang', 'prac-weber', '2025-06-12', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 16, session: 1 }),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 16, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 16, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 16, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3', { tooth: 16, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 16, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 16, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 16, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 16, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 16, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 16, session: 1 }),
    opMikroskop,
    // Sitzung 2
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Messaufnahme)', { tooth: 16, session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1 (Nachaufbereitung)', { tooth: 16, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2 (Nachaufbereitung)', { tooth: 16, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3 (Nachaufbereitung)', { tooth: 16, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 16, session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 16, session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 16, session: 2 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 16, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 16, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 16, session: 2 }),
    goz('0110', 'Zuschlag OP-Mikroskop', { session: 2 }),
    // Sitzung 3
    { ...ae1, session: 3 },
    { ...ae5, session: 3 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 16, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 16, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 16, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 3', { tooth: 16, session: 3 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 16, session: 3 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 16, session: 3 }),
  ]),

  // Invoice 5: Sophie Braun, Zahn 21 (1 Kanal), 2 Sitzungen, OHNE OP-Mikroskop
  makeClaim('wkb', 'patient-braun-sophie', 'prac-koch', '2025-11-25', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 21, session: 1 }),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 21, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung', { tooth: 21, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung', { tooth: 21, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 21, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 21, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 21, session: 1 }),
    // Sitzung 2: direkt Wurzelfüllung
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 21, session: 2 }),
    goz('2440', 'Wurzelfüllung', { tooth: 21, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 21, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 21, session: 2 }),
  ]),

  // Invoice 6: Hans-Jürgen Becker, Zahn 47 (3 Kanäle), 3 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-becker-hans', 'prac-weber', '2025-09-08', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 47, session: 1 }),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 47, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 47, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 47, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3', { tooth: 47, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 47, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 47, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 47, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 47, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 47, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 47, session: 1 }),
    opMikroskop,
    // Sitzung 2
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Messaufnahme)', { tooth: 47, session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2 (Nachaufbereitung)', { tooth: 47, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 47, session: 2 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 47, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 47, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 47, session: 2 }),
    goz('0110', 'Zuschlag OP-Mikroskop', { session: 2 }),
    // Sitzung 3
    { ...ae1, session: 3 },
    { ...ae5, session: 3 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 47, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 47, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 47, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 3', { tooth: 47, session: 3 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 47, session: 3 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 47, session: 3 }),
  ]),

  // Invoice 7: Erika Richter, Zahn 14 (2 Kanäle), 2 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-richter-erika', 'prac-koch', '2025-12-15', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 14, session: 1 }),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 14, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 14, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 14, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 14, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 14, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 14, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 14, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 14, session: 1 }),
    opMikroskop,
    // Sitzung 2: Wurzelfüllung
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 14, session: 2 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 14, session: 2 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 14, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 14, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 14, session: 2 }),
  ]),

  // Invoice 8: Stefan Weber (PKV), Zahn 37 (3 Kanäle), 3 Sitzungen, mit OP-Mikroskop
  makeClaim('wkb', 'patient-weber-stefan', 'prac-weber', '2026-01-10', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 37, session: 1 }),
    goz('0100', 'Leitungsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 37, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 37, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 37, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3', { tooth: 37, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 37, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 37, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 37, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 37, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 37, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 37, session: 1 }),
    opMikroskop,
    // Sitzung 2
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Messaufnahme)', { tooth: 37, session: 2 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 3 (Nachaufbereitung)', { tooth: 37, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 2 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 3', { tooth: 37, session: 2 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 37, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 37, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 37, session: 2 }),
    goz('0110', 'Zuschlag OP-Mikroskop', { session: 2 }),
    // Sitzung 3
    { ...ae1, session: 3 },
    { ...ae5, session: 3 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 37, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 37, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 37, session: 3 }),
    goz('2440', 'Wurzelfüllung Kanal 3', { tooth: 37, session: 3 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 37, session: 3 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 37, session: 3 }),
  ]),

  // Invoice 9: Fatima Al-Hassan, Zahn 25 (2 Kanäle), 2 Sitzungen, OHNE OP-Mikroskop
  makeClaim('wkb', 'patient-al-hassan-fatima', 'prac-koch', '2025-05-20', [
    untersuchung,
    ae1,
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 25, session: 1 }),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 25, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 1', { tooth: 25, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung Kanal 2', { tooth: 25, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 1', { tooth: 25, session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung Kanal 2', { tooth: 25, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 25, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 25, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 25, session: 1 }),
    // Sitzung 2: Wurzelfüllung
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 25, session: 2 }),
    goz('2440', 'Wurzelfüllung Kanal 1', { tooth: 25, session: 2 }),
    goz('2440', 'Wurzelfüllung Kanal 2', { tooth: 25, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 25, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 25, session: 2 }),
  ]),

  // Invoice 10: Lukas Berg, Zahn 45 (1 Kanal), 2 Sitzungen, OHNE OP-Mikroskop
  makeClaim('wkb', 'patient-berg-lukas', 'prac-weber', '2026-02-12', [
    ae1,
    ae5,   // keine volle Untersuchung (kürzlich erst gewesen)
    vipr,
    goae('5000', 'Zahnfilm (Diagnostik)', { tooth: 45, session: 1 }),
    goz('0090', 'Infiltrationsanästhesie', { note: 'Material: Anästhetikum', session: 1 }),
    goz('2390', 'Trepanation', { tooth: 45, session: 1 }),
    goz('2410', 'Wurzelkanalaufbereitung', { tooth: 45, note: 'Material: NiTi-Feilen (Einmalverwendung)', session: 1 }),
    goz('2400', 'Elektrometrische Längenbestimmung', { tooth: 45, session: 1 }),
    goz('2430', 'Medikamentöse Einlage', { tooth: 45, session: 1 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 45, session: 1 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 45, session: 1 }),
    // Sitzung 2: Wurzelfüllung
    { ...ae1, session: 2 },
    { ...ae5, session: 2 },
    goae('5000', 'Zahnfilm (Kontrollaufnahme)', { tooth: 45, session: 2 }),
    goz('2440', 'Wurzelfüllung', { tooth: 45, session: 2 }),
    goz('2020', 'Temporärer speicheldichter Verschluss', { tooth: 45, session: 2 }),
    goz('2197', 'Adhäsive Befestigung', { tooth: 45, session: 2 }),
  ]),
]

// ─── Export ──────────────────────────────────────────────────────────────────

export const pastInvoices: FhirResource[] = [
  ...kompositInvoices,
  ...brueckeInvoices,
  ...wkbInvoices,
]

/** Grouped by treatment type for pattern analysis */
export const pastInvoicesByType = {
  komposit: kompositInvoices,
  bruecke: brueckeInvoices,
  wkb: wkbInvoices,
} as const
