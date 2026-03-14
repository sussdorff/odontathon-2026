/**
 * Seed practice master data into Aidbox.
 * Loads Organizations, Practitioners, PractitionerRoles, Location, Patients, Coverages, and Zahnbefunde
 * as a single idempotent transaction bundle.
 *
 * Usage: bun run seed:practice
 */
import { aidboxConfig } from '../src/lib/config'
import { buildPracticeBundle } from '../src/seed/index'

const PATIENT_IDS = [
  'patient-mueller-anna', 'patient-schmidt-klaus', 'patient-wagner-petra',
  'patient-becker-hans', 'patient-fischer-monika', 'patient-yilmaz-mehmet',
  'patient-braun-sophie', 'patient-schulz-wolfgang', 'patient-al-hassan-fatima',
  'patient-hoffmann-rainer', 'patient-klein-gerda', 'patient-richter-erika',
  'patient-berg-lukas', 'patient-vogel-hildegard', 'patient-weber-stefan',
]

/**
 * Delete all Observations per patient before re-seeding.
 * Fetches all IDs first (Aidbox rejects bulk conditional delete with 412),
 * then deletes individually to clear stale entries from previous runs.
 */
async function cleanObservations() {
  const ids: string[] = []
  for (const pid of PATIENT_IDS) {
    const url = `${aidboxConfig.fhirBaseUrl}/Observation?subject=Patient/${pid}&_count=500&_elements=id`
    const res = await fetch(url, { headers: { Authorization: aidboxConfig.authHeader } })
    if (!res.ok) continue
    const bundle = await res.json() as { entry?: { resource: { id: string } }[] }
    for (const e of bundle.entry ?? []) ids.push(e.resource.id)
  }
  if (ids.length === 0) return
  console.log(`  Clearing ${ids.length} stale Observations...`)
  await Promise.all(ids.map(id =>
    fetch(`${aidboxConfig.fhirBaseUrl}/Observation/${id}`, {
      method: 'DELETE',
      headers: { Authorization: aidboxConfig.authHeader },
    })
  ))
  console.log(`  ✓ ${ids.length} Observations cleared`)
}

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

  await cleanObservations()
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
