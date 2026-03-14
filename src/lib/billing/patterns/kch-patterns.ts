import type { BillingPattern } from '../types'

/**
 * KCH patterns — Füllungen, Endodontie, Chirurgie.
 */
export const kchPatterns: BillingPattern[] = [
  // --- Füllungstherapie ---
  {
    id: 'goz-composite-filling',
    name: 'Kompositfüllung (GOZ)',
    category: 'KCH', system: 'GOZ',
    required: [
      { code: '2060', system: 'GOZ', multiplicity: 'per-tooth', description: 'Füllung einflächig' },
    ],
    optional: [
      { code: '2080', system: 'GOZ', multiplicity: 'per-tooth', description: 'Füllung zweiflächig (statt 2060)' },
      { code: '2100', system: 'GOZ', multiplicity: 'per-tooth', description: 'Füllung dreiflächig (statt 2060)' },
      { code: '2120', system: 'GOZ', multiplicity: 'per-tooth', description: 'Füllung >3 Flächen (statt 2060)' },
      { code: '0090', system: 'GOZ', multiplicity: 'per-case', description: 'Infiltrationsanästhesie' },
    ],
    requiredDocTemplate: 'fuellungstherapie',
    docCompletionRequired: false,
  },

  // --- Endodontie ---
  {
    id: 'goz-root-canal',
    name: 'Wurzelkanalbehandlung (GOZ)',
    category: 'KCH', system: 'GOZ',
    required: [
      { code: '2380', system: 'GOZ', multiplicity: 'per-tooth', description: 'Wurzelkanalbehandlung' },
      { code: '2390', system: 'GOZ', multiplicity: 'per-tooth', description: 'Wurzelkanalaufbereitung', notes: 'Pro Kanal' },
      { code: '2400', system: 'GOZ', multiplicity: 'per-tooth', description: 'Wurzelfüllung' },
    ],
    optional: [
      { code: '2360', system: 'GOZ', multiplicity: 'per-tooth', description: 'Vitalamputation (statt 2380 bei Vitalexstirpation)' },
      { code: '0090', system: 'GOZ', multiplicity: 'per-case', description: 'Infiltrationsanästhesie' },
      { code: '0100', system: 'GOZ', multiplicity: 'per-case', description: 'Leitungsanästhesie' },
    ],
    requiredDocTemplate: 'endodontische-behandlung',
    docCompletionRequired: true,
  },

  // --- Extraktion ---
  {
    id: 'goz-extraction',
    name: 'Zahnextraktion (GOZ)',
    category: 'KCH', system: 'GOZ',
    required: [
      { code: '3000', system: 'GOZ', multiplicity: 'per-tooth', description: 'Extraktion' },
      { code: '0090', system: 'GOZ', multiplicity: 'per-case', description: 'Infiltrationsanästhesie' },
    ],
    optional: [
      { code: '3010', system: 'GOZ', multiplicity: 'per-tooth', description: 'Operative Extraktion (statt 3000)' },
      { code: '3020', system: 'GOZ', multiplicity: 'per-tooth', description: 'Osteotomie (statt 3000)' },
      { code: '0100', system: 'GOZ', multiplicity: 'per-case', description: 'Leitungsanästhesie (statt 0090)' },
    ],
    requiredDocTemplate: 'extraktion',
    docCompletionRequired: true,
  },

  // --- BEMA Füllungstherapie ---
  {
    id: 'bema-filling',
    name: 'Füllung (BEMA/Kassenleistung)',
    category: 'KCH', system: 'BEMA',
    required: [
      { code: '13a', system: 'BEMA', multiplicity: 'per-tooth', description: 'Füllung einflächig' },
    ],
    optional: [
      { code: '13b', system: 'BEMA', multiplicity: 'per-tooth', description: 'Füllung zweiflächig (statt 13a)' },
      { code: '13c', system: 'BEMA', multiplicity: 'per-tooth', description: 'Füllung dreiflächig (statt 13a)' },
      { code: '13d', system: 'BEMA', multiplicity: 'per-tooth', description: 'Füllung >3 Flächen (statt 13a)' },
    ],
    requiredDocTemplate: 'fuellungstherapie',
    docCompletionRequired: false,
  },

  // --- Wurzelspitzenresektion ---
  {
    id: 'goz-wsr',
    name: 'Wurzelspitzenresektion (GOZ)',
    category: 'KCH', system: 'GOZ',
    required: [
      { code: '3110', system: 'GOZ', multiplicity: 'per-tooth', description: 'Wurzelspitzenresektion einwurzelig' },
    ],
    optional: [
      { code: '3120', system: 'GOZ', multiplicity: 'per-tooth', description: 'Wurzelspitzenresektion mehrwurzelig (statt 3110)' },
      { code: '0090', system: 'GOZ', multiplicity: 'per-case', description: 'Infiltrationsanästhesie' },
      { code: '0100', system: 'GOZ', multiplicity: 'per-case', description: 'Leitungsanästhesie (statt 0090)' },
    ],
    requiredDocTemplate: 'wurzelspitzenresektion',
    docCompletionRequired: true,
  },
]
