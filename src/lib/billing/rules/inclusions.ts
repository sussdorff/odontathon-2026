import type { InclusionRule } from '../types'

/**
 * Inclusion rules — Zielleistungsprinzip.
 *
 * When a "target" service already includes a sub-service,
 * the sub-service cannot be billed separately.
 */
export const inclusionRules: InclusionRule[] = [
  // --- Kronen enthalten Präparation ---
  {
    type: 'inclusion', id: 'incl-2200-2030',
    targetCode: '2200', targetSystem: 'GOZ',
    includedCode: '2030', includedSystem: 'GOZ',
    description: 'GOZ 2200 (Vollkrone) enthält GOZ 2030 (Präparation) — nicht separat abrechenbar',
  },
  {
    type: 'inclusion', id: 'incl-2210-2030',
    targetCode: '2210', targetSystem: 'GOZ',
    includedCode: '2030', includedSystem: 'GOZ',
    description: 'GOZ 2210 (Vollkeramikkrone) enthält GOZ 2030 (Präparation)',
  },
  {
    type: 'inclusion', id: 'incl-2220-2030',
    targetCode: '2220', targetSystem: 'GOZ',
    includedCode: '2030', includedSystem: 'GOZ',
    description: 'GOZ 2220 (Teilkrone) enthält GOZ 2030 (Präparation)',
  },

  // --- Brücke enthält Eingliedern ---
  {
    type: 'inclusion', id: 'incl-5120-cement',
    targetCode: '5120', targetSystem: 'GOZ',
    includedCode: '2310', includedSystem: 'GOZ',
    description: 'GOZ 5120 (Eingliedern Brücke) enthält Zementieren — nicht separat als GOZ 2310',
  },

  // --- Wurzelkanalbehandlung enthält Trepanation ---
  {
    type: 'inclusion', id: 'incl-2380-2340',
    targetCode: '2380', targetSystem: 'GOZ',
    includedCode: '2340', includedSystem: 'GOZ',
    description: 'GOZ 2380 (Wurzelkanalbehandlung) enthält GOZ 2340 (Trepanation)',
  },

  // --- Extraktion enthält Anästhesie NICHT (explizit erlaubt) ---

  // --- Implantat enthält Bohrschablone ---
  {
    type: 'inclusion', id: 'incl-9000-bohr',
    targetCode: '9000', targetSystem: 'GOZ',
    includedCode: '9050', includedSystem: 'GOZ',
    description: 'GOZ 9000 (Implantatinsertion) enthält einfache Bohrschablone — GOZ 9050 nur bei navigierter Implantation',
  },

  // --- PZR enthält Politur ---
  {
    type: 'inclusion', id: 'incl-1040-polish',
    targetCode: '1040', targetSystem: 'GOZ',
    includedCode: '1020', includedSystem: 'GOZ',
    description: 'GOZ 1040 (PZR) enthält Politur — GOZ 1020 nicht separat',
  },

  // --- BEMA: Extraktion enthält Wundversorgung ---
  {
    type: 'inclusion', id: 'incl-bema-ex-wund',
    targetCode: 'X1', targetSystem: 'BEMA',
    includedCode: 'Wv', includedSystem: 'BEMA',
    description: 'BEMA X1 (Extraktion) enthält einfache Wundversorgung',
  },

  // --- GOZ 5000 Brückenglied enthält Modellation ---
  {
    type: 'inclusion', id: 'incl-5000-model',
    targetCode: '5000', targetSystem: 'GOZ',
    includedCode: '2260', includedSystem: 'GOZ',
    description: 'GOZ 5000 (Brückenglied) enthält Modellation',
  },

  // --- Totalprothese enthält Abformung ---
  {
    type: 'inclusion', id: 'incl-5080-abform',
    targetCode: '5080', targetSystem: 'GOZ',
    includedCode: '5170', includedSystem: 'GOZ',
    description: 'GOZ 5080 (Totalprothese) enthält funktionelle Abformung GOZ 5170',
  },
]
