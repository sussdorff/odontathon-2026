#!/usr/bin/env bun
/**
 * Festzuschuss Befundklassen to FHIR R4 Bundle Converter
 *
 * Reads curated Festzuschuss catalog and generates FHIR R4 Bundle:
 * - 1x CodeSystem (Befundklassen)
 * - Nx ChargeItemDefinition (one per Befundklasse, 60% base amount)
 *
 * Source: KZBV FZ-Kompendium 2025-01-01 (ZE-Punktwert 1,1304 EUR, BEL II ab 01.01.2025)
 * Output: aidbox/seed/festzuschuss-catalog.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = join(SCRIPT_DIR, '..', '..')
const DATA_PATH = join(SCRIPT_DIR, 'data', 'festzuschuss_catalog.json')
const OUTPUT_PATH = join(PROJECT_ROOT, 'aidbox', 'seed', 'festzuschuss-catalog.json')

const CODESYSTEM_URL = 'http://fhir.de/CodeSystem/kzbv-festzuschuss-befundklassen'
const CHARGEITEM_URL_PREFIX = 'http://fhir.de/ChargeItemDefinition/kzbv-festzuschuss'

interface FestzuschussEntry {
  befundklasse: string
  befund: string
  regelversorgung: string
  festzuschuss_60_eur: number
  festzuschuss_70_eur: number
  festzuschuss_75_eur: number
  festzuschuss_100_eur: number
}

function sanitizeId(code: string): string {
  return code.replace(/\./g, '-')
}

function buildCodeSystem(entries: FestzuschussEntry[]) {
  const concepts = entries.map((entry) => ({
    code: entry.befundklasse,
    display: entry.regelversorgung,
    definition: entry.befund,
    property: [
      { code: 'regelversorgung', valueString: entry.regelversorgung },
      { code: 'befundklasse-gruppe', valueString: entry.befundklasse.split('.')[0] },
    ],
  }))

  return {
    resourceType: 'CodeSystem',
    url: CODESYSTEM_URL,
    version: '2025-01-01',
    name: 'KZBVFestzuschussBefundklassen',
    title: 'KZBV Festzuschuss Befundklassen für Zahnersatz',
    status: 'active',
    content: 'complete',
    count: concepts.length,
    property: [
      { code: 'regelversorgung', description: 'Art der Regelversorgung', type: 'string' },
      { code: 'befundklasse-gruppe', description: 'Übergeordnete Befundklasse (1-8)', type: 'string' },
    ],
    concept: concepts,
  }
}

function buildChargeItemDefinition(entry: FestzuschussEntry) {
  const id = sanitizeId(entry.befundklasse)
  return {
    resourceType: 'ChargeItemDefinition',
    url: `${CHARGEITEM_URL_PREFIX}/${id}`,
    status: 'active',
    title: `Festzuschuss Befund ${entry.befundklasse}: ${entry.regelversorgung}`,
    description: entry.befund,
    code: {
      coding: [{ system: CODESYSTEM_URL, code: entry.befundklasse, display: entry.regelversorgung }],
    },
    propertyGroup: [
      {
        // 60% (ohne Bonus) — Standardfall
        priceComponent: [{
          type: 'base',
          code: { coding: [{ code: '60pct', display: 'Festzuschuss 60% (ohne Bonus)' }] },
          amount: { value: entry.festzuschuss_60_eur, currency: 'EUR' },
        }],
      },
      {
        // 70% (Bonus 1 — 5 Jahre Bonusheft)
        priceComponent: [{
          type: 'surcharge',
          code: { coding: [{ code: '70pct', display: 'Festzuschuss 70% (Bonus 1)' }] },
          amount: { value: entry.festzuschuss_70_eur, currency: 'EUR' },
        }],
      },
      {
        // 75% (Bonus 2 — 10 Jahre Bonusheft)
        priceComponent: [{
          type: 'surcharge',
          code: { coding: [{ code: '75pct', display: 'Festzuschuss 75% (Bonus 2)' }] },
          amount: { value: entry.festzuschuss_75_eur, currency: 'EUR' },
        }],
      },
      {
        // 100% (Härtefall)
        priceComponent: [{
          type: 'surcharge',
          code: { coding: [{ code: '100pct', display: 'Festzuschuss 100% (Härtefall)' }] },
          amount: { value: entry.festzuschuss_100_eur, currency: 'EUR' },
        }],
      },
    ],
  }
}

function buildBundle(entries: FestzuschussEntry[]) {
  const bundleEntries: Record<string, unknown>[] = []

  const codeSystem = buildCodeSystem(entries)
  bundleEntries.push({
    fullUrl: CODESYSTEM_URL,
    resource: codeSystem,
    request: { method: 'PUT', url: `CodeSystem?url=${CODESYSTEM_URL}` },
  })

  for (const entry of entries) {
    const cid = buildChargeItemDefinition(entry)
    const fullUrl = `${CHARGEITEM_URL_PREFIX}/${sanitizeId(entry.befundklasse)}`
    bundleEntries.push({
      fullUrl,
      resource: cid,
      request: { method: 'PUT', url: `ChargeItemDefinition?url=${encodeURIComponent(fullUrl)}` },
    })
  }

  return { resourceType: 'Bundle', type: 'transaction', entry: bundleEntries }
}

// --- Main ---

const entries: FestzuschussEntry[] = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

console.error(`Converting ${entries.length} Festzuschuss Befundklassen to FHIR Bundle...`)

const bundle = buildBundle(entries)

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(bundle, null, 2) + '\n', 'utf-8')

const total = bundle.entry.length
console.error(
  `Written ${total} resources ` +
  `(1 CodeSystem + ${total - 1} ChargeItemDefinitions) ` +
  `to ${OUTPUT_PATH}`
)
console.log(JSON.stringify(bundle, null, 2))
