/**
 * Zahnbefunde (tooth findings) as FHIR Observations — scenario-driven.
 * One Observation per non-healthy tooth.
 *
 * 15 HKP scenarios, one per patient. Each scenario function returns
 * the Observations for that patient.
 *
 * Tooth status codes used:
 *   absent               — fehlender Zahn (Lücke)
 *   crown-intact         — Krone intakt (k)
 *   crown-needs-renewal  — Krone erneuerungsbedürftig (kw)
 *   implant-with-crown   — Implantat mit Suprakonstruktion (ix)
 *   implant              — Implantat ohne Suprakonstruktion (i)
 *   filled               — Füllung (mit tooth-surfaces Extension)
 *   carious              — kariöser Zahn (c)
 *   bridge-anchor        — Zahn dient als Brückenanker (wird präpariert)
 *   replaced-bridge      — Zahn durch Brückenglied ersetzt (fehlend, prothetisch versorgt)
 *
 * Consistency rules:
 *   - absent → no filled/crown-intact/crown-needs-renewal on same tooth+patient
 *   - bridge-anchor → tooth is present (not absent)
 *   - replaced-bridge → tooth is missing/absent (prothetisch versorgt = fehlend vor HKP)
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
const SNOMED_TOOTH_STRUCTURE = '38671000'

type ToothStatus =
  | 'absent'
  | 'crown-intact'
  | 'crown-needs-renewal'
  | 'replaced-bridge'
  | 'bridge-pontic'
  | 'implant'
  | 'implant-with-crown'
  | 'carious'
  | 'filled'
  | 'bridge-anchor'

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
        code: SNOMED_TOOTH_STRUCTURE,
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

// ─── Szenario 1: Anna Müller (28) — Einfache 3-gliedrige Brücke, kein Bonusheft (GKV 50%) ──
// Zahn 46 durch Unfall verloren. 45 und 47 als Brückenanker. Weisheitszähne fehlen.
// HKP: 3-gliedrige Brücke 45-46-47. Regelversorgung. 50% Festzuschuss (kein Bonus).
function buildScenario1Findings(): FhirResource[] {
  const slug = 'mueller-anna'
  const id = 'patient-mueller-anna'
  return [
    buildFinding(slug, id, 46, 'absent'),           // Lücke — wird überbrückt
    buildFinding(slug, id, 45, 'bridge-anchor'),    // Anker distal
    buildFinding(slug, id, 47, 'bridge-anchor'),    // Anker mesial
    buildFinding(slug, id, 18, 'absent'),           // Weisheitszahn nicht angelegt
    buildFinding(slug, id, 28, 'absent'),
    buildFinding(slug, id, 38, 'absent'),
    buildFinding(slug, id, 48, 'absent'),
  ]
}

// ─── Szenario 2: Klaus Schmidt (35) — 4-gliedrige Brücke, 5 Jahre Bonus (GKV 60%) ──────────
// 35 und 36 fehlen. 34 und 37 als Anker. Bonus auf 60% korrigiert.
// HKP: 4-gliedrige Brücke 34-35-36-37. Regelversorgung. 60% Festzuschuss.
function buildScenario2Findings(): FhirResource[] {
  const slug = 'schmidt-klaus'
  const id = 'patient-schmidt-klaus'
  return [
    buildFinding(slug, id, 35, 'absent'),           // Lücke 1
    buildFinding(slug, id, 36, 'absent'),           // Lücke 2
    buildFinding(slug, id, 34, 'bridge-anchor'),    // Anker mesial
    buildFinding(slug, id, 37, 'bridge-anchor'),    // Anker distal
    buildFinding(slug, id, 46, 'crown-intact'),     // vorhandene Krone UK
    buildFinding(slug, id, 16, 'filled', ['O', 'D']),
    buildFinding(slug, id, 26, 'filled', ['O']),
  ]
}

// ─── Szenario 3: Petra Wagner (52) — Gleichartige Versorgung (Vollkeramik), 10 Jahre Bonus (70%) ─
// 26 fehlt. Vollkeramikbrücke 25-26-27 (gleichartig). Zusätzlich 36+46 kw, 13 kariös.
// HKP: Brücke 25-26-27 (gleichartig) + Kronenerneuerungen 36+46. 70% Festzuschuss.
function buildScenario3Findings(): FhirResource[] {
  const slug = 'wagner-petra'
  const id = 'patient-wagner-petra'
  return [
    buildFinding(slug, id, 26, 'absent'),                   // Brückenlücke
    buildFinding(slug, id, 25, 'bridge-anchor'),            // Anker mesial
    buildFinding(slug, id, 27, 'bridge-anchor'),            // Anker distal
    buildFinding(slug, id, 36, 'crown-needs-renewal'),      // kw → Kronenerneuerung
    buildFinding(slug, id, 46, 'crown-needs-renewal'),      // kw → Kronenerneuerung
    buildFinding(slug, id, 16, 'crown-intact'),             // vorhandene Krone
    buildFinding(slug, id, 15, 'filled', ['M', 'O', 'D']),
    buildFinding(slug, id, 14, 'filled', ['O', 'D']),
    buildFinding(slug, id, 13, 'carious'),                  // Sanierung vor ZE erforderlich
  ]
}

// ─── Szenario 4: Hans-Jürgen Becker (63) — Komplexer ZE mit PAR-Vorbehandlung (GKV 70%) ──
// Schwere Parodontitis. 35, 36, 45, 46 fehlen. 37+47 paro-geschädigt (kw). 14+24 kariös.
// HKP: ZE erst nach PAR-Sanierung. 4-gliedrige Brücke UK + Kronenerneuerungen.
function buildScenario4Findings(): FhirResource[] {
  const slug = 'becker-hans'
  const id = 'patient-becker-hans'
  return [
    buildFinding(slug, id, 35, 'absent'),                   // Lücke UK links
    buildFinding(slug, id, 36, 'absent'),                   // Lücke UK links
    buildFinding(slug, id, 45, 'absent'),                   // Lücke UK rechts
    buildFinding(slug, id, 46, 'absent'),                   // Lücke UK rechts
    buildFinding(slug, id, 37, 'crown-needs-renewal'),      // PAR-geschädigt, kw
    buildFinding(slug, id, 47, 'crown-needs-renewal'),      // PAR-geschädigt, kw
    buildFinding(slug, id, 16, 'crown-intact'),
    buildFinding(slug, id, 26, 'crown-intact'),
    buildFinding(slug, id, 17, 'crown-intact'),
    buildFinding(slug, id, 15, 'filled', ['M', 'O']),
    buildFinding(slug, id, 25, 'filled', ['D']),
    buildFinding(slug, id, 14, 'carious'),                  // Sanierung vor ZE
    buildFinding(slug, id, 24, 'carious'),                  // Sanierung vor ZE
  ]
}

// ─── Szenario 5: Monika Fischer (71) — Teilprothese UK, 10+ Jahre Bonus (GKV 70%) ──────────
// Viele fehlende Zähne UK → Teilprothese (Kennedyklasse I). OK weitgehend intakt.
// HKP: Schleimhautgetragene Teilprothese UK Kennedyklasse I. 70% Festzuschuss.
function buildScenario5Findings(): FhirResource[] {
  const slug = 'fischer-monika'
  const id = 'patient-fischer-monika'
  return [
    // UK fehlend (beidseits Freiend)
    buildFinding(slug, id, 35, 'absent'),
    buildFinding(slug, id, 36, 'absent'),
    buildFinding(slug, id, 37, 'absent'),
    buildFinding(slug, id, 45, 'absent'),
    buildFinding(slug, id, 46, 'absent'),
    buildFinding(slug, id, 47, 'absent'),
    // OK: vorhandene Kronen (Prothesenverankerung)
    buildFinding(slug, id, 16, 'crown-intact'),
    buildFinding(slug, id, 26, 'crown-intact'),
    buildFinding(slug, id, 17, 'crown-intact'),
    buildFinding(slug, id, 27, 'crown-intact'),
    // OK: Füllungen
    buildFinding(slug, id, 15, 'filled', ['O']),
    buildFinding(slug, id, 25, 'filled', ['D']),
    buildFinding(slug, id, 14, 'filled', ['M', 'O']),
  ]
}

// ─── Szenario 6: Mehmet Yılmaz (42) — Einzelimplantat 46, 5 Jahre Bonus (GKV 60%) ──────────
// 46 fehlt seit 2 Jahren. Patient wünscht Implantat (andersartig). Bonus auf 60% korrigiert.
// HKP: Einzelimplantat 46 (andersartig). 60% auf Regelversorgungsbetrag. Aufpreis privat.
function buildScenario6Findings(): FhirResource[] {
  const slug = 'yilmaz-mehmet'
  const id = 'patient-yilmaz-mehmet'
  return [
    buildFinding(slug, id, 46, 'absent'),           // Implantat geplant, noch nicht gesetzt
    buildFinding(slug, id, 36, 'crown-intact'),
    buildFinding(slug, id, 16, 'filled', ['O', 'D']),
    buildFinding(slug, id, 26, 'filled', ['O']),
    buildFinding(slug, id, 15, 'filled', ['M', 'O']),
    buildFinding(slug, id, 25, 'filled', ['D']),
    buildFinding(slug, id, 14, 'filled', ['O']),
  ]
}

// ─── Szenario 7: Sophie Braun (25) — Frontzahn-Implantat 21, kein Bonusheft (GKV 50%) ──────
// Sportunfall, Zahn 21 traumatisch verloren. Implantat geplant (ästhetisch hochrelevant).
// HKP: Einzelimplantat 21 (Frontzahn, andersartig). 50% auf Regelversorgung.
function buildScenario7Findings(): FhirResource[] {
  const slug = 'braun-sophie'
  const id = 'patient-braun-sophie'
  return [
    buildFinding(slug, id, 21, 'absent'),           // traumatisch verloren, Implantat geplant
    buildFinding(slug, id, 46, 'filled', ['O']),
    buildFinding(slug, id, 36, 'filled', ['O', 'D']),
  ]
}

// ─── Szenario 8: Wolfgang Schulz (58, PKV) — Implantate 36+46 + vorhandene Implantate 37+47 ─
// 36 und 46 fehlen (neu geplant). 37+47 bereits mit Implantat+Krone versorgt. Viele Kronen.
// HKP: 2 neue Implantate 36+46 (PKV, GOZ). Kein Festzuschuss.
function buildScenario8Findings(): FhirResource[] {
  const slug = 'schulz-wolfgang'
  const id = 'patient-schulz-wolfgang'
  return [
    buildFinding(slug, id, 36, 'absent'),                   // neu zu implantieren
    buildFinding(slug, id, 46, 'absent'),                   // neu zu implantieren
    buildFinding(slug, id, 37, 'implant-with-crown'),       // ix: vorhandenes Implantat
    buildFinding(slug, id, 47, 'implant-with-crown'),       // ix: vorhandenes Implantat
    buildFinding(slug, id, 16, 'crown-intact'),
    buildFinding(slug, id, 26, 'crown-intact'),
    buildFinding(slug, id, 17, 'crown-intact'),
    buildFinding(slug, id, 15, 'filled', ['M', 'O', 'D']),
    buildFinding(slug, id, 25, 'filled', ['O', 'D']),
    buildFinding(slug, id, 14, 'filled', ['M', 'O']),
    buildFinding(slug, id, 24, 'filled', ['D']),
    buildFinding(slug, id, 18, 'absent'),                   // Weisheitszahn
    buildFinding(slug, id, 28, 'absent'),
    buildFinding(slug, id, 48, 'absent'),
  ]
}

// ─── Szenario 9: Fatima Al-Hassan (33) — 3 Kronenerneuerungen (kw), 5 Jahre Bonus (GKV 60%) ─
// 3 alte Kronen erneuerungsbedürftig. Kein Zahnersatz neu — HKP für kw→k.
// HKP: 3 Kronenerneuerungen. Regelversorgung. 60% Festzuschuss.
function buildScenario9Findings(): FhirResource[] {
  const slug = 'al-hassan-fatima'
  const id = 'patient-al-hassan-fatima'
  return [
    buildFinding(slug, id, 16, 'crown-needs-renewal'),      // kw → Erneuerung
    buildFinding(slug, id, 26, 'crown-needs-renewal'),      // kw → Erneuerung
    buildFinding(slug, id, 36, 'crown-needs-renewal'),      // kw → Erneuerung
    buildFinding(slug, id, 46, 'filled', ['O']),
    buildFinding(slug, id, 14, 'filled', ['M', 'O']),
    buildFinding(slug, id, 24, 'filled', ['D']),
    buildFinding(slug, id, 25, 'filled', ['O']),
    buildFinding(slug, id, 15, 'filled', ['D']),
  ]
}

// ─── Szenario 10: Rainer Hoffmann (67, PKV) — Implantatgetragene Teleskopprothese UK ────────
// Massiver Zahnverlust UK. 35+45 als Implantate mit Krone (Teleskoppfeiler).
// 36,37,46,47 fehlen (Sattelbereich). OK: 4 Kronen als Teleskopträger.
// HKP: Implantatgetragene Teleskopprothese UK (PKV, GOZ 9000er Nrn).
function buildScenario10Findings(): FhirResource[] {
  const slug = 'hoffmann-rainer'
  const id = 'patient-hoffmann-rainer'
  return [
    // Implantate als Teleskoppfeiler UK
    buildFinding(slug, id, 35, 'implant-with-crown'),       // ix: Teleskoppfeiler
    buildFinding(slug, id, 45, 'implant-with-crown'),       // ix: Teleskoppfeiler
    // UK fehlend (Sattelbereich)
    buildFinding(slug, id, 36, 'absent'),
    buildFinding(slug, id, 37, 'absent'),
    buildFinding(slug, id, 46, 'absent'),
    buildFinding(slug, id, 47, 'absent'),
    // OK: Teleskopträger (Kronen)
    buildFinding(slug, id, 16, 'crown-intact'),
    buildFinding(slug, id, 26, 'crown-intact'),
    buildFinding(slug, id, 17, 'crown-intact'),
    buildFinding(slug, id, 27, 'crown-intact'),
    // Weisheitszähne fehlen
    buildFinding(slug, id, 18, 'absent'),
    buildFinding(slug, id, 28, 'absent'),
    buildFinding(slug, id, 38, 'absent'),
    buildFinding(slug, id, 48, 'absent'),
  ]
}

// ─── Szenario 11: Gerda Klein (68) — Freiendlücke UK, Teilprothese, kein Bonusheft (GKV 50%) ─
// UK beidseits Freiend (kein distaler Anker → keine Brücke möglich → Teilprothese).
// HKP: Schleimhautgetragene Teilprothese UK Kennedyklasse I. 50% Festzuschuss.
function buildScenario11Findings(): FhirResource[] {
  const slug = 'klein-gerda'
  const id = 'patient-klein-gerda'
  return [
    // UK beidseits Freiend
    buildFinding(slug, id, 36, 'absent'),
    buildFinding(slug, id, 37, 'absent'),
    buildFinding(slug, id, 38, 'absent'),
    buildFinding(slug, id, 46, 'absent'),
    buildFinding(slug, id, 47, 'absent'),
    buildFinding(slug, id, 48, 'absent'),
    // OK: Kronen (Prothesenverankerung)
    buildFinding(slug, id, 16, 'crown-intact'),
    buildFinding(slug, id, 26, 'crown-intact'),
    // UK: Brückenanker (Prämolaren als Prothesenhalter)
    buildFinding(slug, id, 35, 'bridge-anchor'),
    buildFinding(slug, id, 45, 'bridge-anchor'),
    // Füllungen
    buildFinding(slug, id, 15, 'filled', ['O', 'D']),
    buildFinding(slug, id, 25, 'filled', ['D']),
  ]
}

// ─── Szenario 12: Erika Richter (65) — Kombinierter ZE (Brücke + Prothese), 10 Jahre Bonus (70%) ─
// OK: 15+16 fehlen → Brücke 14-15-16-17. UK: 35,36,45,46 fehlen + Freiend → Kombinierte Prothese.
// HKP: Brücke OK + Kombinierte Prothese UK. 70% Festzuschuss.
function buildScenario12Findings(): FhirResource[] {
  const slug = 'richter-erika'
  const id = 'patient-richter-erika'
  return [
    // OK: Brückenlücken
    buildFinding(slug, id, 15, 'absent'),
    buildFinding(slug, id, 16, 'absent'),
    buildFinding(slug, id, 14, 'bridge-anchor'),    // Anker mesial
    buildFinding(slug, id, 17, 'bridge-anchor'),    // Anker distal
    // UK: fehlende Zähne (Sattel + Freiend)
    buildFinding(slug, id, 35, 'absent'),
    buildFinding(slug, id, 36, 'absent'),
    buildFinding(slug, id, 45, 'absent'),
    buildFinding(slug, id, 46, 'absent'),
    buildFinding(slug, id, 34, 'bridge-anchor'),    // Prämolar als Prothesenhalter
    buildFinding(slug, id, 44, 'bridge-anchor'),    // Prämolar als Prothesenhalter
    // Verbleibende Kronen
    buildFinding(slug, id, 26, 'crown-intact'),
    buildFinding(slug, id, 37, 'crown-intact'),
    buildFinding(slug, id, 47, 'crown-intact'),
    buildFinding(slug, id, 27, 'crown-intact'),
  ]
}

// ─── Szenario 13: Lukas Berg (22, PKV) — Sekundärkaries Zahn 46, Billing-Coach-Demo ─────────
// Patient kommt mit Beschwerden an Zahn 46. Röntgen zeigt Sekundärkaries unter bestehender Füllung.
// Vitalitätsprüfung positiv. Behandlung: Exkavation, cp Dycal, Kompositfüllung MOD.
// Demo-Case: Agent soll dokumentierte Behandlung gegen Abrechnung prüfen und fehlende
// Positionen finden (GOZ 0070 dokumentiert/nicht abgerechnet, GOZ 2030 aus Praxismuster).
function buildScenario13Findings(): FhirResource[] {
  const slug = 'berg-lukas'
  const id = 'patient-berg-lukas'
  return [
    buildFinding(slug, id, 45, 'filled', ['O']),
    buildFinding(slug, id, 36, 'filled', ['O', 'D']),
    buildFinding(slug, id, 46, 'carious'),                   // Sekundärkaries — Befund bei Aufnahme
  ]
}

// ─── Szenario 14: Hildegard Vogel (72) — Extraktion + Totalprothese UK, kein Bonus (GKV 50%) ─
// Schwere generalisierte Parodontitis UK. UK fast zahnlos (nur noch 33+43 als Restpfeilerzähne).
// HKP: Extraktion 33+43, dann Totalprothese UK. 50% Festzuschuss (kein Bonusheft).
function buildScenario14Findings(): FhirResource[] {
  const slug = 'vogel-hildegard'
  const id = 'patient-vogel-hildegard'
  return [
    // Restpfeilerzähne UK (paro-geschädigt, Extraktionskandidaten)
    buildFinding(slug, id, 33, 'crown-needs-renewal'),      // paro-geschädigt, vor Extraktion
    buildFinding(slug, id, 43, 'crown-needs-renewal'),      // paro-geschädigt, vor Extraktion
    // UK: fehlende Zähne (bereits extrahiert)
    buildFinding(slug, id, 31, 'absent'),
    buildFinding(slug, id, 32, 'absent'),
    buildFinding(slug, id, 41, 'absent'),
    buildFinding(slug, id, 42, 'absent'),
    buildFinding(slug, id, 34, 'absent'),
    buildFinding(slug, id, 35, 'absent'),
    buildFinding(slug, id, 36, 'absent'),
    buildFinding(slug, id, 37, 'absent'),
    buildFinding(slug, id, 44, 'absent'),
    buildFinding(slug, id, 45, 'absent'),
    buildFinding(slug, id, 46, 'absent'),
    buildFinding(slug, id, 47, 'absent'),
  ]
}

// ─── Szenario 15: Stefan Weber (48, PKV) — 3 Implantate 14+15+16, implantatgetragene Brücke ─
// 14, 15, 16 fehlen. Implantatgetragene verblockte Brücke (PKV, GOZ).
// HKP: 3 Implantate 14+15+16 + verblockte implantatgetragene Brücke. PKV-GOZ-Abrechnung.
function buildScenario15Findings(): FhirResource[] {
  const slug = 'weber-stefan'
  const id = 'patient-weber-stefan'
  return [
    // OK: Brückenlücken (Implantate geplant)
    buildFinding(slug, id, 14, 'absent'),
    buildFinding(slug, id, 15, 'absent'),
    buildFinding(slug, id, 16, 'absent'),
    // Nachbarzähne
    buildFinding(slug, id, 13, 'crown-intact'),     // Brückenabschluss mesial
    buildFinding(slug, id, 17, 'crown-intact'),     // Brückenabschluss distal
    // UK + weiterer Befund
    buildFinding(slug, id, 36, 'crown-intact'),
    buildFinding(slug, id, 46, 'crown-intact'),
    buildFinding(slug, id, 26, 'filled', ['O', 'D']),
    buildFinding(slug, id, 24, 'filled', ['M', 'O']),
    buildFinding(slug, id, 25, 'filled', ['D']),
  ]
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const dentalFindings: FhirResource[] = [
  ...buildScenario1Findings(),   // Anna Müller — 3-gl. Brücke 45-46-47, 50%
  ...buildScenario2Findings(),   // Klaus Schmidt — 4-gl. Brücke 34-37, 60%
  ...buildScenario3Findings(),   // Petra Wagner — Vollkeramik 25-26-27 (gleichartig), 70%
  ...buildScenario4Findings(),   // Hans-Jürgen Becker — ZE nach PAR, 70%
  ...buildScenario5Findings(),   // Monika Fischer — Teilprothese UK KI, 70%
  ...buildScenario6Findings(),   // Mehmet Yılmaz — Einzelimplantat 46, 60%
  ...buildScenario7Findings(),   // Sophie Braun — Frontzahn-Implantat 21, 50%
  ...buildScenario8Findings(),   // Wolfgang Schulz — 2 Implantate 36+46, PKV
  ...buildScenario9Findings(),   // Fatima Al-Hassan — 3 Kronenerneuerungen, 60%
  ...buildScenario10Findings(),  // Rainer Hoffmann — Teleskopprothese UK, PKV
  ...buildScenario11Findings(),  // Gerda Klein — Freiend UK, Teilprothese, 50%
  ...buildScenario12Findings(),  // Erika Richter — Brücke OK + Prothese UK, 70%
  ...buildScenario13Findings(),  // Lukas Berg — Sekundärkaries 46, PKV, Billing-Coach-Demo
  ...buildScenario14Findings(),  // Hildegard Vogel — Totalprothese UK, 50%
  ...buildScenario15Findings(),  // Stefan Weber — 3 Implantate + verblockte Brücke, PKV
]
