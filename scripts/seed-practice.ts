/**
 * Seed practice master data into Aidbox.
 * Loads Organizations, Practitioners, PractitionerRoles, Location, Patients, Coverages, and Zahnbefunde
 * as a single idempotent transaction bundle.
 *
 * Usage: bun run seed:practice
 */
import { aidboxConfig } from '../src/lib/config'
import { buildPracticeBundle } from '../src/seed/index'

async function seedPractice() {
  console.log('Building practice bundle...')
  const bundle = buildPracticeBundle()

  const entries = (bundle.entry as unknown[]) ?? []
  console.log(`  Bundle contains ${entries.length} entries`)

  // Count by resource type
  const counts: Record<string, number> = {}
  for (const entry of entries) {
    const e = entry as { resource: { resourceType: string } }
    const rt = e.resource.resourceType
    counts[rt] = (counts[rt] ?? 0) + 1
  }
  for (const [rt, count] of Object.entries(counts).sort()) {
    console.log(`    ${rt}: ${count}`)
  }

  console.log(`\nPosting to ${aidboxConfig.fhirBaseUrl}...`)

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
    console.error(`Failed: ${res.status} ${res.statusText}`)
    console.error(error)
    process.exit(1)
  }

  const result = (await res.json()) as { entry?: unknown[] }
  const loaded = result.entry?.length ?? 0
  console.log(`\n✓ ${loaded} resources loaded into Aidbox`)
  console.log('Done.')
}

seedPractice().catch(console.error)
