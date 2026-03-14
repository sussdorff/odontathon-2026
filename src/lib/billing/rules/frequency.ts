import type { FrequencyRule } from '../types'

/**
 * Frequency rules — how often a code can be billed within a period.
 *
 * Sources: BEMA-Richtlinien, KZV-Abrechnungsbestimmungen, GOZ-Kommentar
 */
export const frequencyRules: FrequencyRule[] = [
  // --- Untersuchung ---
  {
    type: 'frequency', id: 'freq-01', code: '01', system: 'BEMA',
    maxCount: 2, period: 'per-year', scope: 'per-case',
    description: 'BEMA 01 (Eingehende Untersuchung): max 2x pro Jahr',
  },

  // --- Röntgen ---
  {
    type: 'frequency', id: 'freq-bema-opg', code: 'OPG', system: 'BEMA',
    maxCount: 1, period: 'per-year', scope: 'per-case',
    description: 'BEMA OPG (Panoramaschichtaufnahme): max 1x pro Jahr',
  },

  // --- Prophylaxe ---
  {
    type: 'frequency', id: 'freq-bema-ip1', code: 'IP1', system: 'BEMA',
    maxCount: 2, period: 'per-year', scope: 'per-case',
    description: 'BEMA IP1 (Mundhygienestatus): max 2x pro Jahr (6-17 Jahre)',
  },
  {
    type: 'frequency', id: 'freq-bema-ip4', code: 'IP4', system: 'BEMA',
    maxCount: 2, period: 'per-year', scope: 'per-case',
    description: 'BEMA IP4 (Fluoridierung): max 2x pro Jahr',
  },
  {
    type: 'frequency', id: 'freq-bema-pzr', code: '107', system: 'BEMA',
    maxCount: 1, period: 'per-year', scope: 'per-case',
    description: 'BEMA 107 (Zahnsteinentfernung): max 1x pro Jahr',
  },

  // --- PAR ---
  {
    type: 'frequency', id: 'freq-bema-par-status', code: '4', system: 'BEMA',
    maxCount: 1, period: 'per-2-years', scope: 'per-case',
    description: 'BEMA 4 (Parodontalstatus): max 1x pro 2 Jahre',
  },
  {
    type: 'frequency', id: 'freq-goz-par-status', code: '4000', system: 'GOZ',
    maxCount: 1, period: 'per-year', scope: 'per-case',
    description: 'GOZ 4000 (Parodontalstatus): max 1x pro Jahr (GOZ keine strikte Grenze, aber Empfehlung)',
  },

  // --- Kronen ---
  {
    type: 'frequency', id: 'freq-crown-renewal', code: '2200', system: 'GOZ',
    maxCount: 1, period: 'per-3-years', scope: 'per-tooth',
    description: 'GOZ 2200 (Vollkrone): Erneuerung frühestens nach 3 Jahren je Zahn',
  },

  // --- Füllungen ---
  {
    type: 'frequency', id: 'freq-bema-filling', code: '13a', system: 'BEMA',
    maxCount: 1, period: 'per-2-years', scope: 'per-tooth',
    description: 'BEMA 13a (Füllung einflächig): Erneuerung nach 2 Jahren je Zahn',
  },

  // --- ZE / HKP ---
  {
    type: 'frequency', id: 'freq-hkp', code: '0030', system: 'GOZ',
    maxCount: 1, period: 'per-session', scope: 'per-case',
    description: 'GOZ 0030 (HKP-Aufstellung): 1x pro Behandlungsfall',
  },

  // --- Implantologie ---
  {
    type: 'frequency', id: 'freq-implant', code: '9000', system: 'GOZ',
    maxCount: 1, period: 'per-lifetime', scope: 'per-tooth',
    description: 'GOZ 9000 (Implantatinsertion): 1x pro Region/Zahn (Ausnahme: Explantation + Re-Implantation)',
  },

  // --- Anästhesie ---
  {
    type: 'frequency', id: 'freq-anaesthesie', code: '0090', system: 'GOZ',
    maxCount: 8, period: 'per-session', scope: 'per-case',
    description: 'GOZ 0090 (Infiltrationsanästhesie): max 8x pro Sitzung',
  },

  // --- Teleskopkronen ---
  {
    type: 'frequency', id: 'freq-teleskop', code: '5030', system: 'GOZ',
    maxCount: 1, period: 'per-3-years', scope: 'per-tooth',
    description: 'GOZ 5030 (Teleskopkrone): Erneuerung frühestens nach 3 Jahren je Zahn',
  },

  // --- UPT (Unterstützende Parodontitistherapie) ---
  {
    type: 'frequency', id: 'freq-upt', code: 'UPT', system: 'BEMA',
    maxCount: 4, period: 'per-year', scope: 'per-case',
    description: 'BEMA UPT: max 4x pro Jahr in den ersten 2 Jahren nach PAR-Therapie',
  },

  // --- Prävention § 22a SGB V ---
  {
    type: 'frequency', id: 'freq-174a', code: '174a', system: 'BEMA',
    maxCount: 1, period: 'per-halfyear', scope: 'per-case',
    description: 'BEMA 174a (PBa Mundgesundheitsstatus): max 1x pro Kalenderhalbjahr',
  },
  {
    type: 'frequency', id: 'freq-174b', code: '174b', system: 'BEMA',
    maxCount: 1, period: 'per-halfyear', scope: 'per-case',
    description: 'BEMA 174b (PBb Mundgesundheitsaufklärung): max 1x pro Kalenderhalbjahr',
  },
  {
    type: 'frequency', id: 'freq-107a', code: '107a', system: 'BEMA',
    maxCount: 1, period: 'per-halfyear', scope: 'per-case',
    description: 'BEMA 107a (PBZst Zahnsteinentfernung): max 1x pro Kalenderhalbjahr',
  },

  // --- Telemedizin ---
  {
    type: 'frequency', id: 'freq-vfk', code: 'VFK', system: 'BEMA',
    maxCount: 3, period: 'per-quarter', scope: 'per-case',
    description: 'BEMA VFK (Videofallkonferenz): max 3x pro Quartal je Versicherten',
  },

  // --- GOÄ Nr. 15 (Mundgesundheitsstatus PKV) ---
  {
    type: 'frequency', id: 'freq-goae-15', code: '15', system: 'GOZ',
    maxCount: 1, period: 'per-year', scope: 'per-case',
    description: 'GOÄ Nr. 15 (Mundgesundheitsstatus PKV): max 1x pro Kalenderjahr',
  },

  // --- Technikzuschlag ---
  {
    type: 'frequency', id: 'freq-tz', code: 'TZ', system: 'BEMA',
    maxCount: 10, period: 'per-quarter', scope: 'per-case',
    description: 'BEMA TZ (Technikzuschlag): neben den ersten 10 Positionen pro Quartal je Praxis',
  },
]
