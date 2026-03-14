/**
 * Seed dental billing catalogs into Aidbox.
 * Reads all .json files from aidbox/seed/ and POSTs them as FHIR Bundles.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { aidboxConfig } from '../src/lib/config'

const SEED_DIR = join(import.meta.dir, '..', 'aidbox', 'seed')

async function seedCatalogs() {
  const files = (await readdir(SEED_DIR)).filter((f) => f.endsWith('.json')).sort()

  if (files.length === 0) {
    console.log('No seed files found in', SEED_DIR)
    console.log('Run etl:goz and etl:bema first to generate catalog bundles.')
    return
  }

  for (const file of files) {
    const path = join(SEED_DIR, file)
    console.log(`Seeding ${file}...`)

    const content = await readFile(path, 'utf-8')
    const bundle = JSON.parse(content)

    const res = await fetch(aidboxConfig.fhirBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Authorization: aidboxConfig.authHeader,
      },
      body: JSON.stringify(bundle),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error(`Failed to seed ${file}: ${res.status} ${error}`)
      continue
    }

    const result = await res.json()
    const entries = result.entry?.length ?? 0
    console.log(`  ✓ ${file}: ${entries} resources loaded`)
  }

  console.log('Done.')
}

seedCatalogs().catch(console.error)
