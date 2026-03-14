import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { aidboxConfig } from '../../lib/config'
import { CODE_SYSTEMS, EXT_BILLING } from '../../lib/fhir-extensions'

export const lookupCatalogCode = tool(
  'lookup_catalog_code',
  'Look up a GOZ or BEMA billing code in the Aidbox catalog. Returns description, points, euro value, and multiplier range.',
  {
    code: z.string().describe('Billing code (e.g. "2197", "04")'),
    system: z.enum(['GOZ', 'BEMA']).describe('Billing system'),
  },
  async ({ code, system }) => {
    const systemUrl = system === 'GOZ' ? CODE_SYSTEMS.goz : CODE_SYSTEMS.bema
    const url = `${aidboxConfig.fhirBaseUrl}/ChargeItemDefinition?code=${systemUrl}|${code}&_count=1`

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

    function getExt(url: string) {
      return entry.extension?.find((e: any) => e.url === url)
    }

    const result = {
      found: true,
      code,
      system,
      title: entry.title ?? entry.description ?? '',
      description: entry.description ?? '',
      status: entry.status,
      points: getExt(EXT_BILLING.points)?.valueDecimal ?? null,
      euroValue: getExt(EXT_BILLING.euroValue)?.valueDecimal ?? null,
      multiplierMin: getExt(EXT_BILLING.multiplierMin)?.valueDecimal ?? null,
      multiplierDefault: getExt(EXT_BILLING.multiplierDefault)?.valueDecimal ?? null,
      multiplierMax: getExt(EXT_BILLING.multiplierMax)?.valueDecimal ?? null,
      category: getExt(EXT_BILLING.category)?.valueString ?? null,
      requirements: getExt(EXT_BILLING.requirements)?.valueString ?? null,
      exclusions: getExt(EXT_BILLING.exclusions)?.valueString ?? null,
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  },
)
