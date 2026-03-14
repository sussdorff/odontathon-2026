/**
 * Kostenkalkulator für GOZ und BEMA Abrechnungspositionen.
 * Lädt Katalogdaten statisch aus den Seed-JSON-Dateien (kein Aidbox-Zugriff).
 */

import gozCatalogRaw from '../../../aidbox/seed/goz-catalog.json' assert { type: 'json' }
import bemaCatalogRaw from '../../../aidbox/seed/bema-catalog.json' assert { type: 'json' }
import punktwerteRaw from '../../../etl/punktwerte/data/punktwerte_berlin_q1_2026.json' assert { type: 'json' }

// --- Types ---

export interface GOZPriceResult {
  code: string
  description: string
  punktzahl: number
  grundpreis: number  // at 1.0x
  factor: number
  total: number
}

export interface BEMAPriceResult {
  code: string
  description: string
  punktzahl: number
  punktwert: number
  kassenart: string
  bereich: string
  total: number
}

export interface CostItem {
  code: string
  system: 'GOZ' | 'BEMA'
  multiplier?: number       // GOZ only
  kassenart?: string        // BEMA only
  bereich?: string          // BEMA category (KCH/ZE/PAR)
  count?: number            // how many teeth
}

export interface CostBreakdown {
  items: Array<GOZPriceResult | BEMAPriceResult>
  totalGOZ: number
  totalBEMA: number
  total: number
  patientShare?: number    // total - festzuschuss
  festzuschuss?: number
}

// --- Catalog loading ---

type FHIRBundle = { resourceType: string; entry: Array<{ resource: Record<string, unknown> }> }

function loadChargeItemDefinitions(catalog: unknown, urlPrefix: string): Map<string, Record<string, unknown>> {
  const bundle = catalog as FHIRBundle
  const map = new Map<string, Record<string, unknown>>()

  for (const entry of bundle.entry) {
    const r = entry.resource
    if (r.resourceType !== 'ChargeItemDefinition') continue
    if (typeof r.url !== 'string') continue
    if (!r.url.startsWith(urlPrefix)) continue

    // Extract the code from the coding
    const code = (r as any).code?.coding?.[0]?.code as string | undefined
    if (code) {
      map.set(code, r)
    }
  }

  return map
}

const gozCatalog = loadChargeItemDefinitions(gozCatalogRaw, 'http://fhir.de/ChargeItemDefinition/goz/')
const bemaCatalog = loadChargeItemDefinitions(bemaCatalogRaw, 'http://fhir.de/ChargeItemDefinition/bema/')

// --- BEMA bereich detection ---

/**
 * Determine the billing area (Bereich) for a BEMA code based on its prefix.
 * Prefixes per area:
 *   KCH: Ä, P, Beh, X, numeric codes (01, 02, etc.)
 *   ZE:  B, Z, BF, AK
 *   PAR: PAR, MHU, UPT
 */
export function detectBEMABereich(code: string): string {
  const trimmed = code.trim()

  if (trimmed.startsWith('PAR') || trimmed.startsWith('MHU') || trimmed.startsWith('UPT')) {
    return 'PAR'
  }
  if (trimmed.startsWith('B') || trimmed.startsWith('Z') || trimmed.startsWith('BF') || trimmed.startsWith('AK')) {
    // Distinguish Beh (KCH) from B/BF (ZE)
    if (trimmed.startsWith('Beh')) return 'KCH'
    return 'ZE'
  }
  // Default: KCH (covers Ä, P, X, numeric codes)
  return 'KCH'
}

// --- Implementations ---

/**
 * Calculate the price for a GOZ billing code at a given multiplier factor.
 * Formula: grundpreis (= Punktzahl × 0.0562421 EUR, pre-computed in catalog) × factor
 */
export function calculateGOZPrice(code: string, factor: number): GOZPriceResult {
  const resource = gozCatalog.get(code)
  if (!resource) {
    throw new Error(`GOZ code ${code} not found in catalog`)
  }

  const coding = (resource as any).code?.coding?.[0]
  const description: string = coding?.display ?? `GOZ ${code}`

  const priceComponent = (resource as any).propertyGroup?.[0]?.priceComponent?.[0]
  if (!priceComponent) {
    throw new Error(`GOZ code ${code} has no price component`)
  }

  const punktzahl: number = priceComponent.factor ?? 0
  const grundpreis: number = priceComponent.amount?.value ?? (punktzahl * 0.0562421)
  const total = Math.round(grundpreis * factor * 100) / 100

  return {
    code,
    description,
    punktzahl,
    grundpreis: Math.round(grundpreis * 100) / 100,
    factor,
    total,
  }
}

/**
 * Calculate the price for a BEMA billing code for a given Kassenart and optionally Bereich.
 * Formula: Punktzahl × Punktwert_EUR
 */
export function calculateBEMAPrice(code: string, kassenart: string, bereich?: string): BEMAPriceResult {
  const resource = bemaCatalog.get(code)
  if (!resource) {
    throw new Error(`BEMA code ${code} not found in catalog`)
  }

  const coding = (resource as any).code?.coding?.[0]
  const description: string = coding?.display ?? `BEMA ${code}`

  const priceComponent = (resource as any).propertyGroup?.[0]?.priceComponent?.[0]
  if (!priceComponent) {
    throw new Error(`BEMA code ${code} has no price component`)
  }

  const punktzahl: number = priceComponent.factor ?? 0

  // Determine Bereich
  const resolvedBereich = bereich ?? detectBEMABereich(code)

  // Look up Punktwert
  const kassenarten = (punktwerteRaw as any).kassenarten
  const kassenartData = kassenarten[kassenart]
  if (!kassenartData) {
    throw new Error(`Kassenart ${kassenart} not found in Punktwerte. Available: ${Object.keys(kassenarten).join(', ')}`)
  }

  const punktwert: number = kassenartData[resolvedBereich]
  if (punktwert == null) {
    throw new Error(`Bereich ${resolvedBereich} not found for Kassenart ${kassenart}`)
  }

  const total = Math.round(punktzahl * punktwert * 100) / 100

  return {
    code,
    description,
    punktzahl,
    punktwert,
    kassenart,
    bereich: resolvedBereich,
    total,
  }
}

/**
 * Calculate full cost breakdown for a list of billing items.
 */
export function calculateCosts(items: CostItem[]): CostBreakdown {
  const resultItems: Array<GOZPriceResult | BEMAPriceResult> = []
  let totalGOZ = 0
  let totalBEMA = 0

  for (const item of items) {
    const count = item.count ?? 1

    if (item.system === 'GOZ') {
      const factor = item.multiplier ?? 2.3  // Standard-Regelhöchstsatz
      const result = calculateGOZPrice(item.code, factor)
      const scaledTotal = Math.round(result.total * count * 100) / 100
      const scaledResult: GOZPriceResult = { ...result, total: scaledTotal }
      resultItems.push(scaledResult)
      totalGOZ += scaledTotal
    } else {
      const kassenart = item.kassenart ?? 'AOK'
      const result = calculateBEMAPrice(item.code, kassenart, item.bereich)
      const scaledTotal = Math.round(result.total * count * 100) / 100
      const scaledResult: BEMAPriceResult = { ...result, total: scaledTotal }
      resultItems.push(scaledResult)
      totalBEMA += scaledTotal
    }
  }

  totalGOZ = Math.round(totalGOZ * 100) / 100
  totalBEMA = Math.round(totalBEMA * 100) / 100
  const total = Math.round((totalGOZ + totalBEMA) * 100) / 100

  return {
    items: resultItems,
    totalGOZ,
    totalBEMA,
    total,
  }
}

/**
 * Calculate cost breakdown and patient share after applying Festzuschuss.
 * Patient pays: total - festzuschussAmount (but at least 0).
 */
export function calculatePatientShare(items: CostItem[], festzuschussAmount: number): CostBreakdown {
  const breakdown = calculateCosts(items)
  const patientShare = Math.max(0, Math.round((breakdown.total - festzuschussAmount) * 100) / 100)

  return {
    ...breakdown,
    festzuschuss: festzuschussAmount,
    patientShare,
  }
}
