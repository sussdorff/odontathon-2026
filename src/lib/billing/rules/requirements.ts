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
]
