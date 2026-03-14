#!/usr/bin/env bun
/**
 * GOZ to FHIR R4 Bundle Converter
 *
 * Reads parsed GOZ data (from parse.ts) and generates a FHIR R4 Bundle:
 * - 1x CodeSystem with all GOZ codes
 * - Nx ChargeItemDefinition (one per fee schedule entry)
 *
 * Output: aidbox/seed/goz-catalog.json
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = join(SCRIPT_DIR, '..', '..')
const OUTPUT_PATH = join(PROJECT_ROOT, 'aidbox', 'seed', 'goz-catalog.json')

const CODESYSTEM_URL = 'http://fhir.de/CodeSystem/goz'
const CHARGEITEM_URL_PREFIX = 'http://fhir.de/ChargeItemDefinition/goz'
const MULTIPLIER_EXTENSION_URL = 'http://dental-agent.de/fhir/StructureDefinition/goz-multiplier-range'

const MULTIPLIER_MIN = 1.0
const MULTIPLIER_DEFAULT = 2.3
const MULTIPLIER_MAX = 3.5

interface GozEntry {
  nummer: string
  beschreibung: string
  punktzahl: number | null
  euro_einfachsatz: number | null
  abschnitt: string
  hinweis?: string
}

function buildCodeSystem(entries: GozEntry[]) {
  const concepts = entries.map((entry) => {
    const concept: Record<string, unknown> = {
      code: entry.nummer,
      display: entry.beschreibung,
    }
    if (entry.abschnitt) {
      concept.property = [{ code: 'abschnitt', valueString: entry.abschnitt }]
    }
    return concept
  })

  return {
    resourceType: 'CodeSystem',
    url: CODESYSTEM_URL,
    version: '1988',
    name: 'GOZ',
    title: 'Gebührenordnung für Zahnärzte (GOZ)',
    status: 'active',
    content: 'complete',
    count: concepts.length,
    property: [
      { code: 'abschnitt', description: 'Abschnitt im Gebührenverzeichnis', type: 'string' },
    ],
    concept: concepts,
  }
}

function buildChargeItemDefinition(entry: GozEntry) {
  // For percentage-based Teilleistungen (e.g. 0120, 2230, 2240, 5050, 5060, 5240),
  // no fixed Punktzahl exists — omit priceComponent factor/amount.
  const priceComponent: Record<string, unknown>[] = entry.punktzahl !== null
    ? [{
        type: 'base',
        code: { text: 'Punktzahl' },
        factor: entry.punktzahl,
        amount: { value: entry.euro_einfachsatz, currency: 'EUR' },
      }]
    : [{ type: 'base', code: { text: 'Prozentual (siehe Beschreibung)' } }]

  const cid: Record<string, unknown> = {
    resourceType: 'ChargeItemDefinition',
    url: `${CHARGEITEM_URL_PREFIX}/${entry.nummer}`,
    status: 'active',
    code: {
      coding: [{ system: CODESYSTEM_URL, code: entry.nummer, display: entry.beschreibung }],
    },
    propertyGroup: [{ priceComponent }],
    extension: [{
      url: MULTIPLIER_EXTENSION_URL,
      extension: [
        { url: 'min', valueDecimal: MULTIPLIER_MIN },
        { url: 'default', valueDecimal: MULTIPLIER_DEFAULT },
        { url: 'max', valueDecimal: MULTIPLIER_MAX },
      ],
    }],
  }
  return cid
}

function buildBundle(entries: GozEntry[]) {
  const bundleEntries: Record<string, unknown>[] = []

  const codeSystem = buildCodeSystem(entries)
  bundleEntries.push({
    fullUrl: CODESYSTEM_URL,
    resource: codeSystem,
    request: { method: 'PUT', url: `CodeSystem?url=${CODESYSTEM_URL}` },
  })

  for (const entry of entries) {
    const cid = buildChargeItemDefinition(entry)
    const fullUrl = `${CHARGEITEM_URL_PREFIX}/${entry.nummer}`
    bundleEntries.push({
      fullUrl,
      resource: cid,
      request: { method: 'PUT', url: `ChargeItemDefinition?url=${encodeURIComponent(fullUrl)}` },
    })
  }

  return { resourceType: 'Bundle', type: 'transaction', entry: bundleEntries }
}

// --- Main ---

const parseScript = join(SCRIPT_DIR, 'parse.ts')
const proc = Bun.spawnSync(['bun', 'run', parseScript], { cwd: PROJECT_ROOT })
if (proc.exitCode !== 0) {
  console.error(`parse.ts failed:\n${proc.stderr.toString()}`)
  process.exit(1)
}
const entries: GozEntry[] = JSON.parse(proc.stdout.toString())

console.error(`Converting ${entries.length} GOZ entries to FHIR Bundle...`)

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
