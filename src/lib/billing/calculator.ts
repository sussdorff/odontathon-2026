/**
 * Price calculator for GOZ (private) and BEMA (statutory) dental billing.
 *
 * Data is loaded at module load time from the local FHIR seed catalogs:
 *   - aidbox/seed/goz-catalog.json
 *   - aidbox/seed/bema-catalog.json
 *   - aidbox/seed/festzuschuss-catalog.json
 *   - aidbox/seed/punktwerte-berlin.json
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** GOZ Punktwert (fixed since 1988, §5 GOZ) */
const GOZ_PUNKTWERT = 0.0562421

/** Default GOZ factor (Regelhöchstsatz / Schwellenwert §5 Abs. 2 GOZ) */
const GOZ_DEFAULT_FACTOR = 2.3

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

/** Path to project root (three levels up from src/lib/billing/) */
const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..')

function loadJson(relativePath: string): unknown {
  const abs = join(PROJECT_ROOT, relativePath)
  return JSON.parse(readFileSync(abs, 'utf-8'))
}

interface FhirBundle {
  entry: Array<{ resource: FhirResource }>
}

interface FhirResource {
  resourceType: string
  [key: string]: unknown
}

interface ChargeItemDefinition extends FhirResource {
  resourceType: 'ChargeItemDefinition'
  url: string
  code?: {
    coding: Array<{ code: string; display?: string }>
  }
  propertyGroup?: Array<{
    priceComponent?: Array<{
      type: string
      code?: { coding?: Array<{ code: string; display?: string }> }
      factor?: number
      amount?: { value: number; currency?: string }
    }>
  }>
}

interface CodeSystemConcept {
  code: string
  display?: string
  property?: Array<{ code: string; valueString?: string }>
}

// ---------------------------------------------------------------------------
// Build lookup maps from catalogs
// ---------------------------------------------------------------------------

/** GOZ: code → Punktzahl */
const gozPunktzahl = new Map<string, number>()

;(function loadGOZ() {
  const bundle = loadJson('aidbox/seed/goz-catalog.json') as FhirBundle
  for (const entry of bundle.entry) {
    const res = entry.resource as ChargeItemDefinition
    if (res.resourceType !== 'ChargeItemDefinition') continue
    const code = res.code?.coding?.[0]?.code
    if (!code) continue
    const factor = res.propertyGroup?.[0]?.priceComponent?.[0]?.factor
    if (factor !== undefined) {
      gozPunktzahl.set(code, factor)
    }
  }
})()

/** BEMA: code → Punktzahl */
const bemaPunktzahl = new Map<string, number>()
/** BEMA: code → bereich (KCH | ZE | PAR | KFO) */
const bemaBereich = new Map<string, string>()

;(function loadBEMA() {
  const bundle = loadJson('aidbox/seed/bema-catalog.json') as FhirBundle
  for (const entry of bundle.entry) {
    const res = entry.resource
    if (res.resourceType === 'ChargeItemDefinition') {
      const cid = res as ChargeItemDefinition
      const code = cid.code?.coding?.[0]?.code
      if (!code) continue
      const factor = cid.propertyGroup?.[0]?.priceComponent?.[0]?.factor
      if (factor !== undefined) {
        bemaPunktzahl.set(code, factor)
      }
    } else if (res.resourceType === 'CodeSystem') {
      // Extract bereich from CodeSystem concepts
      const concepts = (res.concept as CodeSystemConcept[]) ?? []
      for (const concept of concepts) {
        const bereichProp = concept.property?.find(p => p.code === 'bereich')
        if (bereichProp?.valueString) {
          bemaBereich.set(concept.code, bereichProp.valueString)
        }
      }
    }
  }
})()

/** Festzuschuss: befundklasse code → { bonusTier → amount } */
const festzuschussMap = new Map<string, Map<string, number>>()

;(function loadFestzuschuss() {
  const bundle = loadJson('aidbox/seed/festzuschuss-catalog.json') as FhirBundle
  for (const entry of bundle.entry) {
    const res = entry.resource as ChargeItemDefinition
    if (res.resourceType !== 'ChargeItemDefinition') continue
    const code = res.code?.coding?.[0]?.code
    if (!code) continue
    const tiers = new Map<string, number>()
    for (const pg of res.propertyGroup ?? []) {
      for (const pc of pg.priceComponent ?? []) {
        const tierCode = pc.code?.coding?.[0]?.code
        const amount = pc.amount?.value
        if (tierCode && amount !== undefined) {
          tiers.set(tierCode, amount)
        }
      }
    }
    festzuschussMap.set(code, tiers)
  }
})()

/**
 * Punktwerte: `${kassenart}-${bereich}` → EUR per Punkt
 * Source: punktwerte-berlin.json (KZV Berlin 2026 Q1)
 */
const punktwerteMap = new Map<string, number>()

;(function loadPunktwerte() {
  const bundle = loadJson('aidbox/seed/punktwerte-berlin.json') as FhirBundle
  // Bundle wraps a single Parameters resource
  for (const entry of bundle.entry) {
    const res = entry.resource as { resourceType: string; parameter?: Array<{ name: string; part?: Array<{ name: string; valueString?: string; valueDecimal?: number }> }> }
    if (res.resourceType !== 'Parameters') continue
    for (const param of res.parameter ?? []) {
      if (!param.name.startsWith('punktwert-')) continue
      const parts = param.part ?? []
      const kassenart = parts.find(p => p.name === 'kassenart')?.valueString
      const bereich = parts.find(p => p.name === 'bereich')?.valueString
      const value = parts.find(p => p.name === 'punktwert_eur')?.valueDecimal
      if (kassenart && bereich && value !== undefined) {
        punktwerteMap.set(`${kassenart}-${bereich}`, value)
      }
    }
  }
})()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate GOZ price.
 *
 * Formula: Punktzahl × 0.0562421 (Punktwert) × Steigerungsfaktor
 *
 * @param code  GOZ code, e.g. '0010'
 * @param factor  Steigerungsfaktor, defaults to 2.3 (Regelhöchstsatz)
 * @returns Price in EUR, rounded to 2 decimal places
 */
export function calculateGOZPrice(code: string, factor: number = GOZ_DEFAULT_FACTOR): number {
  const punktzahl = gozPunktzahl.get(code)
  if (punktzahl === undefined) {
    throw new Error(`GOZ code nicht gefunden: ${code}`)
  }
  return round2(punktzahl * GOZ_PUNKTWERT * factor)
}

/**
 * Calculate BEMA price for a given Kassenart.
 *
 * Formula: Punktzahl × regionaler Punktwert (EUR)
 *
 * Uses KZV Berlin Punktwerte 2026 Q1.
 *
 * @param code  BEMA code, e.g. 'Ä 1'
 * @param kassenart  'AOK' | 'BKK' | 'IKK' | 'vdek'
 * @returns Price in EUR, rounded to 2 decimal places
 */
export function calculateBEMAPrice(code: string, kassenart: string): number {
  const punktzahl = bemaPunktzahl.get(code)
  if (punktzahl === undefined) {
    throw new Error(`BEMA code nicht gefunden: ${code}`)
  }
  const bereich = bemaBereich.get(code)
  if (!bereich) {
    throw new Error(`BEMA code ${code}: kein Bereich (KCH/ZE/PAR/KFO) gefunden`)
  }
  const key = `${kassenart}-${bereich}`
  const punktwert = punktwerteMap.get(key)
  if (punktwert === undefined) {
    throw new Error(`Kassenart/Punktwert nicht gefunden: ${key}. Verfügbare Kassenarten: AOK, BKK, IKK, vdek`)
  }
  return round2(punktzahl * punktwert)
}

export interface PatientShareItem {
  code: string
  system: 'GOZ' | 'BEMA'
  /** GOZ Steigerungsfaktor, defaults to 2.3 */
  factor?: number
  /** Kassenart for BEMA items (falls back to top-level kassenart) */
  kassenart?: string
}

export interface PatientShareResult {
  /** Sum of all item prices */
  totalCost: number
  /** Kassenzuschuss (Festzuschuss), 0 if no befundklasse provided */
  festzuschuss: number
  /** Amount patient has to pay (totalCost - festzuschuss) */
  patientShare: number
}

/**
 * Calculate patient's share (Eigenanteil) for a treatment plan.
 *
 * @param items  Array of billing items (GOZ or BEMA)
 * @param festzuschussBefund  Befundklasse code (e.g. '1.1'). Empty string = Privatpatient (no Festzuschuss).
 * @param bonusTier  '60pct' | '70pct' | '75pct' | '100pct' (default: '60pct')
 * @param kassenart  Default Kassenart for BEMA items without an explicit kassenart
 * @returns { totalCost, festzuschuss, patientShare }
 */
export function calculatePatientShare(
  items: PatientShareItem[],
  festzuschussBefund: string,
  bonusTier: string = '60pct',
  kassenart?: string
): PatientShareResult {
  let totalCost = 0
  for (const item of items) {
    if (item.system === 'GOZ') {
      totalCost += calculateGOZPrice(item.code, item.factor)
    } else {
      const kkasse = item.kassenart ?? kassenart
      if (!kkasse) {
        throw new Error(`BEMA item ${item.code}: kassenart must be provided`)
      }
      totalCost += calculateBEMAPrice(item.code, kkasse)
    }
  }
  totalCost = round2(totalCost)

  let festzuschuss = 0
  if (festzuschussBefund) {
    const tiers = festzuschussMap.get(festzuschussBefund)
    if (!tiers) {
      throw new Error(`Festzuschuss Befundklasse nicht gefunden: ${festzuschussBefund}`)
    }
    festzuschuss = tiers.get(bonusTier) ?? 0
  }

  const patientShare = round2(totalCost - festzuschuss)

  return { totalCost, festzuschuss, patientShare }
}

// ---------------------------------------------------------------------------
// Class interface (optional, wraps standalone functions)
// ---------------------------------------------------------------------------

export class PriceCalculator {
  calculateGOZPrice(code: string, factor?: number): number {
    return calculateGOZPrice(code, factor)
  }

  calculateBEMAPrice(code: string, kassenart: string): number {
    return calculateBEMAPrice(code, kassenart)
  }

  calculatePatientShare(
    items: PatientShareItem[],
    festzuschussBefund: string,
    bonusTier?: string,
    kassenart?: string
  ): PatientShareResult {
    return calculatePatientShare(items, festzuschussBefund, bonusTier, kassenart)
  }
}

export default PriceCalculator
