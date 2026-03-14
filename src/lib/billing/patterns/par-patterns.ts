import type { BillingPattern } from '../types'

/**
 * PAR patterns — Parodontologische Behandlungsstrecke.
 */
export const parPatterns: BillingPattern[] = [
  // --- PAR-Vorbehandlung (BEMA) ---
  {
    id: 'bema-par-vorbehandlung',
    name: 'PAR-Vorbehandlung (BEMA)',
    category: 'PAR', system: 'BEMA',
    required: [
      { code: '4', system: 'BEMA', multiplicity: 'per-case', description: 'Parodontalstatus (PSI)' },
      { code: '107', system: 'BEMA', multiplicity: 'per-case', description: 'Zahnsteinentfernung' },
      { code: 'MHI', system: 'BEMA', multiplicity: 'per-case', description: 'Mundhygieneindex / -instruktion' },
    ],
    optional: [
      { code: 'OPG', system: 'BEMA', multiplicity: 'per-case', description: 'Panoramaschichtaufnahme' },
    ],
  },

  // --- PAR-Therapie (BEMA, neue Richtlinie 2021) ---
  {
    id: 'bema-par-therapie',
    name: 'Systematische PAR-Therapie (BEMA)',
    category: 'PAR', system: 'BEMA',
    required: [
      { code: 'BEVa', system: 'BEMA', multiplicity: 'per-case', description: 'Befundevaluation' },
      { code: 'ATa', system: 'BEMA', multiplicity: 'per-tooth', description: 'Antiinfektiöse Therapie (geschlossenes Scaling)', notes: 'Pro Zahn mit Tasche ≥4mm' },
    ],
    optional: [
      { code: 'ATb', system: 'BEMA', multiplicity: 'per-tooth', description: 'Offene PAR-Chirurgie (nach AT)', notes: 'Nur bei persistierenden Taschen ≥6mm' },
      { code: 'CPTa', system: 'BEMA', multiplicity: 'per-tooth', description: 'Chirurgische Therapie (Lappen)' },
    ],
    conditions: [
      { field: 'parStatus', operator: 'equals', value: 'completed' },
    ],
  },

  // --- UPT (Unterstützende Parodontitistherapie) ---
  {
    id: 'bema-upt',
    name: 'Unterstützende Parodontitistherapie (BEMA)',
    category: 'PAR', system: 'BEMA',
    required: [
      { code: 'UPTa', system: 'BEMA', multiplicity: 'per-case', description: 'UPT-Sitzung (Mundhygienekontrolle + Instrumentation)', notes: '1. Jahr: max 3x, 2. Jahr: max 2x' },
    ],
    optional: [
      { code: 'UPTb', system: 'BEMA', multiplicity: 'per-case', description: 'Erweiterte UPT (bei Grad C Parodontitis)' },
    ],
    conditions: [
      { field: 'parTherapy', operator: 'equals', value: 'completed' },
    ],
  },

  // --- PAR-Therapie (GOZ/PKV) ---
  {
    id: 'goz-par-therapie',
    name: 'Systematische PAR-Therapie (GOZ)',
    category: 'PAR', system: 'GOZ',
    required: [
      { code: '4000', system: 'GOZ', multiplicity: 'per-case', description: 'Parodontalstatus' },
      { code: '4050', system: 'GOZ', multiplicity: 'per-tooth', description: 'Subgingivales Scaling', notes: 'Pro Zahn' },
    ],
    optional: [
      { code: '4070', system: 'GOZ', multiplicity: 'per-tooth', description: 'PAR-Chirurgie geschlossen' },
      { code: '4075', system: 'GOZ', multiplicity: 'per-tooth', description: 'PAR-Chirurgie offen (Lappenoperation)' },
      { code: '4080', system: 'GOZ', multiplicity: 'per-tooth', description: 'Gesteuerte Geweberegeneration (GTR)' },
    ],
  },
]
