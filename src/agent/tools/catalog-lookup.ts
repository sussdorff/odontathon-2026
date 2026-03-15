import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { aidboxConfig } from '../../lib/config'

const GOZ_MULTIPLIER_EXT = 'http://dental-agent.de/fhir/StructureDefinition/goz-multiplier-range'

async function lookupSingle(code: string, system: string) {
  const urlCode = system === 'GOZ' ? code
    : code.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '_')
  const cidUrlPrefix = system === 'GOZ'
    ? 'http://fhir.de/ChargeItemDefinition/goz'
    : system === 'GOÄ'
    ? 'http://fhir.de/ChargeItemDefinition/goae'
    : 'http://fhir.de/ChargeItemDefinition/bema'
  const url = `${aidboxConfig.fhirBaseUrl}/ChargeItemDefinition?url=${encodeURIComponent(`${cidUrlPrefix}/${urlCode}`)}&_count=1`

  const res = await fetch(url, {
    headers: { Authorization: aidboxConfig.authHeader },
  })

  if (!res.ok) {
    return { found: false, code, system, message: `FHIR-Abfrage fehlgeschlagen: ${res.status}` }
  }

  const bundle = await res.json()
  const entry = bundle.entry?.[0]?.resource

  if (!entry) {
    return { found: false, code, system, message: `${system} ${code} nicht im Katalog gefunden.` }
  }

  const priceComp = entry.propertyGroup?.[0]?.priceComponent?.[0]
  const punktzahl = priceComp?.factor ?? null
  const euroEinfachsatz = priceComp?.amount?.value ?? null
  const priceType = priceComp?.code?.text ?? null

  let multiplierMin: number | null = null
  let multiplierDefault: number | null = null
  let multiplierMax: number | null = null

  if (system === 'GOZ') {
    const multExt = entry.extension?.find((e: any) => e.url === GOZ_MULTIPLIER_EXT)
    if (multExt?.extension) {
      for (const sub of multExt.extension) {
        if (sub.url === 'min') multiplierMin = sub.valueDecimal
        if (sub.url === 'default') multiplierDefault = sub.valueDecimal
        if (sub.url === 'max') multiplierMax = sub.valueDecimal
      }
    }
  }

  const description = entry.code?.coding?.[0]?.display ?? ''

  return {
    found: true,
    code,
    system,
    description,
    punktzahl,
    euroEinfachsatz,
    priceType,
    multiplierMin,
    multiplierDefault,
    multiplierMax,
    ...(system === 'GOZ' && euroEinfachsatz && multiplierDefault ? {
      euroRegelsatz: Math.round(euroEinfachsatz * multiplierDefault * 100) / 100,
      euroHoechstsatz: multiplierMax ? Math.round(euroEinfachsatz * multiplierMax * 100) / 100 : null,
    } : {}),
  }
}

export const lookupCatalogCode = tool(
  'lookup_catalog_code',
  'Look up one or more GOZ/BEMA/GOÄ billing codes in the Aidbox catalog. Pass an array of codes to batch-lookup in a single call. Returns description, Punktzahl, EUR value, and multiplier range (GOZ only) for each code.',
  {
    codes: z.array(z.object({
      code: z.string().describe('Billing code (e.g. "2197", "Ä 1", "5")'),
      system: z.enum(['GOZ', 'BEMA', 'GOÄ']).describe('Billing system'),
    })).optional().describe('Array of codes to look up (preferred for batch lookups)'),
    // Legacy single-code params
    code: z.string().optional().describe('(Legacy) Single billing code'),
    system: z.enum(['GOZ', 'BEMA', 'GOÄ']).optional().describe('(Legacy) Single billing system'),
  },
  async ({ codes, code, system }) => {
    const items = codes?.length
      ? codes
      : (code && system ? [{ code, system }] : [])

    if (items.length === 0) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No codes provided' }) }] }
    }

    const results = await Promise.all(items.map((item) => lookupSingle(item.code, item.system)))

    return { content: [{ type: 'text' as const, text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] }
  },
)
