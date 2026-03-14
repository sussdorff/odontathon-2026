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

  // --- Prävention § 22a SGB V — PBa/PBb Ausschlüsse ---
  {
    type: 'exclusion', id: 'excl-174a-ip1',
    codeA: '174a', systemA: 'BEMA', codeB: 'IP1', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA IP1 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174a-ip2',
    codeA: '174a', systemA: 'BEMA', codeB: 'IP2', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA IP2 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174a-fu1',
    codeA: '174a', systemA: 'BEMA', codeB: 'FU1', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA FU1 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174a-fu2',
    codeA: '174a', systemA: 'BEMA', codeB: 'FU2', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA FU2 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174a-mhu',
    codeA: '174a', systemA: 'BEMA', codeB: 'MHU', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA MHU am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174a-upta',
    codeA: '174a', systemA: 'BEMA', codeB: 'UPTa', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA UPTa am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174a-uptb',
    codeA: '174a', systemA: 'BEMA', codeB: 'UPTb', systemB: 'BEMA',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus) nicht neben BEMA UPTb am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-ip1',
    codeA: '174b', systemA: 'BEMA', codeB: 'IP1', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA IP1 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-ip2',
    codeA: '174b', systemA: 'BEMA', codeB: 'IP2', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA IP2 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-fu1',
    codeA: '174b', systemA: 'BEMA', codeB: 'FU1', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA FU1 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-fu2',
    codeA: '174b', systemA: 'BEMA', codeB: 'FU2', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA FU2 am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-mhu',
    codeA: '174b', systemA: 'BEMA', codeB: 'MHU', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA MHU am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-upta',
    codeA: '174b', systemA: 'BEMA', codeB: 'UPTa', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA UPTa am selben Tag',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-174b-uptb',
    codeA: '174b', systemA: 'BEMA', codeB: 'UPTb', systemB: 'BEMA',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung) nicht neben BEMA UPTb am selben Tag',
    sameSession: true,
  },

  // --- PBZst / Zst Ausschluss ---
  {
    type: 'exclusion', id: 'excl-107a-107',
    codeA: '107a', systemA: 'BEMA', codeB: '107', systemB: 'BEMA',
    description: 'BEMA 107a (PBZst) nicht neben BEMA 107 (Zst) — nur eine Zahnsteinentfernung abrechenbar',
    sameSession: true,
  },

  // --- 01/Ae1 nicht neben Besuchsleistungen ---
  {
    type: 'exclusion', id: 'excl-01-151',
    codeA: '01', systemA: 'BEMA', codeB: '151', systemB: 'BEMA',
    description: 'BEMA 01 nicht neben BEMA 151 (Bs1 Besuch) — Untersuchung bei Besuch nicht zusätzlich berechenbar',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-01-152',
    codeA: '01', systemA: 'BEMA', codeB: '152', systemB: 'BEMA',
    description: 'BEMA 01 nicht neben BEMA 152 (Bs2 Besuch je weiteren)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-01-153',
    codeA: '01', systemA: 'BEMA', codeB: '153', systemB: 'BEMA',
    description: 'BEMA 01 nicht neben BEMA 153 (Bs3 Besuch Einrichtung)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-01-154',
    codeA: '01', systemA: 'BEMA', codeB: '154', systemB: 'BEMA',
    description: 'BEMA 01 nicht neben BEMA 154 (Bs4 Besuch Pflegeeinrichtung mit Vertrag)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-01-155',
    codeA: '01', systemA: 'BEMA', codeB: '155', systemB: 'BEMA',
    description: 'BEMA 01 nicht neben BEMA 155 (Bs5 Besuch je weiteren mit Vertrag)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-ae1-151',
    codeA: 'Ae1', systemA: 'BEMA', codeB: '151', systemB: 'BEMA',
    description: 'BEMA Ae1 nicht neben BEMA 151 (Bs1 Besuch)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-ae1-152',
    codeA: 'Ae1', systemA: 'BEMA', codeB: '152', systemB: 'BEMA',
    description: 'BEMA Ae1 nicht neben BEMA 152 (Bs2 Besuch je weiteren)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-ae1-153',
    codeA: 'Ae1', systemA: 'BEMA', codeB: '153', systemB: 'BEMA',
    description: 'BEMA Ae1 nicht neben BEMA 153 (Bs3 Besuch Einrichtung)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-ae1-154',
    codeA: 'Ae1', systemA: 'BEMA', codeB: '154', systemB: 'BEMA',
    description: 'BEMA Ae1 nicht neben BEMA 154 (Bs4 Besuch Pflegeeinrichtung mit Vertrag)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-ae1-155',
    codeA: 'Ae1', systemA: 'BEMA', codeB: '155', systemB: 'BEMA',
    description: 'BEMA Ae1 nicht neben BEMA 155 (Bs5 Besuch je weiteren mit Vertrag)',
    sameSession: true,
  },

  // --- Videosprechstunde ist alleinige Leistung ---
  {
    type: 'exclusion', id: 'excl-vs-01',
    codeA: 'VS', systemA: 'BEMA', codeB: '01', systemB: 'BEMA',
    description: 'BEMA VS (Videosprechstunde) nur als alleinige Leistung — nicht neben BEMA 01',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-vs-151',
    codeA: 'VS', systemA: 'BEMA', codeB: '151', systemB: 'BEMA',
    description: 'BEMA VS (Videosprechstunde) nur als alleinige Leistung — nicht neben BEMA 151 (Bs1)',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-vs-174a',
    codeA: 'VS', systemA: 'BEMA', codeB: '174a', systemB: 'BEMA',
    description: 'BEMA VS (Videosprechstunde) nur als alleinige Leistung — nicht neben BEMA 174a (PBa)',
    sameSession: true,
  },

  // --- Zeitzuschläge sind untereinander exklusiv ---
  {
    type: 'exclusion', id: 'excl-161a-161b',
    codeA: '161a', systemA: 'BEMA', codeB: '161b', systemB: 'BEMA',
    description: 'BEMA 161a (ZBs1a) nicht neben 161b (ZBs1b) — Zeitzuschläge Erstbesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-161a-161c',
    codeA: '161a', systemA: 'BEMA', codeB: '161c', systemB: 'BEMA',
    description: 'BEMA 161a (ZBs1a) nicht neben 161c (ZBs1c) — Zeitzuschläge Erstbesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-161a-161d',
    codeA: '161a', systemA: 'BEMA', codeB: '161d', systemB: 'BEMA',
    description: 'BEMA 161a (ZBs1a) nicht neben 161d (ZBs1d) — Zeitzuschläge Erstbesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-161a-161e',
    codeA: '161a', systemA: 'BEMA', codeB: '161e', systemB: 'BEMA',
    description: 'BEMA 161a (ZBs1a) nicht neben 161e (ZBs1e) — Zeitzuschläge Erstbesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-161a-161f',
    codeA: '161a', systemA: 'BEMA', codeB: '161f', systemB: 'BEMA',
    description: 'BEMA 161a (ZBs1a) nicht neben 161f (ZBs1f) — Zeitzuschläge Erstbesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-162a-162b',
    codeA: '162a', systemA: 'BEMA', codeB: '162b', systemB: 'BEMA',
    description: 'BEMA 162a (ZBs2a) nicht neben 162b (ZBs2b) — Zeitzuschläge Folgebesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-162a-162c',
    codeA: '162a', systemA: 'BEMA', codeB: '162c', systemB: 'BEMA',
    description: 'BEMA 162a (ZBs2a) nicht neben 162c (ZBs2c) — Zeitzuschläge Folgebesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-162a-162d',
    codeA: '162a', systemA: 'BEMA', codeB: '162d', systemB: 'BEMA',
    description: 'BEMA 162a (ZBs2a) nicht neben 162d (ZBs2d) — Zeitzuschläge Folgebesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-162a-162e',
    codeA: '162a', systemA: 'BEMA', codeB: '162e', systemB: 'BEMA',
    description: 'BEMA 162a (ZBs2a) nicht neben 162e (ZBs2e) — Zeitzuschläge Folgebesuch sind untereinander exklusiv',
    sameSession: true,
  },
  {
    type: 'exclusion', id: 'excl-162a-162f',
    codeA: '162a', systemA: 'BEMA', codeB: '162f', systemB: 'BEMA',
    description: 'BEMA 162a (ZBs2a) nicht neben 162f (ZBs2f) — Zeitzuschläge Folgebesuch sind untereinander exklusiv',
    sameSession: true,
  },
]
