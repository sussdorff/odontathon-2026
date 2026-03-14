#!/usr/bin/env bun
/**
 * Befund-/Therapiekürzel to FHIR R4 Bundle Converter
 *
 * Reads curated Kürzel catalog and generates FHIR R4 Bundle:
 * - 1x CodeSystem with all HKP ZE Befund- and Therapiekürzel
 *
 * Source: KZBV EBZ Anlage 2 — Befund- und Therapiekürzel HKP ZE (2022-05-25)
 * Output: aidbox/seed/kuerzel-catalog.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = join(SCRIPT_DIR, '..', '..')
const DATA_PATH = join(SCRIPT_DIR, 'data', 'kuerzel_catalog.json')
const OUTPUT_PATH = join(PROJECT_ROOT, 'aidbox', 'seed', 'kuerzel-catalog.json')

const CODESYSTEM_URL = 'http://fhir.de/CodeSystem/kzbv-hkp-kuerzel'

interface KuerzelEntry {
  code: string
  zeile: string
  beschreibung: string
  kontext: string
}

function buildCodeSystem(entries: KuerzelEntry[]) {
  // Create compound codes: code + '|' + zeile to handle duplicate codes in different rows
  const concepts = entries.map((entry) => ({
    code: `${entry.code}|${entry.zeile}`,
    display: entry.beschreibung,
    property: [
      { code: 'kuerzel', valueString: entry.code },
      { code: 'zeile', valueString: entry.zeile },
      { code: 'kontext', valueString: entry.kontext },
    ],
  }))

  return {
    resourceType: 'CodeSystem',
    url: CODESYSTEM_URL,
    version: '2022-05-25',
    name: 'KZBVHKPKuerzel',
    title: 'KZBV HKP ZE Befund- und Therapiekürzel',
    status: 'active',
    content: 'complete',
    count: concepts.length,
    property: [
      { code: 'kuerzel', description: 'Originalkürzel', type: 'string' },
      { code: 'zeile', description: 'HKP-Zeile: B=Befund, R=Regelversorgung, TP=Therapieplanung', type: 'string' },
      { code: 'kontext', description: 'Kontext: Befund, Regelversorgung, Therapieplanung', type: 'string' },
    ],
    concept: concepts,
  }
}

function buildBundle(codeSystem: ReturnType<typeof buildCodeSystem>) {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [{
      fullUrl: CODESYSTEM_URL,
      resource: codeSystem,
      request: { method: 'PUT', url: `CodeSystem?url=${CODESYSTEM_URL}` },
    }],
  }
}

// --- Main ---

const entries: KuerzelEntry[] = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

console.error(`Converting ${entries.length} Kürzel entries to FHIR Bundle...`)

const codeSystem = buildCodeSystem(entries)
const bundle = buildBundle(codeSystem)

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(bundle, null, 2) + '\n', 'utf-8')

console.error(`Written 1 CodeSystem (${entries.length} concepts) to ${OUTPUT_PATH}`)
console.log(JSON.stringify(bundle, null, 2))
