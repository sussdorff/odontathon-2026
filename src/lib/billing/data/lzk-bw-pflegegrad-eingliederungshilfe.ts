/**
 * LZK BW / KZV BW — Abrechnungs-Synopse bei Pflegegrad & Eingliederungshilfe
 *
 * Source: https://lzk-bw.de/zahnaerzte/alters-und-behindertenzahnheilkunde/recht-abrechnung
 * Documents extracted (2021-12):
 *   1. Synopse Abrechnungspositionen (LZK BW / KZV BW, 12/2021)
 *   2. BEMA 174 a-b Kommentarauszug (Liebold/Raff/Wissing, Stand 10/2020)
 *   3. Hausbesuche — gut zu wissen! (LZK BW, 03/2021)
 *   4. Leitfaden zur Verordnung einer Krankenbefoerderung (KZV BW / LZK BW, 03/2021)
 *   5. Videosprechstunde & Co (SZM 2020)
 *   6. Stellungnahme Wirtschaftlichkeitspruefung (SZM 2020)
 *   7. Rechtliche Aspekte im Behandlungsverhaeltnis (LZK BW, 03/2018)
 *   8. Behandlungsvertrag und neues Betreuungsrecht (Quintessenz 2023)
 *   9. Mundgesundheitsstatus PKV — GOAe-Nr. 4 (SZM 2020)
 */

// ============================================================================
// PATIENT ELIGIBILITY — Prerequisite for all special positions
// ============================================================================

export interface PatientEligibility {
  /** Pflegegrad nach § 15 SGB XI (1-5) */
  pflegegrad?: 1 | 2 | 3 | 4 | 5;
  /** Eingliederungshilfe nach § 53 SGB XII */
  eingliederungshilfe?: boolean;
  /** Bescheid der Pflegekasse oder des Sozialamtes */
  bescheidVorhanden: boolean;
  /** Bei befristetem Bescheid: Fristablauf dokumentieren */
  bescheidBefristet?: boolean;
}

export const ELIGIBILITY_RULES = {
  voraussetzung:
    "Pflegegrad 1-5 (Bescheid der Pflegekasse) ODER Eingliederungshilfe nach § 53 SGB XII (Bescheid des Sozialamtes)",
  dokumentation:
    "Anspruchsberechtigung ist vom Zahnarzt in der Patientenakte zu dokumentieren (anhand Bescheid). Bei unbefristeten Bescheiden einmalig, bei befristeten Bescheiden Fristablauf dokumentieren.",
  rechtsgrundlage: {
    pflegegrad: "§ 15 SGB XI — Ermittlung des Grades der Pflegebeduerftigkeit",
    eingliederungshilfe:
      "§ 53 SGB XII — Leistungsberechtigte und Aufgabe der Eingliederungshilfe",
    praevention:
      "§ 22a SGB V — Verhuetung von Zahnerkrankungen bei Pflegebeduerftigen und Menschen mit Behinderungen",
  },
  pflegegradStufen: {
    1: { punkte: "12.5 bis unter 27", beschreibung: "geringe Beeintraechtigungen" },
    2: { punkte: "27 bis unter 47.5", beschreibung: "erhebliche Beeintraechtigungen" },
    3: { punkte: "47.5 bis unter 70", beschreibung: "schwere Beeintraechtigungen" },
    4: { punkte: "70 bis unter 90", beschreibung: "schwerste Beeintraechtigungen" },
    5: {
      punkte: "90 bis 100",
      beschreibung:
        "schwerste Beeintraechtigungen mit besonderen Anforderungen an die pflegerische Versorgung",
    },
  },
} as const;

// ============================================================================
// SYNOPSE PAGE 1 — "Das Wichtigste auf einen Blick..."
// Context: Patient at home (Privatwohnung), quick-reference
// ============================================================================

export interface BillingPosition {
  kuerzel: string;
  gebuehrenNr: string | null;
  bewertung: number | string;
  beschreibung: string;
  anmerkungen: string[];
  /** GKV = gesetzlich, PKV = privat */
  system: "GKV" | "PKV" | "GKV+PKV";
  /** Only applicable when specific context */
  kontext?: string;
}

// --- PRAEVENTION (Page 1 — Privatwohnung) ---

export const PRAEVENTION_POSITIONEN: BillingPosition[] = [
  {
    kuerzel: "PBa",
    gebuehrenNr: "174a",
    bewertung: 20,
    beschreibung: "Mundgesundheitsstatus/-plan",
    system: "GKV",
    anmerkungen: [
      "Dokumentation auf Vordruck § 8 der Richtlinie zum § 22a",
      "1x im Kalenderhalbjahr — Abstand 4 Monate nicht noetig!",
      "IP1/2, FU1/2, MHU, UPTa/b nicht am selben Tag abrechenbar",
      "01, Ae1 moeglich, wenn keine Besuchsleistung (Bs1-5)",
    ],
  },
  {
    kuerzel: "PBb",
    gebuehrenNr: "174b",
    bewertung: 26,
    beschreibung: "Mundgesundheitsaufklaerung",
    system: "GKV",
    anmerkungen: [
      "IP1/2, FU1/2, MHU, UPTa/b nicht am selben Tag abrechenbar",
      "01, Ae1 moeglich, wenn keine Besuchsleistung (Bs1-5)",
    ],
  },
  {
    kuerzel: "PBZst",
    gebuehrenNr: "107a",
    bewertung: 16,
    beschreibung: "Entfernung harter Belaege",
    system: "GKV",
    anmerkungen: [
      "1x im Kalenderhalbjahr",
      "Nicht, wenn bereits Zst (107) abgerechnet",
    ],
  },
];

// --- TELEMEDIZIN (Page 1) ---

export const TELEMEDIZIN_POSITIONEN: BillingPosition[] = [
  {
    kuerzel: "VS",
    gebuehrenNr: null,
    bewertung: 16,
    beschreibung: "Videosprechstunde",
    system: "GKV",
    anmerkungen: [
      "Voraussetzung: Videodienst nach Anlage 16 BMV-Z!",
      "Nur als alleinige Leistung — Ausnahme: 174b bei Quarantaene/meldepflichtiger Krankheit zusaetzlich moeglich",
      "Bei eingeschraenktem Verstaendnis mit Unterstuetzungsperson bei zeitgleicher raeumlicher Anwesenheit des Versicherten",
    ],
  },
  {
    kuerzel: "VFKa/b",
    gebuehrenNr: null,
    bewertung: "12 / 6",
    beschreibung: "Videofallkonferenz mit Unterstuetzungspersonen",
    system: "GKV",
    anmerkungen: [
      "Nur als alleinige Leistung",
      "3x/Quartal je Versicherten, wenn persoenlicher Kontakt mit ZA in letzten 3 Quartalen (aktuelles Quartal zaehlt mit)",
    ],
  },
  {
    kuerzel: "KslKb",
    gebuehrenNr: "182b",
    bewertung: 16,
    beschreibung: "Telekonsil bzw. Videokonsil mit Aerzten / Zahnaerzten",
    system: "GKV",
    anmerkungen: [
      "Im Rahmen eines Kooperationsvertrages nach § 119(1) SGB V",
      "Konsil KslKa (182a) persoenlich oder fernmuendlich ohne Videodienst",
      "Fuer zeitversetztes Telekonsil aktuell noch keine Dienste verfuegbar",
    ],
  },
  {
    kuerzel: "TZ",
    gebuehrenNr: null,
    bewertung: 16,
    beschreibung: "Technikzuschlag",
    system: "GKV",
    anmerkungen: [
      "Je Praxis pro Quartal neben den ersten 10 Positionen nach VS, VFK, KslKb (181b), KslKb (182b)",
    ],
  },
];

// ============================================================================
// SYNOPSE PAGE 1 — BESUCHSLEISTUNGEN (Privatwohnung)
// ============================================================================

export interface BesuchsPosition {
  leistung: string;
  privatwohnung: { kuerzel: string; posNr: string; bewertung: number };
  einrichtungGelegentlich: { kuerzel: string; posNr: string; bewertung: number };
  einrichtungRegelmaessig: { kuerzel: string; posNr: string; bewertung: number };
  pflegeeinrichtungMitVertrag: { kuerzel: string; posNr: string; bewertung: number };
  anmerkungen: string[];
}

export const BESUCHSLEISTUNGEN: BesuchsPosition[] = [
  {
    leistung: "Besuch",
    privatwohnung: { kuerzel: "Bs1", posNr: "151", bewertung: 38 },
    einrichtungGelegentlich: { kuerzel: "Bs1", posNr: "151", bewertung: 38 },
    einrichtungRegelmaessig: { kuerzel: "Bs3a", posNr: "153a", bewertung: 30 },
    pflegeeinrichtungMitVertrag: { kuerzel: "Bs4", posNr: "154", bewertung: 30 },
    anmerkungen: [
      "§ 71(2) bzw. (4) SGB XI (Einrichtung)",
      "§ 119b(1) SGB V (Kooperationsvertrag)",
      "01, Ae1 bei Besuchen nicht zusaetzlich berechenbar",
    ],
  },
  {
    leistung: "Zuschlag (Pflege)",
    privatwohnung: { kuerzel: "PBA1a", posNr: "171a", bewertung: 37 },
    einrichtungGelegentlich: { kuerzel: "PBA1a", posNr: "171a", bewertung: 37 },
    einrichtungRegelmaessig: { kuerzel: "ZBs3a", posNr: "173a", bewertung: 32 },
    pflegeeinrichtungMitVertrag: { kuerzel: "SP1a", posNr: "172a", bewertung: 40 },
    anmerkungen: [
      "Zuschlaege nur abrechenbar bei Pflegegrad oder Eingliederungshilfe",
    ],
  },
  {
    leistung: "Besuch je weiteren",
    privatwohnung: { kuerzel: "Bs2a", posNr: "152a", bewertung: 34 },
    einrichtungGelegentlich: { kuerzel: "Bs2b", posNr: "152b", bewertung: 26 },
    einrichtungRegelmaessig: { kuerzel: "Bs3b", posNr: "153b", bewertung: 26 },
    pflegeeinrichtungMitVertrag: { kuerzel: "Bs5", posNr: "155", bewertung: 26 },
    anmerkungen: [],
  },
  {
    leistung: "Zuschlag je weiteren (Pflege)",
    privatwohnung: { kuerzel: "PBA1b", posNr: "171b", bewertung: 30 },
    einrichtungGelegentlich: { kuerzel: "PBA1b", posNr: "171b", bewertung: 30 },
    einrichtungRegelmaessig: { kuerzel: "ZBs3b", posNr: "173b", bewertung: 24 },
    pflegeeinrichtungMitVertrag: { kuerzel: "SP1b", posNr: "172b", bewertung: 32 },
    anmerkungen: [],
  },
];

// ============================================================================
// SYNOPSE PAGE 2 — ZUGEHENDE VERSORGUNG (alle Settings)
// Columns: GKV zu Hause/im Heim, im Heim ohne Vertrag, im Heim MIT Vertrag, PKV
// ============================================================================

export interface ZugehendePosition {
  leistung: string;
  gkvZuHause: { kuerzel: string; posNr: string; punkte: number } | null;
  gkvHeimOhneVertrag: { kuerzel: string; posNr: string; punkte: number } | null;
  gkvHeimMitVertrag: { kuerzel: string; posNr: string; punkte: number } | null;
  pkv: { posNr: string } | null;
  anmerkungen: string[];
}

export const ZUGEHENDE_POSITIONEN: ZugehendePosition[] = [
  {
    leistung: "Besuch 1.",
    gkvZuHause: { kuerzel: "Bs1", posNr: "151", punkte: 38 },
    gkvHeimOhneVertrag: { kuerzel: "Bs3a", posNr: "153a", punkte: 30 },
    gkvHeimMitVertrag: { kuerzel: "Bs4", posNr: "154", punkte: 30 },
    pkv: { posNr: "Ae50" },
    anmerkungen: [
      "GKV: 01/Ae1 nicht berechenbar",
      "GKV: BsAuH — zu Hause/Einrichtung",
      "PKV: Ae1/3/5 nicht berechenbar",
      "PKV: zusaetzlich GOG bzw. Ae (1fach) moeglich",
      "PKV: Einrichtung gilt als 'soziale Gemeinschaft' — alle Ae50",
      "PKV: Ae4, wenn regelmaessig & nach Vereinbarung",
    ],
  },
  {
    leistung: "Besuch 2.-n.",
    gkvZuHause: { kuerzel: "Bs2a/b", posNr: "152a/b", punkte: 34 },
    gkvHeimOhneVertrag: { kuerzel: "Bs3b", posNr: "153b", punkte: 26 },
    gkvHeimMitVertrag: { kuerzel: "Bs5", posNr: "155", punkte: 26 },
    pkv: { posNr: "Ae51" },
    anmerkungen: [],
  },
  {
    leistung: "Zu Pflege 1.",
    gkvZuHause: { kuerzel: "PBA1a", posNr: "171a", punkte: 37 },
    gkvHeimOhneVertrag: { kuerzel: "ZBs3a", posNr: "173a", punkte: 32 },
    gkvHeimMitVertrag: { kuerzel: "SP1a", posNr: "172a", punkte: 40 },
    pkv: null,
    anmerkungen: [
      "PBA & ZBs3 nur abrechenbar bei Pflegegrad oder Eingliederungshilfe",
    ],
  },
  {
    leistung: "Zu Pflege 2.-n.",
    gkvZuHause: { kuerzel: "PBA1b", posNr: "171b", punkte: 30 },
    gkvHeimOhneVertrag: { kuerzel: "ZBs3b", posNr: "173b", punkte: 24 },
    gkvHeimMitVertrag: { kuerzel: "SP1b", posNr: "172b", punkte: 32 },
    pkv: null,
    anmerkungen: [],
  },
  {
    leistung: "Zu Zeit/Tag 1.",
    gkvZuHause: { kuerzel: "ZBs1a-f", posNr: "161a-f", punkte: 0 },
    gkvHeimOhneVertrag: null, // not available for Heim ohne Vertrag
    gkvHeimMitVertrag: { kuerzel: "ZBs1a-f", posNr: "161a-f", punkte: 0 },
    pkv: { posNr: "E-H" },
    anmerkungen: ["unverzueglich — Uhrzeit & Wochentag", "See ZEITZUSCHLAEGE table"],
  },
  {
    leistung: "Zu Zeit/Tag 2.-n.",
    gkvZuHause: { kuerzel: "ZBs2a-f", posNr: "162a-f", punkte: 0 },
    gkvHeimOhneVertrag: null,
    gkvHeimMitVertrag: { kuerzel: "ZBs2a-f", posNr: "162a-f", punkte: 0 },
    pkv: { posNr: "E-H" },
    anmerkungen: ["unverzueglich — Uhrzeit & Wochentag"],
  },
  {
    leistung: "Zu Kinder bis 4 Jahre",
    gkvZuHause: { kuerzel: "ZKi", posNr: "165", punkte: 14 },
    gkvHeimOhneVertrag: { kuerzel: "ZKi", posNr: "165", punkte: 14 },
    gkvHeimMitVertrag: { kuerzel: "ZKi", posNr: "165", punkte: 14 },
    pkv: { posNr: "K2" },
    anmerkungen: [],
  },
  {
    leistung: "Mundgesundheit Status/Plan",
    gkvZuHause: { kuerzel: "PBa", posNr: "174a", punkte: 20 },
    gkvHeimOhneVertrag: { kuerzel: "PBa", posNr: "174a", punkte: 20 },
    gkvHeimMitVertrag: { kuerzel: "PBa", posNr: "174a", punkte: 20 },
    pkv: { posNr: "Ae4 oder Ae15" },
    anmerkungen: [
      "GKV: 1/KHJ",
      "Nicht mit IP1/2, FU1/2, MHU, UPTa/b",
    ],
  },
  {
    leistung: "Mundgesundheit Aufklaerung",
    gkvZuHause: { kuerzel: "PBb", posNr: "174b", punkte: 26 },
    gkvHeimOhneVertrag: { kuerzel: "PBb", posNr: "174b", punkte: 26 },
    gkvHeimMitVertrag: { kuerzel: "PBb", posNr: "174b", punkte: 26 },
    pkv: null,
    anmerkungen: ["GKV: 1/KHJ, wenn nicht bereits 107"],
  },
  {
    leistung: "Zst — 2 mal im Jahr!",
    gkvZuHause: { kuerzel: "PBZst", posNr: "107a", punkte: 16 },
    gkvHeimOhneVertrag: { kuerzel: "PBZst", posNr: "107a", punkte: 16 },
    gkvHeimMitVertrag: { kuerzel: "PBZst", posNr: "107a", punkte: 16 },
    pkv: { posNr: "4050/5" },
    anmerkungen: ["GKV: 1/KHJ, wenn nicht bereits 107"],
  },
  {
    leistung: "Konsil/Telekonsil",
    gkvZuHause: { kuerzel: "Ksla/b*", posNr: "181a/b*", punkte: 14 },
    gkvHeimOhneVertrag: { kuerzel: "Ksla/b*", posNr: "181a/b*", punkte: 14 },
    gkvHeimMitVertrag: { kuerzel: "KslKa/b*", posNr: "182a/b*", punkte: 14 },
    pkv: { posNr: "Ae60" },
    anmerkungen: [
      "GKV: bei Telekonsil KsIb (181b) oder KslKb (182b) — Technikzuschlag zusaetzlich moeglich",
    ],
  },
  {
    leistung: "Videosprechstunde",
    gkvZuHause: { kuerzel: "VS +TZ*", posNr: null!, punkte: 16 },
    gkvHeimOhneVertrag: { kuerzel: "VS +TZ*", posNr: null!, punkte: 16 },
    gkvHeimMitVertrag: { kuerzel: "VS +TZ*", posNr: null!, punkte: 16 },
    pkv: null,
    anmerkungen: [
      "Nur als alleinige Leistung — Ausnahme: 174b bei Quarantaene",
    ],
  },
  {
    leistung: "Videofallkonferenz",
    gkvZuHause: { kuerzel: "VFK +TZ*", posNr: null!, punkte: 12 },
    gkvHeimOhneVertrag: { kuerzel: "VFK +TZ*", posNr: null!, punkte: 12 },
    gkvHeimMitVertrag: { kuerzel: "VFK +TZ*", posNr: null!, punkte: 12 },
    pkv: null,
    anmerkungen: [
      "Nur als alleinige Leistung",
      "3x/Quartal wenn persoenlicher Kontakt mit ZA in letzten 3 Quartalen",
    ],
  },
  {
    leistung: "Technikzuschlag",
    gkvZuHause: { kuerzel: "TZ", posNr: null!, punkte: 16 },
    gkvHeimOhneVertrag: { kuerzel: "TZ", posNr: null!, punkte: 16 },
    gkvHeimMitVertrag: { kuerzel: "TZ", posNr: null!, punkte: 16 },
    pkv: null,
    anmerkungen: [
      "* je Praxis pro Quartal neben den ersten 10 Positionen nach VS, VFK, KslKb (181b), KslKb (182b)",
    ],
  },
  {
    leistung: "Tel Pflege/Betreuer",
    gkvZuHause: { kuerzel: "Ber", posNr: "Ae1", punkte: 9 },
    gkvHeimOhneVertrag: { kuerzel: "Ber", posNr: "Ae1", punkte: 9 },
    gkvHeimMitVertrag: { kuerzel: "Ber", posNr: "Ae1", punkte: 9 },
    pkv: { posNr: "Ae1/Ae3" },
    anmerkungen: [],
  },
  {
    leistung: "Bericht/Kardexeintrag",
    gkvZuHause: { kuerzel: "Ae70", posNr: "7700", punkte: 5 },
    gkvHeimOhneVertrag: { kuerzel: "Ae70", posNr: "7700", punkte: 5 },
    gkvHeimMitVertrag: { kuerzel: "Ae70", posNr: "7700", punkte: 5 },
    pkv: { posNr: "Ae70" },
    anmerkungen: [],
  },
  {
    leistung: "Tel/Versand/Porto",
    gkvZuHause: null,
    gkvHeimOhneVertrag: null,
    gkvHeimMitVertrag: null,
    pkv: { posNr: "§3&4" },
    anmerkungen: ["Nur PKV: GOZ § 3 und 4 (602)"],
  },
];

// ============================================================================
// SYNOPSE PAGE 3 — ZEITZUSCHLAEGE GKV (Besuch 161a-f / 162a-f)
// ============================================================================

export interface ZeitZuschlag {
  wochentagUhrzeit: string;
  erstbesuch: { kuerzel: string; punkte: number } | null;
  folgebesuch: { kuerzel: string; punkte: number } | null;
}

export const ZEITZUSCHLAEGE_GKV: ZeitZuschlag[] = [
  {
    wochentagUhrzeit: "am Tage und der Woche",
    erstbesuch: null,
    folgebesuch: null,
  },
  {
    wochentagUhrzeit: "dringend, unverzueglich",
    erstbesuch: { kuerzel: "ZBs1a", punkte: 18 },
    folgebesuch: { kuerzel: "ZBs2a", punkte: 9 },
  },
  {
    wochentagUhrzeit: "Nacht, zwischen 20-22 / 6-8 Uhr",
    erstbesuch: { kuerzel: "ZBs1b", punkte: 29 },
    folgebesuch: { kuerzel: "ZBs2b", punkte: 15 },
  },
  {
    wochentagUhrzeit: "Nacht, zwischen 22-6 Uhr",
    erstbesuch: { kuerzel: "ZBs1c", punkte: 50 },
    folgebesuch: { kuerzel: "ZBs2c", punkte: 25 },
  },
  {
    wochentagUhrzeit: "Samstag, Sonn- & Feiertag",
    erstbesuch: { kuerzel: "ZBs1d", punkte: 38 },
    folgebesuch: { kuerzel: "ZBs2d", punkte: 19 },
  },
  {
    wochentagUhrzeit: "Samstag, Sonn- & Feiertag, 20-22 / 6-8 Uhr",
    erstbesuch: { kuerzel: "ZBs1e", punkte: 67 },
    folgebesuch: { kuerzel: "ZBs2e", punkte: 34 },
  },
  {
    wochentagUhrzeit: "Samstag, Sonn- & Feiertag, 22-6 Uhr",
    erstbesuch: { kuerzel: "ZBs1f", punkte: 88 },
    folgebesuch: { kuerzel: "ZBs2f", punkte: 44 },
  },
];

// Note: a nicht neben b-f (Zeitzuschlaege)

// ============================================================================
// SYNOPSE PAGE 3 — ZUSCHLAEGE PKV (Ae1/3/4/5/6, Ae50/51, Ae48/60)
// ============================================================================

export interface PKVZuschlag {
  zuCode: string;
  wochentagUhrzeit: string;
  ae1_3_4_5_6: number | null;
  ae50_51: number | null;
}

export const PKV_ZUSCHLAEGE: PKVZuschlag[] = [
  {
    zuCode: "A",
    wochentagUhrzeit: "ausserhalb der Sprechstunde",
    ae1_3_4_5_6: 70,
    ae50_51: null,
  },
  {
    zuCode: "B",
    wochentagUhrzeit: "20-22 / 6-8 Uhr — ausserhalb Sprechstunde",
    ae1_3_4_5_6: 180,
    ae50_51: null,
  },
  {
    zuCode: "C",
    wochentagUhrzeit: "22-6 Uhr",
    ae1_3_4_5_6: 320,
    ae50_51: null,
  },
  {
    zuCode: "D",
    wochentagUhrzeit: "Samstag, Sonn- & Feiertag",
    ae1_3_4_5_6: 220,
    ae50_51: null,
  },
  {
    zuCode: "K1",
    wochentagUhrzeit: "bei Kindern bis 4 Jahre (Ae5/6)",
    ae1_3_4_5_6: 120,
    ae50_51: null,
  },
  {
    zuCode: "E",
    wochentagUhrzeit: "dringend, unverzueglich",
    ae1_3_4_5_6: null,
    ae50_51: 160,
  },
  {
    zuCode: "F",
    wochentagUhrzeit: "20-22 / 6-8 Uhr",
    ae1_3_4_5_6: null,
    ae50_51: 260,
  },
  {
    zuCode: "G",
    wochentagUhrzeit: "22-6 Uhr",
    ae1_3_4_5_6: null,
    ae50_51: 450,
  },
  {
    zuCode: "H",
    wochentagUhrzeit: "Samstag, Sonn- & Feiertag",
    ae1_3_4_5_6: null,
    ae50_51: 340,
  },
  {
    zuCode: "K2",
    wochentagUhrzeit: "bei Kindern bis 4 Jahre",
    ae1_3_4_5_6: null,
    ae50_51: 120,
  },
];

// Ae48 nur Zuschlaege E, K2
// Ae60 nur Zuschlaege E, F, G, H

// ============================================================================
// SYNOPSE PAGE 3 — WEGEGELDER GKV & PKV (GOZ § 8 Abs. 2 & 3)
// ============================================================================

export interface Wegegeld {
  posNr: string;
  entfernung: string;
  uhrzeit: string;
  betragEUR: number;
}

export const WEGEGELDER: Wegegeld[] = [
  { posNr: "7810", entfernung: "bis 2 km", uhrzeit: "Tag", betragEUR: 4.3 },
  { posNr: "7811", entfernung: "bis 2 km", uhrzeit: "20-8 Uhr", betragEUR: 8.6 },
  { posNr: "7820", entfernung: "2-5 km", uhrzeit: "Tag", betragEUR: 8.0 },
  { posNr: "7821", entfernung: "2-5 km", uhrzeit: "20-8 Uhr", betragEUR: 12.3 },
  { posNr: "7830", entfernung: "5-10 km", uhrzeit: "Tag", betragEUR: 12.3 },
  { posNr: "7831", entfernung: "5-10 km", uhrzeit: "20-8 Uhr", betragEUR: 18.4 },
  { posNr: "7840", entfernung: "10-25 km", uhrzeit: "Tag", betragEUR: 18.4 },
  { posNr: "7841", entfernung: "10-25 km", uhrzeit: "20-8 Uhr", betragEUR: 30.7 },
];

export const WEGEGELD_RULES = {
  bemessung: "Radius & Tag/Nacht",
  anteilig: "anteilig fuer jeden Besuchten",
  ueberRadius:
    "> 25 km — siehe Reiseentschaedigung (Pos 7928/7929/7930)",
  reiseentschaedigung: {
    "7928": {
      beschreibung: "Abwesenheit bis 8h/d",
      betragProKm: 0.42,
      grundgebuehr: 56.0,
    },
    "7929": {
      beschreibung: "Abwesenheit > 8h/d",
      betragProKm: 0.42,
      grundgebuehr: 112.5,
    },
    "7930": { beschreibung: "Uebernachtungskosten" },
  },
} as const;

// ============================================================================
// BEMA 174 — KOMMENTARAUSZUG (Liebold/Raff/Wissing)
// ============================================================================

export const BEMA_174_KOMMENTAR = {
  position: "174",
  titel:
    "Praeventive zahnaerztliche Leistungen nach § 22a SGB V zur Verhuetung von Zahnerkrankungen bei Versicherten mit Pflegegrad oder Eingliederungshilfe",

  teilleistungen: {
    "174a": {
      abkuerzung: "PBa",
      bewertungszahl: 20,
      leistungsinhalt: [
        "Erhebung eines Mundgesundheitsstatus nach § 4 der Richtlinie",
        "Beurteilung des Pflegezustands der Zaehne, des Zahnfleischs, der Mundschleimhaut und des Zahnersatzes",
        "Dokumentation anhand des vereinbarten Formblatts (§ 8 der Richtlinie)",
        "Erstellung eines individuellen Mundgesundheitsplans gemaess § 5 der Richtlinie",
      ],
      mundgesundheitsplan: [
        "Empfohlene Massnahmen und Mittel zur Foerderung der Mundgesundheit",
        "Taegliche Mund-/Prothesenhygiene, Fluoridanwendung",
        "Zahngesunde Ernaehrung (verringerter Konsum zuckerhaltiger Speisen)",
        "Verhinderung/Linderung von Mundtrockenheit/Xerostomie",
        "Empfohlene Durchfuehrungs-/Anwendungsfrequenz",
        "Hinweis ob Patient selbst, mit Unterstuetzung, oder vollstaendig durch Pflegeperson durchfuehren soll",
        "Hinweis zur Notwendigkeit von Ruecksprachen mit weiteren Beteiligten",
      ],
      delegation:
        "NICHT an Praxispersonal delegierbar (Leistungsbestandteile der 174a)",
    },
    "174b": {
      abkuerzung: "PBb",
      bewertungszahl: 26,
      leistungsinhalt: [
        "Mundgesundheitsaufklaerung ueber Angaben des Mundgesundheitsplans",
        "Demonstration und praktische Anleitung zur Reinigung der Zaehne und des Zahnersatzes",
        "Reinigung des Zahnfleischs und der Mundschleimhaut",
        "Praktische Unterweisung zur Prothesenreinigung",
        "Handhabung des herausnehmbaren Zahnersatzes",
        "Erlaeuterung des Nutzens dieser Massnahmen",
        "Motivation des Versicherten und der Pflege-/Unterstuetzungspersonen",
      ],
      delegation:
        "An entsprechend geschultes Praxispersonal delegierbar, ABER: Zahnarzt muss in unmittelbarer raeumlicher Naehe sein",
    },
  },

  abrechnungsregeln: {
    frequenz: "1x je Kalenderhalbjahr je Teilleistung (174a und 174b)",
    abstandsfrist: "Kein Mindestabstand von 4 Monaten erforderlich!",
    nichtNeben: [
      "IP 1 (Individualprophylaxe)",
      "IP 2 (Fluoridierung)",
      "FU 1 (Frueherkennungsuntersuchung)",
      "FU 2 (Frueherkennungsuntersuchung)",
      "Alle am selben Tag erbracht",
    ],
    zusaetzlichAbrechenbar: [
      "Weitere zahnaerztliche Leistungen des BEMA",
      "Ggf. Besuchs- und Zuschlagsgebuehren",
      "Ggf. Wegegeld bzw. Reiseentschaedigung gemaess § 8 Abs. 2 und 3 GOZ",
    ],
    abrechnung: [
      "Ueber KCH mittels elektronischer Datenuebermittlung (BEMA-Teil 1 — KCH-Quartalsabrechnung)",
      "Im Rahmen der Abrechnung fuer Kiefergelenkserkrankung/Kieferbruch: BEMA-Teil 2 (KG/KB-Monatsabrechnung)",
    ],
    besuchsleistungen:
      "01, Ae1 bei Besuchen nicht zusaetzlich berechenbar. Nur Besuchsgebuehren.",
  },

  zahnbelagEntfernung: {
    position: "107a",
    kuerzel: "PBZst",
    bewertungszahl: 16,
    frequenz: "1x je Kalenderhalbjahr",
    hinweis:
      "Systematischer Zusammenhang mit BEMA-Nr. 107a (nicht 174). Entfernung harter Zahnbelaege die gemaess § 7 der Richtlinie einmal je Kalenderhalbjahr erfolgen kann.",
  },
} as const;

// ============================================================================
// GOAe Nr. 4 — PKV-Pendant zu BEMA 174 (Mundgesundheitsstatus)
// Source: SZM 2020 article "Mundgesundheitsstatus, Plan und Aufklaerung"
// ============================================================================

export const GOAE_4_PKV = {
  position: "Ae4",
  titel:
    "Erhebung der Fremdanamnese/Instruktion der Bezugsperson(en) — im Zusammenhang mit der Behandlung eines Kranken",
  punktzahl: 220,
  punktwertCt: 5.82873,
  gebuehr: {
    faktor1_0: 12.82,
    faktor2_3: 29.49,
    faktor3_5: 44.87,
  },

  berechenbarFuer: [
    "Erhebung einer Fremdanamnese ueber einen Kranken",
    "Instruktionen an die Bezugsperson(en) eines Kranken",
    "Im Behandlungsfall (= 1 Monat) nur einmal",
    "Nach Ablauf eines Monats in demselben Behandlungsfall erneut moeglich",
  ],
  zusaetzlichBerechenbar: [
    "Besuch eines Patienten auf einer Pflegestation (GOAe-Nr. 48)",
    "Besuch, einschliesslich Beratung und symptombezogene Untersuchung (GOAe-Nr. 50)",
    "Besuch eines weiteren Kranken (GOAe-Nr. 51)",
    "Konsil (GOAe-Nr. 60)",
    "Wegegeld nach § 8 der GOZ",
    "Eingehende Untersuchung (GOZ-Nr. 0010)",
    "Symptombezogene Untersuchung (GOAe-Nr. 5)",
    "Beratung (GOAe-Nr. 1)",
    "Prophylaktische Leistungen (GOZ-Nrn. 1000 bis 1040)",
    "Weitere zahnaerztliche und aerztliche Behandlungsmassnahmen nach GOZ und GOAe",
  ],
  nichtBerechenbar: [
    "Ausstellung von Wiederholungsrezepten/Ueberweisungen (GOAe-Nr. 2)",
    "Messung von Koerperzustaenden ohne Beratung (GOAe-Nr. 2)",
    "Eingehende, das gewoehnliche Mass uebersteigende Beratung — auch mittels Fernsprecher (GOAe-Nr. 3)",
    "Symptombezogene Untersuchung (GOAe-Nr. 5) [wenn nur diese erbracht]",
    "Vollstaendige koerperliche Untersuchung des stomatognathen Systems (GOAe-Nr. 6)",
    "Terminvereinbarungen oder andere Verwaltungstaetigkeiten",
    "Mehr als einmal je Behandlungsfall (in der GOAe definiert als ein Monat fuer die Behandlung derselben Erkrankung)",
    "Neben der Leistung nach GOAe-Nr. 15 im Behandlungsfall",
  ],
  steigerungsfaktorGruende: [
    "Komplizierte Grunderkrankungen mit entsprechend umfangreicher Fremdanamnese",
    "Ueber viele Jahre hinweg andauernde Entwicklung der Erkrankung",
    "Selbst mit 'uebersetzendem' Bezugsperson (Gebaerdendolmetscher) oder Kommunikationshilfen — erhebliche Sprachprobleme",
    "Grosse Anzahl mit- und vorbehandelnder Aerzte (multiple Medikationen/Therapien)",
    "Vermittlung besonders komplizierter Sachverhalte",
    "Fuehrung schwieriger Bezugspersonen",
  ],
  zuschlaege: {
    A: "Ausserhalb der Sprechstunde",
    B: "20-22 / 6-8 Uhr ausserhalb Sprechstunde",
    C: "22-6 Uhr",
    D: "Samstag, Sonn- & Feiertag",
    K1: "Bei Kindern bis 4 Jahre (Ae5/6) — Nrn. 5 bis 8 vorbehalten",
  },
  nichtNebenGOAe15:
    "GOAe-Nr. 4 kann nicht neben GOAe-Nr. 15 im selben Behandlungsfall abgerechnet werden",
} as const;

// ============================================================================
// TELEMEDIZIN POSITIONEN (Detail from Videosprechstunde article)
// ============================================================================

export const TELEMEDIZIN_DETAIL = {
  quelle: "SZM 2020;8(3):139-141",
  rechtsgrundlage: [
    "Pflegepersonal-Staerkungsgesetz (PpSG)",
    "Digitale-Versorgung-Gesetz (DVG)",
    "§ 87 Abs. 2k und 2l SGB V",
    "Telekonsilien-Vereinbarung gemaess § 291g Abs. 6 SGB V",
    "Anlage 16 BMV-Z (Videodienst Voraussetzung)",
  ],
  positionen: [
    {
      kuerzel: "VS",
      beschreibung: "Videosprechstunde",
      bewertungszahl: 16,
      regeln: [
        "Nur als alleinige Leistung erbring- und abrechenbar",
        "Ausnahme: 174b bei Quarantaene/meldepflichtiger Krankheit zusaetzlich",
        "Bei eingeschraenktem Verstaendnis: raeumliche und zeitgleiche Anwesenheit der Pflege-/Unterstuetzungsperson",
        "Zertifizierter Videodienstleister erforderlich (Liste bei KZBV)",
        "Dokumentation separat und schriftlich in Patientenakte — Aufzeichnung (Ton/Bild) NICHT erlaubt",
        "Abrechnung einer VS im Folgequartal ueber Ersatzverfahren moeglich",
        "Bei VFK sogar Zeitraum der letzten zwei Vorquartale moeglich",
      ],
    },
    {
      kuerzel: "VFKa",
      beschreibung: "Videofallkonferenz — bezueglich eines Versicherten",
      bewertungszahl: 12,
      regeln: [
        "Nur als alleinige Leistung",
        "3x/Quartal je Versicherten, wenn persoenlicher Kontakt mit ZA in letzten 3 Quartalen",
      ],
    },
    {
      kuerzel: "VFKb",
      beschreibung: "Videofallkonferenz — bezueglich jedes weiteren Versicherten",
      bewertungszahl: 6,
      regeln: ["In unmittelbarem zeitlichen Zusammenhang"],
    },
    {
      kuerzel: "181 KsI",
      beschreibung: "Konsiliarische Eroerterung mit Aerzten und Zahnaerzten",
      bewertungszahl: 14,
      regeln: ["a) persoenlich oder fernmuendlich: 14 Punkte"],
    },
    {
      kuerzel: "181b KsIb",
      beschreibung: "Konsiliarische Eroerterung — im Rahmen eines Telekonsils",
      bewertungszahl: 16,
      regeln: ["b) im Rahmen eines Telekonsils: 16 Punkte"],
    },
    {
      kuerzel: "182 KsIK",
      beschreibung:
        "Konsiliarische Eroerterung mit Aerzten und Zahnaerzten im Rahmen eines Kooperationsvertrages nach § 119b Abs. 1 SGB V",
      bewertungszahl: 14,
      regeln: ["a) persoenlich oder fernmuendlich: 14 Punkte"],
    },
    {
      kuerzel: "182b KsIKb",
      beschreibung: "Konsiliarische Eroerterung (Kooperationsvertrag) — Telekonsil",
      bewertungszahl: 16,
      regeln: ["b) im Rahmen eines Telekonsils: 16 Punkte"],
    },
    {
      kuerzel: "TZ",
      beschreibung:
        "Technikzuschlag fuer Videosprechstunde, Videofallkonferenz oder Videokonsil",
      bewertungszahl: 16,
      regeln: [
        "Nur fuer die ersten 10 Telemedizinleistungen im Quartal!",
        "Gilt neben VS, VFK, KslKb (181b), KslKb (182b)",
      ],
    },
  ],
  patientengruppen: {
    vsUndVfk:
      "Nur bei gesetzlich Versicherten mit Pflegegrad oder Eingliederungshilfe ODER im Rahmen eines Kooperationsvertrages",
    konsilleistungen: "Fuer alle gesetzlich Versicherten offen",
  },
} as const;

// ============================================================================
// KRANKENBEFOERDERUNG — Verordnungsregeln
// ============================================================================

export const KRANKENBEFOERDERUNG = {
  quelle: "KZV BW / LZK BW, Stand 03/2021",
  rechtsgrundlage:
    "Krankentransport-Richtlinie, § 92 Abs. 1 Satz 2 Nr. 12 SGB V",
  formular: "Muster 4 — Verordnung einer Krankenbefoerderung",

  anspruchsberechtigung: {
    genehmigungsfrei: [
      "Einstufungsbescheid gemaess SGB XI in Pflegegrad 3*, 4 oder 5",
      "Schwerbehindertenausweis mit Merkzeichen aG (aussergewoehnliche Gehbehinderung)",
      "Schwerbehindertenausweis mit Merkzeichen Bl (Blindheit)",
      "Schwerbehindertenausweis mit Merkzeichen H (Hilflosigkeit)",
      "Vergleichbare Mobilitaetsbeeintraechtigung + ambulante Behandlung > 6 Monate",
    ],
    pflegegrad3Sonderregel:
      "* PG 3: Zusaetzlich dauerhafte (min. 6 Monate) koerperliche, kognitive oder psychische Beeintraechtigung der Mobilitaet erforderlich (Einstufung bis 31.12.2016 in Pflegestufe 2)",
    genehmigungspflichtig: [
      "Hochfrequente Behandlung (Dialyse, onkol. Chemo-/Strahlentherapie) — fuer ZA regelmaessig NICHT relevant",
      "Vergleichbarer Ausnahmefall — fuer ZA regelmaessig NICHT relevant",
      "Dauerhafte Mobilitaetsbeeintraechtigung vergleichbar mit b) + Behandlungsdauer min. 6 Monate",
      "Anderer Grund fuer Fahrt mit KTW (fachgerechtes Lagern, Tragen, Heben erforderlich)",
    ],
  },

  befoerderungsmittel: {
    taxi: {
      beschreibung: "Taxi/Mietwagen",
      wann: "gehfaehig, aber nicht allein mit OEPNV/KFZ",
      besetzung: "1 Person, ggf. Treppensteiger",
      kosten: "je nach Strecke und Zeit",
    },
    rollstuhltaxi: {
      beschreibung: "Rollstuhltaxi",
      wann: "mit Rollstuhl",
      besetzung: "1 Person, ggf. Treppensteiger",
      kosten: "15-20 EUR Grundgebuehr + 1-2 EUR/km",
    },
    liegendtaxi: {
      beschreibung: "Liegendtaxi",
      wann: "liegend",
      besetzung: "2 Personen, Trageleistung",
      kosten: "im Liegendtaxi-Tarif",
    },
    ktw: {
      beschreibung: "Krankentransportwagen (KTW)",
      wann: "liegend und/oder dement, aspirationsgefaehrdet, infektioes",
      besetzung: "2 Personen + Trageleistung + Betreuung, Hygieneanforderungen, O2, Notfallkoffer",
      kosten: "100-150 EUR pro Fahrt inkl. 50km + 1-2 EUR/km",
    },
    rtw: {
      beschreibung: "Rettungstransportwagen (RTW)",
      wann: "bedarf Erste-Hilfe bzw. Massnahmen zur Aufrechterhaltung Vitalfunktionen",
      besetzung: "2 Personen + Trageleistung + notfallmedizinische Betreuung",
      kosten: "400-600 EUR pro Fahrt",
    },
  },

  zuzahlung: {
    prozent: 10,
    minEUR: 5,
    maxEUR: 10,
    belastungsgrenze: "2% der jaehrlichen Bruttoeinnahmen (chronisch krank: 1%)",
    befreiungMoeglich: true,
  },

  genehmigung: {
    jahresgenehmigung:
      "Im Rahmen der ersten notwendigen Befoerderung spezielle Genehmigung bei der Krankenkasse fuer das gesamte Kalenderjahr beantragen",
    hinweis:
      "Pruefen ob bestehende Genehmigung auch Befoerderungen zum Zahnarzt umfasst — teilweise nur fuer einen einzelnen Arzt",
    jedeNotwendigeVerordnung:
      "Jede notwendige Befoerderung benoetigt eigene Verordnung (fuer das Befoerderungsunternehmen)",
  },

  infektionsgefahr: {
    wichtig:
      "Bei ansteckenden Krankheiten (Corona, MRSA, Tuberkulose, infektioese Darmerkrankungen, HIV, Hepatitis, Windpocken): Krankentransport verordnen! Notwendigkeit eines Transportes in die Praxis besonders sorgfaeltig abwaegen.",
    befoerderungsmittel: "KTW",
    begruendung: "Patient infektioes",
  },
} as const;

// ============================================================================
// WIRTSCHAFTLICHKEITSPRUEFUNG — Hinweise
// ============================================================================

export const WIRTSCHAFTLICHKEITSPRUEFUNG = {
  quelle: "SZM 2020;8(3):143-145 (DGAZ Stellungnahme)",
  grundsatz: {
    rechtsgrundlage: "§ 12 SGB V — Wirtschaftlichkeitsgebot",
    regel:
      "Erbrachte Leistungen muessen ausreichend, zweckmaessig und wirtschaftlich sein und duerfen das Mass des Notwendigen nicht ueberschreiten",
    pruefverfahren:
      "Zufaelligkeitspruefung (Stichprobenpruefung) — 2% der Praxen/Zahnaerzte pro Quartal",
    schwellenwert:
      "Ueberschreitung des durchschnittlichen Vergleichswerts um mehr als das Doppelte = widerlegbare Vermutung unwirtschaftlicher Behandlungsweise",
  },

  praxisbesonderheiten: [
    "Alterskohorte der Patienten (z.B. ueberwiegend Rentner)",
    "Pflegegrad-Anteil im Patientenstamm",
    "Aufsuchende Betreuung als besondere Versorgungsform",
    "Kooperationsvertraege nach § 119b SGB V mit Pflegeeinrichtungen",
    "Fehlende statistisch vergleichbare Bezugsgruppe fuer aufsuchende Zahnaerzte",
  ],

  dokumentation: [
    "Vollstaendige und nachvollziehbare Dokumentation jeder erbrachten Leistung",
    "Wer hat den Besuch veranlasst (Patientenlisten der Heime, Teilnahmeerklaerungen)",
    "Anlassbezogene Anforderung (Schmerzen, Kauverlust) dokumentieren",
    "Wiederholte Besuche begruenden (prothetische Arbeitsschritte, Behandlungsabfolge)",
    "Pflegezustand dokumentieren (Foto des Ausgangsbefunds — Patient nicht erkennbar)",
    "Patientendokumentation: Diagnose und ausreichende Begruendung fuer getroffene Behandlungsmassnahmen",
  ],

  tipps: [
    "Leistungs- und Abrechnungsstatistik quartalsweise analysieren",
    "Vergleichsgruppen und Behandlungsunterschiede verstehen",
    "Praxisbesonderheiten frueh identifizieren und dokumentieren",
    "Versorgungskonzept kritisch hinterfragen — zweckmaessig?",
    "Keine Abrechnungsautomatismen (Leistungsketten) — nur abrechnen was erbracht und dokumentiert wurde",
    "Mobile Einsatz spart Transportkosten — als Argument nutzen",
    "Anwalt mit sozialrechtlicher Kompetenz einschalten",
    "DGAZ-Plattform: www.dgazWP.com",
  ],
} as const;

// ============================================================================
// RECHTLICHE ASPEKTE — Behandlungsverhaeltnis (LZK BW 03/2018)
// ============================================================================

export const RECHTLICHE_ASPEKTE = {
  quelle: "LZK BW 03/2018 — Das Behandlungsverhaeltnis bei Pflegebeduerftigen und bei Menschen mit Behinderung",

  betreuung: {
    voraussetzung:
      "§ 1896 BGB: Volljaehriger Mensch, psychische Krankheit oder koerperliche/geistige/seelische Behinderung, kann eigene Angelegenheiten ganz oder teilweise nicht besorgen",
    aufgabenkreise: [
      "Aufenthaltsbestimmung",
      "Vermoegenssorge",
      "Rentenangelegenheiten",
      "Wohnungs- oder/und Gesundheitssorge",
    ],
    nichtBetreuer: [
      "Paedagogische Betreuer (Heilerziehungspfleger, Sozialpaedagogen) aus Behindertenwohneinrichtung",
      "Altenpfleger und Krankenpfleger aus Alten- und Pflegeheim",
      "Angehoerige (auch erwachsene Kinder) OHNE Betreuung/Vollmacht",
    ],
    praxishinweise: [
      "Telefonisch abfragen: Betreuung/Vollmacht vorhanden? Fuer welche Bereiche? Kontaktdaten?",
      "Betreuerausweis/Vollmacht zeigen lassen und Kopie fuer Akte fertigen",
      "Ggf. separate Betreuer fuer Gesundheitssorge und Vermoegenssorge — beide einbeziehen",
      "Verhinderungsbetreuer beachten (bei Urlaub/Krankheit des Betreuers)",
    ],
  },

  einwilligungsfaehigkeit: {
    definition:
      "Faehigkeit des Betroffenen, in die Verletzung eines ihm zuzurechnenden Rechtsguts einzuwilligen bzw. abzulehnen",
    weiterAlsGeschaeftsfaehigkeit: true,
    pruefung: [
      "Fragen auf den Namen, das Alter, den aktuellen Tag und den Ort",
      "Persoenliche, zeitliche, raeumliche und situative Orientierung pruefen",
      "Im Eingangsgespräch beurteilen",
    ],
    beiZweifel:
      "Ist eine Betreuung/Vollmacht fuer den Aufgabenkreis Gesundheitssorge eingerichtet, ist die Zustimmung des Betreuers/Bevollmaechtigten einzuholen",
    notfall:
      "In einem Notfall wird von einer mutmasslichen Einwilligung ausgegangen — lebensrettende Massnahmen durchfuehren",
  },

  geschaeftsfaehigkeit: {
    relevanz:
      "Honoraranspruch auf ausservertragliche Leistungen/Privatleistungen entsteht nur bei wirksamem Behandlungsvertrag",
    voraussetzung:
      "Patient muss voll geschaeftsfaehig sein oder wirksam vertreten werden",
    beiGeschaeftsunfaehigkeit:
      "Vertrag unwirksam, selbst wenn Geschaeftsunfaehigkeit nicht erkennbar war",
    loesung:
      "Betreuer/Bevollmaechtigter fuer Vermoegenssorge muss Genehmigung erteilen",
  },

  aufklaerung: {
    rechtsgrundlage: "§ 630e BGB — Aufklaerungspflichten",
    anforderungen: [
      "1. Muendlich durch den Behandelnden oder befaehigte Person (NICHT ausschliesslich schriftlich!)",
      "2. Rechtzeitig, damit Patient wohlueberlegte Entscheidung treffen kann",
      "3. Fuer den Patienten verstaendlich",
    ],
    muendlich:
      "'Muendlich' heisst nicht zwingend persoenlich anwesend — telefonische Aufklaerung bei einfachen Eingriffen zulaessig (BGH Az. VI ZR 204/09)",
    betreuung:
      "§ 630e Abs. 4: Ist die Einwilligung eines Berechtigten einzuholen (Betreuer/Bevollmaechtigter), ist dieser aufzuklaeren",
    dokumentation:
      "Einverstaendnis des Betreuers/Bevollmaechtigten schriftlich einholen",
  },

  entscheidungsschema: {
    beschreibung:
      "Uebersichtsschema: Wann Behandlung und Anspruch auf Honorar?",
    schritte: [
      "1. Eingriff in die koerperliche Integritaet? -> Einwilligungsfaehigkeit vorhanden?",
      "2. Ja -> Patient willigt ein? -> Behandlung",
      "3. Nein -> Vollmacht/Betreuung fuer Gesundheitssorge eingerichtet?",
      "4. Ja -> Betreuer/Bevollmaechtigter willigt in Absprache mit dem Betreuten ein? -> Behandlung",
      "5. Nein -> Keine Behandlung (ausser lebensbedrohlicher Notfall)",
      "6. Honoraranspruch: Geschaeftsfaehigkeit vorhanden? Oder Betreuung/Vollmacht fuer Vermoegenssorge?",
      "7. Ja -> Anspruch auf Honorar",
      "8. Nein -> Kein Anspruch auf Honorar",
    ],
  },
} as const;

// ============================================================================
// BETREUUNGSRECHT 2023 (Quintessenz-Artikel, neues Recht seit 01.01.2023)
// ============================================================================

export const BETREUUNGSRECHT_2023 = {
  quelle: "Quintessenz Zahnmedizin 2023;74(9):658-662 (Elsaesser/Oschmann)",
  reformDatum: "01.01.2023",

  wesentlicheAenderungen: [
    "Gesetzliches Vertretungsrecht fuer Ehegatten eingefuehrt (Notfallsituationen + Gesundheits-/Vermoegenssorge, 6 Monate befristet)",
    "Betreuung ist Unterstuetzung, nicht Vertretung (neuer Fokus)",
    "Entscheidungen orientieren sich an Willen und Wuenschen der betreuten Person, nicht an objektivem 'Wohl'",
    "Vorsorgevollmacht: keine Formvorschriften, notarielle Beurkundung empfohlen aber nicht Voraussetzung",
    "Generalvollmacht genuegt fuer zahnaerztliche Behandlungen",
  ],

  aufklaerungsgespraech: {
    pruefung: [
      "Kann der Patient mithilfe adressatengerechter Aufklaerung selbst einwilligen?",
      "Leitlinie 'Einwilligung von Menschen mit Demenz in medizinische Massnahmen'",
      "Kriterien: Informationsverstaendnis, Einsicht, Urteilsvermoegen, Kommunizieren einer Entscheidung",
    ],
    informationsverstaendnis: [
      "Koennen Sie bitte mit eigenen Worten wiederholen, was Sie von der Aufklaerung verstanden haben?",
      "Welche Behandlung habe ich vorgeschlagen?",
      "Welches Ziel hat die Behandlung?",
      "Was ist der Zweck/Sinn der Untersuchung?",
      "Welche Risiken bestehen?",
      "Aus welchem Grund empfehlen wir Ihnen diese Behandlung?",
    ],
    einsicht: [
      "So sehen wir Ihre Erkrankung. Stimmen Sie dem zu oder haben Sie eine andere Einschaetzung?",
      "Wie beurteilen Sie den Zustand Ihrer Zaehne?",
      "Koennen Sie einen moeglichen Nutzen der vorgeschlagenen Behandlung nennen?",
    ],
    urteilsvermoegen: [
      "Was glauben Sie, ist das Beste fuer Sie?",
      "Warum haben Sie diese Entscheidung getroffen?",
      "Koennen Sie Konsequenzen der Entscheidung nennen?",
      "Bitte vergleichen Sie moegliche Konsequenzen miteinander",
      "Welche Auswirkungen haette das auf Ihren Alltag?",
    ],
    betreuterPatient: [
      "Aufklaerungsgespraech idealerweise zu dritt (Patient, Zahnarzt, rechtlicher Vertreter)",
      "Oft nicht realisierbar — dann 2 Aufklaerungsgespraeche: eines mit Patient persoenlich, eines telefonisch mit Betreuer",
      "Beide Gespraeche in Patientenakte dokumentieren",
      "Schriftliche Einwilligungserklaerung nicht vorgeschrieben, aber empfohlen",
      "Einwilligungserklaerung des Vertreters kann per Fax/E-Mail erfolgen (wenn nicht persoenlich beim Aufklaerungsgespraech)",
    ],
  },

  praxishinweise: [
    "Schon auf dem Anamnesebogen: Vorsorgevollmacht/Betreuung vorhanden?",
    "Aufgabenkreise pruefen (Gesundheitssorge + Vermoegenssorge)",
    "Alternative Rechnungsadresse angeben (Rechnungen bleiben oft beim Vertreter liegen)",
    "Vollmacht/Betreuungsurkunde kopieren und zur Patientenakte legen",
    "Kann die betreute Person selbst einwilligen, muss der Betreuer sich gar nicht aeussern",
    "Pflegende Personen (Altenpfleger, Heilerziehungspfleger) sind NICHT die rechtlichen Betreuer — koennen keine rechtwirksamen Entscheidungen treffen",
    "Patienteninformationsboegen in leichter Sprache verwenden (LZK BW: leichtesprache.lzk-bw.de)",
  ],
} as const;

// ============================================================================
// HAUSBESUCHE — Regelungen (LZK BW 03/2021)
// ============================================================================

export const HAUSBESUCHE = {
  quelle: "LZK BW 03/2021 — Hausbesuche & zugehende Betreuung — gut zu wissen!",

  definition:
    "Weggang des Zahnarztes aus seinen Praxisraeumen oder aus seiner Wohnung zum Zweck des Aufsuchens eines Versicherten in dessen Wohnung oder an dessen sonstigem Aufenthaltsort",

  verpflichtung: {
    berufsrechtlich:
      "Keine allgemeine Verpflichtung fuer Hausbesuche in der Berufsordnung. Allgemeine Behandlungspflicht gemaess § 2 Abs. 5 MBO gilt.",
    ablehnung: [
      "Behandlung nicht gewissenhaft und sachgerecht durchfuehrbar",
      "Behandlung nach pflichtgemaesser Interessenabwaegung nicht zumutbar",
      "Kein Vertrauensverhaeltnis zum Patienten",
    ],
    notfall: "Verpflichtung in zahnaerztlichen Notfaellen bleibt unberuehrt",
  },

  vertragszahnaerztlich: {
    rechtsgrundlage: "§ 3 Abs. 2 BMV-Z",
    versorgung: [
      "Versorgung der Versicherten ausserhalb der Praxisraeume",
      "Aufsuchende Versorgung von Versicherten mit Pflegegrad (§ 15 SGB XI)",
      "Aufsuchende Versorgung von Versicherten mit Eingliederungshilfe (§ 53 SGB XII)",
      "Die aufgrund ihrer Pflegebeduerftigkeit, Behinderung oder Einschraenkung die Zahnarztpraxis nicht oder nur mit hohem Aufwand aufsuchen koennen (§ 87 Abs. 2i SGB V)",
      "Aufsuchende Versorgung von pflegebeduerftigen Versicherten in stationaeren Pflegeeinrichtungen im Rahmen eines Kooperationsvertrags (§ 87 Abs. 2j SGB V)",
    ],
  },

  empfehlungen: [
    "Bei Anforderung fuer Hausbesuch: erst pruefen ob Patient in die Praxis kommen kann",
    "Wenn Patient nicht im eigenen Bereich: naeher gelegenen Zahnarzt bitten",
    "Wenn Behandlung vor Ort nicht ordnungsgemaess durchfuehrbar: Hinzuziehung Dritter (Fachzahnarzt, MKG, Klinik)",
    "Zahnmedizinischer Notfall ist juristisch nicht klar definiert — bei Lebensgefahr: Notarzt (112)",
  ],

  personal: {
    arbeitsvertrag:
      "Arbeitsort umfasst Praxis + Besuche ausserhalb (Haeuslichkeit und Pflegeeinrichtungen) — im Arbeitsvertrag festhalten",
    delegation:
      "Nichtzahnaerztliches Personal darf nur unter Aufsicht eines Zahnarztes taetig werden (§ 1 Abs. 5 Zahnheilkundegesetz)",
    naehe:
      "Zahnarzt muss in unmittelbarer raeumlicher Naehe sein, sodass zahnaerztliche Ueberwachung jederzeit gewaehrleistet ist",
  },

  behandlung: {
    hygiene: "Keine abgesenkten Anforderungen an Infektionsschutz und Hygiene ausserhalb der Praxis",
    invasiv: "Invasive Behandlungen ausserhalb der Praxis nur mit Einschraenkungen moeglich",
    empfehlung: "Aufwaendige/invasive Behandlungen besser in Praxis oder Klinik",
  },

  versicherung:
    "Berufshaftpflichtversicherung ueber Art und Umfang der Taetigkeit ausserhalb der Praxis informieren. Evtl. Anpassung des Beitrags.",
} as const;

// ============================================================================
// EXCLUSION RULES — Zusammenfassung aller Ausschlussregeln
// ============================================================================

export const EXCLUSION_RULES = {
  /** Positions that cannot be billed on the same day as BEMA 174a/b */
  nichtNebenBEMA174: ["IP1", "IP2", "FU1", "FU2", "MHU", "UPTa", "UPTb"],

  /** 01/Ae1 nicht bei Besuchsleistungen */
  nichtNeben01Ae1: ["Bs1", "Bs2a", "Bs2b", "Bs3a", "Bs3b", "Bs4", "Bs5"],

  /** VS (Videosprechstunde) ist alleinige Leistung */
  vsAlleinig: {
    ausnahme: "174b bei Quarantaene/meldepflichtiger Krankheit",
  },

  /** VFK ist alleinige Leistung */
  vfkAlleinig: {
    frequenz: "3x/Quartal je Versicherten (bei Kontakt in letzten 3 Quartalen)",
  },

  /** GOAe 4 nicht neben GOAe 15 im Behandlungsfall */
  goae4NichtNebenGoae15: true,

  /** PBZst (107a) nicht wenn bereits Zst (107) */
  pbzstNichtNeben107: true,

  /** PKV: Ae1/Ae3/Ae5 nicht neben Besuchsleistungen */
  pkvNichtNebenBesuch: ["Ae1", "Ae3", "Ae5"],

  /** PKV GOAe-Zuschlaege A-D nur bei Ae1/3/4/5/6, E-H nur bei Ae50/51 */
  pkvZuschlaegeMapping: {
    "A-D": ["Ae1", "Ae3", "Ae4", "Ae5", "Ae6"],
    "E-H": ["Ae50", "Ae51"],
    Ae48: ["E", "K2"],
    Ae60: ["E", "F", "G", "H"],
  },
} as const;

// ============================================================================
// FREQUENCY RULES — Zusammenfassung aller Frequenzregeln
// ============================================================================

export const FREQUENCY_RULES = {
  "174a": {
    frequenz: "1x je Kalenderhalbjahr",
    hinweis: "Kein Mindestabstand von 4 Monaten!",
  },
  "174b": {
    frequenz: "1x je Kalenderhalbjahr",
    hinweis: "Kein Mindestabstand von 4 Monaten!",
  },
  "107a": {
    frequenz: "1x je Kalenderhalbjahr",
    hinweis: "Nicht, wenn bereits 107 (Zst) abgerechnet",
  },
  VS: {
    frequenz: "unbegrenzt (als alleinige Leistung)",
    hinweis: "Abrechnung auch im Folgequartal ueber Ersatzverfahren moeglich",
  },
  VFK: {
    frequenz: "3x je Quartal je Versicherten",
    voraussetzung:
      "Persoenlicher Kontakt mit ZA in letzten 3 Quartalen (aktuelles zaehlt mit)",
  },
  TZ: {
    frequenz: "10x je Quartal je Praxis",
    hinweis: "Neben den ersten 10 Telemedizinleistungen (VS, VFK, KslKb 181b, 182b)",
  },
  GOAe4: {
    frequenz: "1x je Behandlungsfall (= 1 Monat)",
    hinweis: "Nach Ablauf eines Monats in demselben Behandlungsfall erneut moeglich. Nicht neben GOAe 15.",
  },
  GOAe15: {
    frequenz: "1x je Kalenderjahr",
    hinweis: "Nicht neben GOAe 4 im Behandlungsfall. Zahnarzt muss persoenlich flankierende Massnahmen vornehmen.",
  },
  "181a": {
    frequenz: "Unbegrenzt (je Konsil)",
    hinweis: "Persoenlich oder fernmuendlich. Persoenlicher Kontakt mit Patient muss zuvor oder in unmittelbarem Zusammenhang bestanden haben.",
  },
  "181b": {
    frequenz: "Unbegrenzt (je Telekonsil)",
    hinweis: "Zeitgleiche/zeitversetzte Kommunikation mittels elektronischem Austausch. Videokonsil bei Nutzung Anlage 16 BMV-Z.",
  },
} as const;

// ============================================================================
// GOAe Nr. 15 — PKV-Position fuer kontinuierliche Betreuung chronisch Kranker
// Source: DER Kommentar BEMA und GOZ (Liebold/Raff/Wissing), Stand 01/2020
// ============================================================================

export const GOAE_15_PKV = {
  position: "Ae15",
  titel:
    "Einleitung und Koordination flankierender therapeutischer und sozialer Massnahmen waehrend der kontinuierlichen ambulanten Betreuung eines chronisch Kranken",
  punktzahl: 300,
  punktwertCt: 5.82873,
  gebuehr: {
    faktor1_0: 17.49,
    faktor2_3: 40.23,
    faktor3_5: 61.22,
  },

  berechenbarFuer: [
    "Bei Vorliegen einer chronischen Erkrankung",
    "Bei kontinuierlicher ambulanter Betreuung",
    "Fuer Einleitung und Koordination flankierender therapeutischer und sozialer Massnahmen",
    "Nur einmal im Kalenderjahr",
  ],
  leistungsinhalt: [
    "Gespraeche mit anderen behandelnden Aerzten, Therapeuten und Betreuern",
    "Vor- und Nachbereitung von Krankenhausaufenthalten",
    "Kontakt zu Pflegeheimen und Behindertenwohneinrichtungen",
    "Regelmaessige Ueberpruefung der Medikation",
    "Kontakte zu sozialen Einrichtungen oder Versicherungstraegern",
  ],
  zahnaerztlicheIndikationen: [
    "Wiederholte Abstimmung mit Hausarzt/Facharzt/Betreuern wegen Medikation bei extremer Mundtrockenheit (z.B. medikamentenbedingt, nach Strahlentherapie, degenerative Erkrankungen)",
    "Abstimmung wegen Medikation bei CMD (Verordnung/Abstimmung Medikamente, physikalische und physiotherapeutische Massnahmen)",
    "Abstimmung wegen Heilmittel bei Bewegungseinschraenkungen bzw. Lymphstau im Kopf-Hals-Bereich (Polyarthritis, Spastiken bei Cerebralparese, Paraplegikem, Tetraplegikem, Chorea Huntington)",
    "Abstimmung mit HNO-Facharzt, Phoniater und Logopaedem bei Schluck-, Sprech- und orofazialen Funktionsstoerungen (Apoplex, chron. degenerative Nerven-/Muskelerkrankungen)",
    "Abstimmung bei angeborenen cranio- und orofazialen Fehlbildungen (Syndrombehandlung)",
    "Abstimmung bei chronifiziertem Schmerzsyndrom (chron. degenerative Nerven-/Muskelerkrankungen)",
    "Abstimmung bei invasiven Behandlungsmassnahmen mit Notwendigkeit der Medikationsumstellung (Blutgerinnung)",
    "Abstimmung bei Bisphosphonattherapie zur Prophylaxe und Therapie bei Kiefernekrosen",
  ],
  zusaetzlichBerechenbar: [
    "Besuch eines Patienten auf einer Pflegestation (GOAe-Nr. 48)",
    "Besuch, einschliesslich Beratung und symptombezogene Untersuchung (GOAe-Nr. 50)",
    "Besuch eines weiteren Kranken (GOAe-Nr. 51)",
    "Konsil (GOAe-Nr. 60)",
    "Wegegeld nach § 8 der GOZ",
    "Eingehende Untersuchung (GOZ-Nr. 0010)",
    "Symptombezogene Untersuchung (GOAe-Nr. 5)",
    "Beratung (GOAe-Nr. 1)",
    "Prophylaktische Leistungen (GOZ-Nrn. 1000 bis 1040)",
    "Weitere zahnaerztliche und aerztliche Behandlungsmassnahmen nach GOZ und GOAe",
  ],
  nichtBerechenbar: [
    "Neben GOAe-Nr. 4 im Behandlungsfall (in der GOAe definiert als ein Monat fuer die Behandlung derselben Erkrankung)",
    "Mehr als einmal im Kalenderjahr",
  ],
  steigerungsfaktorGruende: [
    "Komplizierte Grunderkrankungen des chronisch Kranken",
    "Ueber viele Jahre andauernde Entwicklung der Erkrankung mit umfangreicher Fuelle zu beruecksichtigender Einzelaspekte",
    "Grosse Anzahl vor-, mit- und weiterbehandelnder Aerzte/Therapeuten/Betreuer/Sozialeinrichtungen",
    "Lange Zeitdauer der koordinierenden Massnahmen",
    "Koordinierung besonders komplexer Sachverhalte und schwieriger Koordinierungspartner",
  ],
  wichtig:
    "GOAe-Nr. 15 ist KEINE Beratungsleistung — neben GOAe-Nr. 15 ist Beratung (GOAe-Nr. 1) moeglich. Kann auch durch Fachzahnaerzte und Zahnaerzte berechnet werden, nicht nur Hausaerzte.",
} as const;

// ============================================================================
// BEMA 181 — Konsiliarische Eroerterung (DER Kommentar, Stand 11/2020)
// ============================================================================

export const BEMA_181_KOMMENTAR = {
  position: "181",
  titel: "Konsiliarische Eroerterung mit Aerzten und Zahnaerzten",
  teilleistungen: {
    "181a": {
      abkuerzung: "KsIa",
      bewertungszahl: 14,
      beschreibung: "Persoenlich oder fernmuendlich",
      definition:
        "Persoenlicher Eroerterung = Austausch in physischer Anwesenheit aller am Konsil beteiligten Aerzte/Zahnaerzte. Fernmuendliche Eroerterung = mittels Fernsprecher.",
    },
    "181b": {
      abkuerzung: "KsIb",
      bewertungszahl: 16,
      beschreibung: "Im Rahmen eines Telekonsils",
      definition:
        "Zeitgleiche oder zeitversetzte Kommunikation zwischen Aerzten/Zahnaerzten unter Nutzung der in § 2 Abs. 1 der Telekonsilien-Vereinbarung genannten elektronischen Dienste. Videokonsil mittels Anlage 16 BMV-Z.",
    },
  },

  abrechnungsregeln: {
    voraussetzung:
      "Versichertenbezogene Fragestellung — Zahnarzt hat sich zuvor oder in unmittelbarem zeitlichem Zusammenhang persoenlich mit dem Versicherten und dessen Erkrankung befasst",
    jedesBeteiligtesKonsil:
      "Jeder am Konsil beteiligte (Zahn-)Arzt kann BEMA-Nr. 181 a/b abrechnen, unabhaengig von Teilnehmerzahl — nur einmal pro Konsil",
    nichtAbrechenbar: [
      "Routinemaessige Besprechungen (Roentgenbesprechung, Patientenuebergabe, Abstimmung Operateur/Anaesthesist)",
      "Zahnaerzte derselben Berufsausuebungsgemeinschaft",
      "Zahnaerzte einer Praxisgemeinschaft (gleiche/aehnliche Fachrichtungen)",
      "Zahnaerzte desselben Medizinischen Versorgungszentrums",
      "Wenn kein persoenlicher Kontakt des Zahnarztes zum Patienten in zeitlichem Zusammenhang",
      "Fuer Eroerterung ausservertraglicher Behandlungsmassnahmen",
      "Neben Videosprechstunde (BEMA-Nr. VS)",
      "Neben Videofallkonferenz (BEMA-Nr. VFK)",
      "Neben konsiliarischer Eroerterung im Rahmen eines Kooperationsvertrages (BEMA-Nr. 182 a/b)",
    ],
    zusaetzlich: [
      "Technikzuschlag (BEMA-Nr. TZ) je Praxis bis zu 10x im Quartal, neben den ersten 10 Leistungen nach VS, VFK, 181b, 182b",
    ],
    keinKonsil: [
      "Telefonische Auskunftsanforderung aus dem Krankenblatt",
      "Abklaerung von Medikamentenunvertraeglichkeiten",
      "Abfrage medizinischer Befunde",
    ],
  },

  telekonsil: {
    rechtsgrundlage: [
      "§ 87 Abs. 2l SGB V (DVG, seit 30.09.2020)",
      "Telekonsilien-Vereinbarung gemaess § 291g Abs. 6 SGB V (seit 01.04.2020)",
    ],
    dienste: [
      "eArztbriefe gemaess KBV-Richtlinie",
      "DICOM-Bildformate (Anlage 31a BMV-Ae)",
      "Videodienste fuer Videokonsilien (Anlage 16 BMV-Z)",
      "Weitere aAdG/aAdG-NetG-TI Anwendungen",
    ],
    konsiliarauftrag: {
      pflichtangaben: [
        "Datum",
        "Daten des einholenden Arztes/Zahnarztes (Name, Praxisanschrift, Telefon, E-Mail, Arztnummer)",
        "Daten des Konsiliararztes (Name, Vorname) bzw. Fachrichtung Krankenhaus",
        "Patientendaten (Name, Vorname, Geburtsdatum, Versichertennummer, Geschlecht)",
        "Diagnose/Verdachtsdiagnose",
        "Medikation (falls vorhanden)",
        "Auftrag",
        "Frist zur Beantwortung",
      ],
    },
    dokumentation:
      "Elektronisch ausgetauschte Unterlagen sowie Erst- und telekonsiliarische Zweitbeurteilung zusammenhaengend auf den Patienten elektronisch dokumentiert und archiviert",
  },
} as const;

// ============================================================================
// BEMA VS — Videosprechstunde Detail (DER Kommentar, Stand 11/2020)
// ============================================================================

export const BEMA_VS_KOMMENTAR = {
  position: "VS",
  titel: "Videosprechstunde",
  bewertungszahl: 16,

  abrechnungsbestimmungen: [
    "1. Abrechenbar bei: Versicherten mit Pflegegrad (§15 SGB XI) oder Eingliederungshilfe, sowie bei Versicherten an denen ZA-Leistungen im Rahmen eines Kooperationsvertrages nach §119b Abs.1 SGB V erbracht werden",
    "2. Nur abrechenbar mittels eines Videodienstes nach Anlage 16 BMV-Z",
    "3. Grundsaetzlich nur als alleinige Leistung. Ausnahme: BEMA-Nr. 174b bei Quarantaene/meldepflichtiger Krankheit",
    "4. Bei eingeschraenktem Verstaendnis: VS bei raeumlicher und zeitgleicher Anwesenheit auf Pflege-/Unterstuetzungspersonen konzentrieren/beschraenken",
    "5. Nicht neben VFK, BEMA 181, BEMA 182 in derselben Sitzung",
  ],

  technischeAnforderungen: {
    rechtsgrundlage: "Anlage 16 BMV-Z gemaess § 291g Abs. 5 SGB V (seit 01.07.2020)",
    apparativ: [
      "Kamera",
      "Bildschirm (min. 3 Zoll, min. 640x480 px)",
      "Mikrofon",
      "Tonwiedergabeeinheit",
      "Internetanschluss (min. 2000 kbit/s Bandbreite)",
    ],
    videodienstanbieter: [
      "Registrierung beim zertifizierten Anbieter erforderlich",
      "Kein Zweitzugang (ausser fuer Praxispersonal zu organisatorischen Zwecken)",
      "Versicherte/Pflegepersonal melden sich ohne Account an",
      "Peer-to-Peer-Verbindung ohne zentralen Server",
      "Ende-zu-Ende-Verschluesselung",
      "Server nur im EWR (Europaeischer Wirtschaftsraum)",
      "Metadaten nach 3 Monaten loeschen",
      "Keine Speicherung von Inhalten durch Anbieter",
      "Bescheinigung des Anbieters: Informationssicherheit + Datenschutz + Inhalte (BSI/DAkkS-Zertifikate)",
      "Nutzungsbedingungen in deutscher Sprache, ohne vorherige Anmeldung abrufbar",
      "Keine Werbung",
    ],
    zahnarztPflichten: [
      "Nur ein Zahnarzt darf die VS durchfuehren",
      "Vorstellung aller im Raum anwesenden Personen zu Beginn",
      "Aufzeichnung ist NICHT gestattet",
      "Einwilligung des Versicherten in Datenverarbeitung einholen (Art. 9 Abs. 2 lit. a DS-GVO)",
      "Geschlossener Raum fuer stoerungsfreien Ablauf",
    ],
  },

  abrechnung: {
    methode: "KCH-Quartalsabrechnung (mittels elektronischer Datenuebermittlung)",
    ersatzverfahren:
      "Abrechnung im Folgequartal ueber Ersatzverfahren moeglich (Versichertenstammdaten aus PVS, wenn im Vorquartal gueltige eGK vorgelegt wurde)",
    beiVFK: "Sogar Zeitraum der letzten zwei Vorquartale moeglich",
  },

  leistungsinhalt: [
    "Einschaetzungen zu Befunden",
    "Befinden des Patienten",
    "Eroerterung anstehender Behandlungsplanungen",
    "Mundgesundheitsaufklaerung (174b) nur bei Quarantaene als Ausnahme zusaetzlich — setzt voraus, dass 174a zuvor erbracht wurde",
  ],
} as const;
