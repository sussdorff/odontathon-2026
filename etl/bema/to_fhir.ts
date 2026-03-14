#!/usr/bin/env bun
/**
 * BEMA to FHIR R4 Bundle Converter
 *
 * Reads parsed BEMA data (from parse.ts) and generates a FHIR R4 Bundle:
 * - 1x CodeSystem with all BEMA codes
 * - Nx ChargeItemDefinition (one per BEMA entry)
 *
 * Output: aidbox/seed/bema-catalog.json
 *
 * Note: BEMA has no multiplier (unlike GOZ) — fixed Punktzahl per position.
 * Punktwert is regional (set by KZV) — not encoded in the catalog itself.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = join(SCRIPT_DIR, '..', '..')
const OUTPUT_PATH = join(PROJECT_ROOT, 'aidbox', 'seed', 'bema-catalog.json')

const CODESYSTEM_URL = 'http://fhir.de/CodeSystem/bema'
const CHARGEITEM_URL_PREFIX = 'http://fhir.de/ChargeItemDefinition/bema'

interface BemaEntry {
  code: string
  kuerzel: string
  beschreibung: string
  punktzahl: number
  bereich: string
  festbetrag_eur?: number
}

function sanitizeCode(code: string): string {
  return code.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '_')
}

function buildCodeSystem(entries: BemaEntry[]) {
  const concepts = entries.map((entry) => {
    const concept: Record<string, unknown> = {
      code: entry.code,
      display: entry.beschreibung,
      property: [
        { code: 'bereich', valueString: entry.bereich },
      ],
    }
    if (entry.kuerzel) {
      (concept.property as unknown[]).push({ code: 'kuerzel', valueString: entry.kuerzel })
    }
    return concept
  })

  return {
    resourceType: 'CodeSystem',
    url: CODESYSTEM_URL,
    version: '2026-01-01',
    name: 'BEMA',
    title: 'Bewertungsmaßstab zahnärztlicher Leistungen (BEMA)',
    status: 'active',
    content: 'complete',
    count: concepts.length,
    property: [
      { code: 'bereich', description: 'Behandlungsbereich (KCH, KB, PAR, KFO, ZE)', type: 'string' },
      { code: 'kuerzel', description: 'Abrechnungskürzel', type: 'string' },
    ],
    concept: concepts,
  }
}

function buildChargeItemDefinition(entry: BemaEntry) {
  const urlCode = sanitizeCode(entry.code)
  return {
    resourceType: 'ChargeItemDefinition',
    url: `${CHARGEITEM_URL_PREFIX}/${urlCode}`,
    status: 'active',
    code: {
      coding: [{ system: CODESYSTEM_URL, code: entry.code, display: entry.beschreibung }],
    },
    propertyGroup: [{
      priceComponent: entry.festbetrag_eur != null
        ? [{
            type: 'base',
            code: { text: 'Festbetrag' },
            amount: { value: entry.festbetrag_eur, currency: 'EUR' },
          }]
        : [{
            type: 'base',
            code: { text: 'Punktzahl' },
            factor: entry.punktzahl,
            // No fixed EUR amount — depends on regional Punktwert
          }],
    }],
  }
}

function buildBundle(entries: BemaEntry[]) {
  const bundleEntries: Record<string, unknown>[] = []

  const codeSystem = buildCodeSystem(entries)
  bundleEntries.push({
    fullUrl: CODESYSTEM_URL,
    resource: codeSystem,
    request: { method: 'PUT', url: `CodeSystem?url=${CODESYSTEM_URL}` },
  })

  for (const entry of entries) {
    const cid = buildChargeItemDefinition(entry)
    const urlCode = sanitizeCode(entry.code)
    const fullUrl = `${CHARGEITEM_URL_PREFIX}/${urlCode}`
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
const entries: BemaEntry[] = JSON.parse(proc.stdout.toString())

console.error(`Converting ${entries.length} BEMA entries to FHIR Bundle...`)

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
