import type { RequirementRule } from '../types'

/**
 * Requirement rules — codes that require other codes to be present.
 */
export const requirementRules: RequirementRule[] = [
  // --- ZE erfordert HKP ---
  {
    type: 'requirement', id: 'req-ze-hkp',
    code: '2200', system: 'GOZ',
    requires: [{ code: '0030', system: 'GOZ' }],
    description: 'GOZ 2200 (Vollkrone) erfordert GOZ 0030 (HKP-Aufstellung)',
  },
  {
    type: 'requirement', id: 'req-bridge-hkp',
    code: '5000', system: 'GOZ',
    requires: [{ code: '0030', system: 'GOZ' }],
    description: 'GOZ 5000 (Brückenglied) erfordert GOZ 0030 (HKP-Aufstellung)',
  },

  // --- Brücke erfordert Eingliedern ---
  {
    type: 'requirement', id: 'req-bridge-insert',
    code: '5000', system: 'GOZ',
    requires: [{ code: '5120', system: 'GOZ' }],
    description: 'GOZ 5000 (Brückenglied) erfordert GOZ 5120 (Eingliedern Brücke)',
  },

  // --- Implantat erfordert Untersuchung ---
  {
    type: 'requirement', id: 'req-implant-exam',
    code: '9000', system: 'GOZ',
    requires: [{ code: '0010', system: 'GOZ' }],
    description: 'GOZ 9000 (Implantatinsertion) erfordert vorherige eingehende Untersuchung GOZ 0010',
  },

  // --- Krone erfordert Provisorium oder ist optional ---
  {
    type: 'requirement', id: 'req-crown-prep',
    code: '2200', system: 'GOZ',
    requires: [{ code: '0010', system: 'GOZ' }],
    description: 'GOZ 2200 (Vollkrone) erfordert vorherige eingehende Untersuchung GOZ 0010',
  },

  // --- Wurzelkanalbehandlung erfordert Röntgen ---
  {
    type: 'requirement', id: 'req-endo-xray',
    code: '2380', system: 'GOZ',
    requires: [{ code: '0010', system: 'GOZ' }],
    description: 'GOZ 2380 (Wurzelkanalbehandlung) erfordert Untersuchung + Röntgendiagnostik',
  },

  // --- PAR-Therapie erfordert PAR-Status ---
  {
    type: 'requirement', id: 'req-par-status',
    code: '4070', system: 'GOZ',
    requires: [{ code: '4000', system: 'GOZ' }],
    description: 'GOZ 4070 (PAR-Chirurgie) erfordert vorherigen Parodontalstatus GOZ 4000',
  },

  // --- Teilprothese erfordert HKP ---
  {
    type: 'requirement', id: 'req-partial-hkp',
    code: '5070', system: 'GOZ',
    requires: [{ code: '0030', system: 'GOZ' }],
    description: 'GOZ 5070 (Teilprothese) erfordert GOZ 0030 (HKP-Aufstellung)',
  },

  // --- Totalprothese erfordert HKP ---
  {
    type: 'requirement', id: 'req-total-hkp',
    code: '5080', system: 'GOZ',
    requires: [{ code: '0030', system: 'GOZ' }],
    description: 'GOZ 5080 (Totalprothese) erfordert GOZ 0030 (HKP-Aufstellung)',
  },

  // --- Pflege-Zuschläge erfordern Pflegegrad/Eingliederungshilfe ---
  // PBA1a/b (171a/b) — Zuschlag Besuch bei Pflegegrad
  {
    type: 'requirement', id: 'req-171a-pflege',
    code: '171a', system: 'BEMA',
    requires: [{ code: 'PFLEGEGRAD_ODER_EINGLIEDERUNGSHILFE', system: 'BEMA' }],
    description: 'BEMA 171a (PBA1a Zuschlag Besuch) erfordert Pflegegrad oder Eingliederungshilfe',
  },
  {
    type: 'requirement', id: 'req-171b-pflege',
    code: '171b', system: 'BEMA',
    requires: [{ code: 'PFLEGEGRAD_ODER_EINGLIEDERUNGSHILFE', system: 'BEMA' }],
    description: 'BEMA 171b (PBA1b Zuschlag je weiteren Besuch) erfordert Pflegegrad oder Eingliederungshilfe',
  },

  // ZBs3a/b (173a/b) — Zuschlag Besuch Einrichtung bei Pflegegrad
  {
    type: 'requirement', id: 'req-173a-pflege',
    code: '173a', system: 'BEMA',
    requires: [{ code: 'PFLEGEGRAD_ODER_EINGLIEDERUNGSHILFE', system: 'BEMA' }],
    description: 'BEMA 173a (ZBs3a Zuschlag Besuch Einrichtung) erfordert Pflegegrad oder Eingliederungshilfe',
  },
  {
    type: 'requirement', id: 'req-173b-pflege',
    code: '173b', system: 'BEMA',
    requires: [{ code: 'PFLEGEGRAD_ODER_EINGLIEDERUNGSHILFE', system: 'BEMA' }],
    description: 'BEMA 173b (ZBs3b Zuschlag je weiteren Besuch Einrichtung) erfordert Pflegegrad oder Eingliederungshilfe',
  },

  // SP1a/b (172a/b) — Zuschlag Besuch Pflegeeinrichtung mit Kooperationsvertrag
  {
    type: 'requirement', id: 'req-172a-koopvertrag',
    code: '172a', system: 'BEMA',
    requires: [{ code: 'KOOPERATIONSVERTRAG_119B', system: 'BEMA' }],
    description: 'BEMA 172a (SP1a Zuschlag Pflegeeinrichtung) erfordert Kooperationsvertrag nach § 119b SGB V',
  },
  {
    type: 'requirement', id: 'req-172b-koopvertrag',
    code: '172b', system: 'BEMA',
    requires: [{ code: 'KOOPERATIONSVERTRAG_119B', system: 'BEMA' }],
    description: 'BEMA 172b (SP1b Zuschlag je weiteren Pflegeeinrichtung) erfordert Kooperationsvertrag nach § 119b SGB V',
  },

  // --- Besuchsleistungen erfordern Besuchskontext ---
  {
    type: 'requirement', id: 'req-151-besuch',
    code: '151', system: 'BEMA',
    requires: [{ code: 'BESUCHSKONTEXT', system: 'BEMA' }],
    description: 'BEMA 151 (Bs1 Besuch) erfordert Besuchskontext (Privatwohnung/Einrichtung)',
  },
  {
    type: 'requirement', id: 'req-152-besuch',
    code: '152', system: 'BEMA',
    requires: [{ code: 'BESUCHSKONTEXT', system: 'BEMA' }],
    description: 'BEMA 152 (Bs2 Besuch je weiteren) erfordert Besuchskontext',
  },
  {
    type: 'requirement', id: 'req-153-besuch',
    code: '153', system: 'BEMA',
    requires: [{ code: 'BESUCHSKONTEXT', system: 'BEMA' }],
    description: 'BEMA 153 (Bs3 Besuch Einrichtung) erfordert Besuchskontext (Einrichtung § 71 SGB XI)',
  },
  {
    type: 'requirement', id: 'req-154-besuch',
    code: '154', system: 'BEMA',
    requires: [{ code: 'BESUCHSKONTEXT', system: 'BEMA' }],
    description: 'BEMA 154 (Bs4 Besuch Pflegeeinrichtung mit Vertrag) erfordert Besuchskontext + Kooperationsvertrag',
  },
  {
    type: 'requirement', id: 'req-155-besuch',
    code: '155', system: 'BEMA',
    requires: [{ code: 'BESUCHSKONTEXT', system: 'BEMA' }],
    description: 'BEMA 155 (Bs5 je weiteren mit Vertrag) erfordert Besuchskontext + Kooperationsvertrag',
  },
]
