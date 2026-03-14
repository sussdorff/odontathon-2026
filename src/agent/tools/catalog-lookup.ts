import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { aidboxConfig } from '../../lib/config'
import { CODE_SYSTEMS } from '../../lib/fhir-extensions'

const GOZ_MULTIPLIER_EXT = 'http://dental-agent.de/fhir/StructureDefinition/goz-multiplier-range'

export const lookupCatalogCode = tool(
  'lookup_catalog_code',
  'Look up a GOZ or BEMA billing code in the Aidbox catalog. Returns description, Punktzahl, EUR value, and multiplier range (GOZ only).',
  {
    code: z.string().describe('Billing code (e.g. "2197", "Ä 1")'),
    system: z.enum(['GOZ', 'BEMA']).describe('Billing system'),
  },
  async ({ code, system }) => {
    const systemUrl = system === 'GOZ' ? CODE_SYSTEMS.goz : CODE_SYSTEMS.bema
    const url = `${aidboxConfig.fhirBaseUrl}/ChargeItemDefinition?code=${systemUrl}|${encodeURIComponent(code)}&_count=1`

    const res = await fetch(url, {
      headers: { Authorization: aidboxConfig.authHeader },
    })

    if (!res.ok) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ found: false, message: `FHIR-Abfrage fehlgeschlagen: ${res.status}` }),
        }],
      }
    }

    const bundle = await res.json()
    const entry = bundle.entry?.[0]?.resource

    if (!entry) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ found: false, message: `${system} ${code} nicht im Katalog gefunden.` }),
        }],
      }
    }

    // Extract from propertyGroup[0].priceComponent[0]
    const priceComp = entry.propertyGroup?.[0]?.priceComponent?.[0]
    const punktzahl = priceComp?.factor ?? null
    const euroEinfachsatz = priceComp?.amount?.value ?? null
    const priceType = priceComp?.code?.text ?? null

    // Extract GOZ multiplier range from nested extension
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

    const result = {
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
      // Computed values for GOZ
      ...(system === 'GOZ' && euroEinfachsatz && multiplierDefault ? {
        euroRegelsatz: Math.round(euroEinfachsatz * multiplierDefault * 100) / 100,
        euroHoechstsatz: multiplierMax ? Math.round(euroEinfachsatz * multiplierMax * 100) / 100 : null,
      } : {}),
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)
