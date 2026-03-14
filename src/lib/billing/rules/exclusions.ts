import type { ExclusionRule } from '../types'

/**
 * GOZ/BEMA exclusion rules — codes that cannot be billed together.
 *
 * Sources: GOZ-Kommentar, BZÄK-Abrechnungsempfehlungen, KZV-Rundschreiben
 */
export const exclusionRules: ExclusionRule[] = [
  // --- GOZ Ausschlüsse: Konservierende Behandlung ---
  {
    type: 'exclusion', id: 'excl-2060-2080',
    codeA: '2060', systemA: 'GOZ', codeB: '2080', systemB: 'GOZ',
    description: 'GOZ 2060 (Füllung einflächig) nicht neben GOZ 2080 (Füllung zweiflächig) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-2080-2100',
    codeA: '2080', systemA: 'GOZ', codeB: '2100', systemB: 'GOZ',
    description: 'GOZ 2080 (zweiflächig) nicht neben GOZ 2100 (dreiflächig) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-2060-2100',
    codeA: '2060', systemA: 'GOZ', codeB: '2100', systemB: 'GOZ',
    description: 'GOZ 2060 (einflächig) nicht neben GOZ 2100 (dreiflächig) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-2100-2120',
    codeA: '2100', systemA: 'GOZ', codeB: '2120', systemB: 'GOZ',
    description: 'GOZ 2100 (dreiflächig) nicht neben GOZ 2120 (mehr als dreiflächig) am selben Zahn',
    sameTooth: true,
  },

  // --- GOZ Ausschlüsse: Kronen/Brücken ---
  {
    type: 'exclusion', id: 'excl-2200-2210',
    codeA: '2200', systemA: 'GOZ', codeB: '2210', systemB: 'GOZ',
    description: 'GOZ 2200 (Vollkrone Metall) nicht neben GOZ 2210 (Vollkrone Keramik) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-2200-2220',
    codeA: '2200', systemA: 'GOZ', codeB: '2220', systemB: 'GOZ',
    description: 'GOZ 2200 (Vollkrone Metall) nicht neben GOZ 2220 (Teilkrone) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-2150-2200',
    codeA: '2150', systemA: 'GOZ', codeB: '2200', systemB: 'GOZ',
    description: 'GOZ 2150 (Inlay) nicht neben GOZ 2200 (Vollkrone) am selben Zahn',
    sameTooth: true,
  },

  // --- GOZ Ausschlüsse: Endodontie ---
  {
    type: 'exclusion', id: 'excl-2360-2380',
    codeA: '2360', systemA: 'GOZ', codeB: '2380', systemB: 'GOZ',
    description: 'GOZ 2360 (Vitalamputation) nicht neben GOZ 2380 (Wurzelkanalbehandlung) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-2360-2390',
    codeA: '2360', systemA: 'GOZ', codeB: '2390', systemB: 'GOZ',
    description: 'GOZ 2360 (Vitalamputation) nicht neben GOZ 2390 (Wurzelkanalaufbereitung) am selben Zahn',
    sameTooth: true,
  },

  // --- GOZ Ausschlüsse: Chirurgie ---
  {
    type: 'exclusion', id: 'excl-3000-3010',
    codeA: '3000', systemA: 'GOZ', codeB: '3010', systemB: 'GOZ',
    description: 'GOZ 3000 (Extraktion) nicht neben GOZ 3010 (operative Extraktion) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-3000-3020',
    codeA: '3000', systemA: 'GOZ', codeB: '3020', systemB: 'GOZ',
    description: 'GOZ 3000 (Extraktion) nicht neben GOZ 3020 (Osteotomie) am selben Zahn',
    sameTooth: true,
  },

  // --- GOZ Ausschlüsse: Implantologie ---
  {
    type: 'exclusion', id: 'excl-9000-9010',
    codeA: '9000', systemA: 'GOZ', codeB: '9010', systemB: 'GOZ',
    description: 'GOZ 9000 (Implantatinsertion) nicht neben GOZ 9010 (Implantatfreilegung) in gleicher Sitzung',
    sameSession: true,
  },

  // --- GOZ Ausschlüsse: Prophylaxe ---
  {
    type: 'exclusion', id: 'excl-1040-4050',
    codeA: '1040', systemA: 'GOZ', codeB: '4050', systemB: 'GOZ',
    description: 'GOZ 1040 (PZR) nicht neben GOZ 4050 (subgingival scaling) in gleicher Sitzung',
    sameSession: true,
  },

  // --- GOZ Ausschlüsse: Anästhesie ---
  {
    type: 'exclusion', id: 'excl-0090-0100',
    codeA: '0090', systemA: 'GOZ', codeB: '0100', systemB: 'GOZ',
    description: 'GOZ 0090 (Infiltrationsanästhesie) nicht neben GOZ 0100 (Leitungsanästhesie) im selben Bereich',
    sameSession: true,
  },

  // --- BEMA Ausschlüsse ---
  {
    type: 'exclusion', id: 'excl-bema-13a-13b',
    codeA: '13a', systemA: 'BEMA', codeB: '13b', systemB: 'BEMA',
    description: 'BEMA 13a (Füllung einflächig) nicht neben 13b (Füllung zweiflächig) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-bema-13b-13c',
    codeA: '13b', systemA: 'BEMA', codeB: '13c', systemB: 'BEMA',
    description: 'BEMA 13b (Füllung zweiflächig) nicht neben 13c (Füllung dreiflächig) am selben Zahn',
    sameTooth: true,
  },

  // --- GOZ/BEMA cross-system exclusions ---
  {
    type: 'exclusion', id: 'excl-goz-bema-filling',
    codeA: '2060', systemA: 'GOZ', codeB: '13a', systemB: 'BEMA',
    description: 'GOZ-Füllung und BEMA-Füllung nicht am selben Zahn in gleicher Sitzung',
    sameTooth: true, sameSession: true,
  },

  // --- Prothetik Ausschlüsse ---
  {
    type: 'exclusion', id: 'excl-5000-5010',
    codeA: '5000', systemA: 'GOZ', codeB: '5010', systemB: 'GOZ',
    description: 'GOZ 5000 (Brückenglied Metall) nicht neben GOZ 5010 (Brückenglied Keramik) für selbes Glied',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-5070-5080',
    codeA: '5070', systemA: 'GOZ', codeB: '5080', systemB: 'GOZ',
    description: 'GOZ 5070 (Teilprothese) nicht neben GOZ 5080 (Totalprothese) im selben Kiefer',
  },
  {
    type: 'exclusion', id: 'excl-2197-5120',
    codeA: '2197', systemA: 'GOZ', codeB: '5120', systemB: 'GOZ',
    description: 'GOZ 2197 (Adhäsive Befestigung) nicht neben GOZ 5120 (Eingliedern Brücke) — Befestigung ist in 5120 enthalten',
    sameSession: true,
  },

  // --- PAR Ausschlüsse ---
  {
    type: 'exclusion', id: 'excl-4070-4075',
    codeA: '4070', systemA: 'GOZ', codeB: '4075', systemB: 'GOZ',
    description: 'GOZ 4070 (Parodontalchirurgie geschlossen) nicht neben GOZ 4075 (Parodontalchirurgie offen) am selben Zahn',
    sameTooth: true,
  },
  {
    type: 'exclusion', id: 'excl-4000-4005',
    codeA: '4000', systemA: 'GOZ', codeB: '4005', systemB: 'GOZ',
    description: 'GOZ 4000 (Parodontalstatus) nicht neben GOZ 4005 (Parodontaler Screening-Index) in gleicher Sitzung',
    sameSession: true,
  },
]
