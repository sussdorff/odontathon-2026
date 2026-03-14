import type { MultiplierRule } from '../types'

/**
 * GOZ multiplier rules — Steigerungsfaktoren nach § 5 GOZ.
 *
 * GOZ has three tiers:
 * - Standard (1.0x): base rate
 * - Threshold (Schwellenwert, 2.3x or 1.8x/1.15x): no justification needed up to here
 * - Max (3.5x or 2.5x/1.3x): requires written justification (§ 10 GOZ)
 *
 * Different sections have different thresholds:
 * - Zahnärztliche Leistungen (§ 5 Abs. 2): 1.0 / 2.3 / 3.5
 * - Medizinisch-technische Leistungen: 1.0 / 1.8 / 2.5
 * - Zahntechnische Leistungen (Labor): 1.0 / 1.15 / 1.3 (in practice often not steigerable)
 */

/** Default multiplier tiers for most GOZ codes (zahnärztliche Leistungen) */
const DEFAULT_TIERS = { standard: 1.0, threshold: 2.3, max: 3.5 }

/** Multiplier tiers for medizinisch-technische Leistungen (Abschnitt L) */
const MED_TECH_TIERS = { standard: 1.0, threshold: 1.8, max: 2.5 }

/** Key GOZ codes with explicit multiplier rules */
export const multiplierRules: MultiplierRule[] = [
  // --- Allgemeine zahnärztliche Leistungen (Abschnitt A) ---
  {
    type: 'multiplier', id: 'mult-0010', code: '0010', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 0010 (Eingehende Untersuchung): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-0030', code: '0030', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 0030 (HKP-Aufstellung): Standard 2.3x, max 3.5x',
  },

  // --- Konservierende Leistungen (Abschnitt B) ---
  {
    type: 'multiplier', id: 'mult-2060', code: '2060', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 2060 (Füllung einflächig): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-2080', code: '2080', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 2080 (Füllung zweiflächig): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-2100', code: '2100', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 2100 (Füllung dreiflächig): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-2120', code: '2120', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 2120 (Füllung >3 Flächen): Standard 2.3x, max 3.5x',
  },

  // --- Kronen/Brücken (Abschnitt D/E) ---
  {
    type: 'multiplier', id: 'mult-2200', code: '2200', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 2200 (Vollkrone Metall): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-2210', code: '2210', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 2210 (Vollkrone Keramik): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-5000', code: '5000', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 5000 (Brückenglied): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-5120', code: '5120', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 5120 (Eingliedern Brücke): Standard 2.3x, max 3.5x',
  },

  // --- Implantologie (Abschnitt H) ---
  {
    type: 'multiplier', id: 'mult-9000', code: '9000', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 9000 (Implantatinsertion): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-9010', code: '9010', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 9010 (Implantatfreilegung): Standard 2.3x, max 3.5x',
  },

  // --- PAR (Abschnitt C) ---
  {
    type: 'multiplier', id: 'mult-4000', code: '4000', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 4000 (Parodontalstatus): Standard 2.3x, max 3.5x',
  },

  // --- Medizinisch-technische Leistungen (Abschnitt L) ---
  {
    type: 'multiplier', id: 'mult-5170', code: '5170', system: 'GOZ',
    ...MED_TECH_TIERS,
    description: 'GOZ 5170 (Abformung): Med-tech Schwellenwert 1.8x, max 2.5x',
  },

  // --- Prophylaxe ---
  {
    type: 'multiplier', id: 'mult-1040', code: '1040', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 1040 (PZR): Standard 2.3x, max 3.5x',
  },

  // --- Anästhesie ---
  {
    type: 'multiplier', id: 'mult-0090', code: '0090', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 0090 (Infiltrationsanästhesie): Standard 2.3x, max 3.5x',
  },
  {
    type: 'multiplier', id: 'mult-0100', code: '0100', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 0100 (Leitungsanästhesie): Standard 2.3x, max 3.5x',
  },

  // --- Chirurgie ---
  {
    type: 'multiplier', id: 'mult-3000', code: '3000', system: 'GOZ',
    ...DEFAULT_TIERS,
    description: 'GOZ 3000 (Extraktion): Standard 2.3x, max 3.5x',
  },
]

/**
 * Get the default multiplier tiers for a GOZ code.
 * Falls back to standard dental tiers if no specific rule exists.
 */
export function getMultiplierTiers(code: string): { standard: number; threshold: number; max: number } {
  const rule = multiplierRules.find(r => r.code === code)
  if (rule) return { standard: rule.standard, threshold: rule.threshold, max: rule.max }
  // Codes starting with 5 in the 5100+ range are often med-tech
  if (code >= '5100' && code <= '5199') return MED_TECH_TIERS
  return DEFAULT_TIERS
}
