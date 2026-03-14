#!/usr/bin/env bun
/**
 * BEMA Catalog Parser
 *
 * Reads the curated BEMA catalog JSON and outputs to stdout.
 * Source: etl/bema/data/bema_catalog.json (curated from KZBV BEMA Kurzfassung 2026-01-01)
 *
 * Output: JSON array to stdout
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const DATA_PATH = join(SCRIPT_DIR, 'data', 'bema_catalog.json')

const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

console.error(`Loaded ${data.length} BEMA entries from ${DATA_PATH}`)
console.log(JSON.stringify(data, null, 2))
