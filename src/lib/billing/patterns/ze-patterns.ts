import type { BillingPattern } from '../types'

/**
 * ZE patterns — Kronen, Brücken, Prothesen, Implantate.
 */
export const zePatterns: BillingPattern[] = [
  // --- Brücken ---
  {
    id: 'goz-bridge-3-unit',
    name: 'Dreigliedrige Brücke (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '2200', system: 'GOZ', multiplicity: 'per-abutment', description: 'Vollkrone (Anker)', notes: '2x für 2 Pfeiler' },
      { code: '5000', system: 'GOZ', multiplicity: 'per-pontic', description: 'Brückenglied' },
      { code: '5120', system: 'GOZ', multiplicity: 'per-case', description: 'Eingliedern Brücke' },
    ],
    optional: [
      { code: '2210', system: 'GOZ', multiplicity: 'per-abutment', description: 'Vollkeramikkrone statt Metall (gleichartig)' },
      { code: '2197', system: 'GOZ', multiplicity: 'per-abutment', description: 'Adhäsive Befestigung' },
      { code: '0090', system: 'GOZ', multiplicity: 'per-case', description: 'Infiltrationsanästhesie' },
    ],
    festzuschussBefunde: ['2.1', '2.2', '2.3', '2.5'],
  },
  {
    id: 'goz-bridge-4-unit',
    name: 'Viergliedrige Brücke (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '2200', system: 'GOZ', multiplicity: 'per-abutment', description: 'Vollkrone (Anker)', notes: '2x für 2 Pfeiler' },
      { code: '5000', system: 'GOZ', multiplicity: 'per-pontic', description: 'Brückenglied', notes: '2x für 2 Zwischenglieder' },
      { code: '5120', system: 'GOZ', multiplicity: 'per-case', description: 'Eingliedern Brücke' },
    ],
    optional: [
      { code: '2210', system: 'GOZ', multiplicity: 'per-abutment', description: 'Vollkeramikkrone (gleichartig)' },
    ],
    festzuschussBefunde: ['2.1', '2.2', '2.3', '2.5'],
  },
  {
    id: 'bema-bridge-3-unit',
    name: 'Dreigliedrige Brücke (BEMA/Regelversorgung)',
    category: 'ZE', system: 'BEMA',
    required: [
      { code: '19', system: 'BEMA', multiplicity: 'per-abutment', description: 'Vollgusskrone (Regelversorgung)' },
      { code: '91b', system: 'BEMA', multiplicity: 'per-pontic', description: 'Brückenglied (Regelversorgung)' },
      { code: '91c', system: 'BEMA', multiplicity: 'per-case', description: 'Verbindungselement' },
    ],
    optional: [],
    festzuschussBefunde: ['2.1', '2.2', '2.3'],
  },

  // --- Einzelkronen ---
  {
    id: 'goz-single-crown',
    name: 'Einzelkrone (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '2200', system: 'GOZ', multiplicity: 'per-tooth', description: 'Vollkrone Metall' },
    ],
    optional: [
      { code: '2210', system: 'GOZ', multiplicity: 'per-tooth', description: 'Vollkeramikkrone statt Metall' },
      { code: '2220', system: 'GOZ', multiplicity: 'per-tooth', description: 'Teilkrone' },
    ],
    festzuschussBefunde: ['1.1', '1.2', '1.3', '1.4', '1.5'],
  },

  // --- Einzelimplantat ---
  {
    id: 'goz-single-implant',
    name: 'Einzelimplantat mit Suprakonstruktion (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '9000', system: 'GOZ', multiplicity: 'per-tooth', description: 'Implantatinsertion' },
      { code: '9010', system: 'GOZ', multiplicity: 'per-tooth', description: 'Implantatfreilegung' },
      { code: '2200', system: 'GOZ', multiplicity: 'per-tooth', description: 'Suprakonstruktion (Krone auf Implantat)' },
    ],
    optional: [
      { code: '9040', system: 'GOZ', multiplicity: 'per-tooth', description: 'Knochenaugmentation' },
      { code: '9090', system: 'GOZ', multiplicity: 'per-tooth', description: 'Sinuslift (intern)' },
      { code: '9100', system: 'GOZ', multiplicity: 'per-tooth', description: 'Sinuslift (extern)' },
      { code: '2210', system: 'GOZ', multiplicity: 'per-tooth', description: 'Keramikkrone statt Metall' },
    ],
    festzuschussBefunde: ['2.1', '2.7'],
  },

  // --- Teilprothese ---
  {
    id: 'goz-partial-denture',
    name: 'Teilprothese (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '5070', system: 'GOZ', multiplicity: 'per-jaw', description: 'Teilprothese' },
    ],
    optional: [
      { code: '5030', system: 'GOZ', multiplicity: 'per-tooth', description: 'Teleskopkrone', notes: 'Pro Pfeilerzahn' },
    ],
    festzuschussBefunde: ['3.1', '3.2', '4.1', '4.2', '4.3', '4.7'],
  },

  // --- Totalprothese ---
  {
    id: 'goz-total-denture',
    name: 'Totalprothese (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '5080', system: 'GOZ', multiplicity: 'per-jaw', description: 'Totalprothese' },
    ],
    optional: [
      { code: '5170', system: 'GOZ', multiplicity: 'per-jaw', description: 'Funktionelle Abformung' },
    ],
    festzuschussBefunde: ['7.1', '7.2', '7.7'],
  },

  // --- Teleskopprothese ---
  {
    id: 'goz-telescope-denture',
    name: 'Teleskopprothese (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '5030', system: 'GOZ', multiplicity: 'per-tooth', description: 'Teleskopkrone', notes: 'Pro Pfeilerzahn' },
      { code: '5070', system: 'GOZ', multiplicity: 'per-jaw', description: 'Teilprothese' },
    ],
    optional: [
      { code: '5170', system: 'GOZ', multiplicity: 'per-jaw', description: 'Funktionelle Abformung' },
    ],
    festzuschussBefunde: ['4.1', '4.2', '4.3', '4.7', '6.1', '6.2', '6.7'],
  },

  // --- Kronenerneuerung ---
  {
    id: 'goz-crown-renewal',
    name: 'Kronenerneuerung (GOZ)',
    category: 'ZE', system: 'GOZ',
    required: [
      { code: '0030', system: 'GOZ', multiplicity: 'per-case', description: 'HKP-Aufstellung' },
      { code: '2200', system: 'GOZ', multiplicity: 'per-tooth', description: 'Neue Vollkrone' },
    ],
    optional: [
      { code: '3000', system: 'GOZ', multiplicity: 'per-tooth', description: 'Altk​rone entfernen' },
      { code: '2210', system: 'GOZ', multiplicity: 'per-tooth', description: 'Keramikkrone statt Metall' },
    ],
    festzuschussBefunde: ['1.1', '1.3', '1.5'],
  },
]
