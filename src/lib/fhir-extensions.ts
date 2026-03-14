/**
 * FHIR Extension URIs for dental billing.
 * These are permanent identifiers, NOT deployment-specific URLs.
 */
const NS = 'https://mira.cognovis.de/fhir/StructureDefinition'

export const EXT_BILLING = {
  billingCode: `${NS}/billing-code`,
  billingSystem: `${NS}/billing-system`,
  category: `${NS}/billing-category`,
  points: `${NS}/billing-points`,
  euroValue: `${NS}/billing-euro-value`,
  multiplierMin: `${NS}/billing-multiplier-min`,
  multiplierDefault: `${NS}/billing-multiplier-default`,
  multiplierMax: `${NS}/billing-multiplier-max`,
  requirements: `${NS}/billing-requirements`,
  exclusions: `${NS}/billing-exclusions`,
  supplementTo: `${NS}/billing-supplement-to`,
} as const

/** Dental-specific code system URIs */
export const CODE_SYSTEMS = {
  /** GOZ — Gebührenordnung für Zahnärzte (private dental billing) */
  goz: 'http://fhir.de/CodeSystem/goz',
  /** BEMA — Bewertungsmaßstab zahnärztlicher Leistungen (statutory dental billing) */
  bema: 'http://fhir.de/CodeSystem/bema',
  /** BEL II — Bundeseinheitliches Leistungsverzeichnis Zahntechnik */
  bel2: 'http://fhir.de/CodeSystem/bel-ii',
} as const

export type DentalBillingSystem = keyof typeof CODE_SYSTEMS

/** Dental clinical extensions */
export const EXT_DENTAL = {
  fdiToothNumber: `${NS}/fdi-tooth-number`,
  toothSurfaces: `${NS}/tooth-surfaces`,
  zeBonusProzent: `${NS}/ze-bonus-prozent`,
} as const

/** Dental clinical code systems */
export const CODE_SYSTEMS_DENTAL = {
  fdiTooth: 'https://mira.cognovis.de/fhir/CodeSystem/fdi-tooth-number',
  toothStatus: 'https://mira.cognovis.de/fhir/CodeSystem/tooth-status',
} as const
