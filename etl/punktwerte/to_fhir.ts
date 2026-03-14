#!/usr/bin/env bun
/**
 * Punktwerte KZV Berlin to FHIR R4 Parameters Converter
 *
 * Reads punktwerte_berlin_q1_2026.json and generates a FHIR Parameters resource.
 *
 * Output: aidbox/seed/punktwerte-berlin.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const PROJECT_ROOT = join(SCRIPT_DIR, '..', '..')
const DATA_PATH = join(SCRIPT_DIR, 'data', 'punktwerte_berlin_q1_2026.json')
const OUTPUT_PATH = join(PROJECT_ROOT, 'aidbox', 'seed', 'punktwerte-berlin.json')

const PARAMETERS_URL = 'http://dental-agent.de/Parameters/punktwerte-berlin-2026-q1'

interface PunktwertData {
  region: string
  kzv: string
  gueltig_ab: string
  kassenarten: Record<string, Record<string, number>>
}

function buildParameters(data: PunktwertData) {
  const params: Array<Record<string, unknown>> = []

  // Meta parameters
  params.push({ name: 'region', valueString: data.region })
  params.push({ name: 'kzv', valueString: data.kzv })
  params.push({ name: 'gueltig_ab', valueDate: data.gueltig_ab })

  // Kassenart × Bereich parameters
  for (const [kassenart, bereiche] of Object.entries(data.kassenarten)) {
    for (const [bereich, punktwert] of Object.entries(bereiche)) {
      params.push({
        name: `punktwert-${kassenart}-${bereich}`,
        part: [
          { name: 'kassenart', valueString: kassenart },
          { name: 'bereich', valueString: bereich },
          { name: 'punktwert_eur', valueDecimal: punktwert },
        ],
      })
    }
  }

  return {
    resourceType: 'Parameters',
    id: 'punktwerte-berlin-2026-q1',
    meta: {
      profile: [PARAMETERS_URL],
    },
    parameter: params,
  }
}

function buildBundle(parametersResource: ReturnType<typeof buildParameters>) {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [{
      fullUrl: PARAMETERS_URL,
      resource: parametersResource,
      request: {
        method: 'PUT',
        url: `Parameters/punktwerte-berlin-2026-q1`,
      },
    }],
  }
}

// --- Main ---

const data: PunktwertData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

const kassenarten = Object.keys(data.kassenarten)
const bereiche = Object.keys(data.kassenarten[kassenarten[0]])
console.error(
  `Converting Punktwerte ${data.region} ${data.gueltig_ab}: ` +
  `${kassenarten.length} Kassenarten × ${bereiche.length} Bereiche = ${kassenarten.length * bereiche.length} Kombinationen`
)

const parametersResource = buildParameters(data)
const bundle = buildBundle(parametersResource)

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(bundle, null, 2) + '\n', 'utf-8')

console.error(`Written Punktwerte Parameters resource to ${OUTPUT_PATH}`)
console.log(JSON.stringify(bundle, null, 2))
