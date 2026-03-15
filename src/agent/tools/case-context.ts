import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { aidboxConfig } from '../../lib/config'
import { resolveCoverageType } from '../../lib/fhir/coverage-type'

async function fhirGet(path: string) {
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/${path}`, {
    headers: { Authorization: aidboxConfig.authHeader },
  })
  if (!res.ok) throw new Error(`FHIR ${path}: ${res.status}`)
  return res.json()
}

export const getCaseContext = tool(
  'get_case_context',
  'Retrieve denormalized patient context: demographics, coverage (GKV/PKV), bonus %, Pflegegrad, dental findings, and billing history. Optionally filter billing history to only include entries before a given date.',
  {
    patientId: z.string().describe('FHIR Patient resource ID'),
    beforeDate: z.string().optional().describe('If provided, only include billing history entries before this ISO date (YYYY-MM-DD). Used for date-specific analysis.'),
  },
  async ({ patientId, beforeDate }) => {
    const [patient, coverageBundle, conditionBundle, observationBundle, claimBundle] =
      await Promise.all([
        fhirGet(`Patient/${patientId}`),
        fhirGet(`Coverage?beneficiary=Patient/${patientId}&_count=10`),
        fhirGet(`Condition?subject=Patient/${patientId}&_count=50`),
        fhirGet(`Observation?subject=Patient/${patientId}&_count=100`),
        fhirGet(`Claim?patient=Patient/${patientId}&_count=50&_sort=-created`),
      ])

    const coverages = (coverageBundle.entry ?? []).map((e: any) => e.resource)
    const coverageType = resolveCoverageType(coverages)

    const bonusExt = patient.extension?.find((e: any) =>
      e.url?.includes('ze-bonus-prozent')
    )
    const bonusPercent = bonusExt?.valueInteger ?? 0

    const pflegegradExt = patient.extension?.find((e: any) =>
      e.url?.includes('pflegegrad-status')
    )
    const pflegegrad = pflegegradExt?.extension?.find((e: any) =>
      e.url?.includes('pflegegrad-level')
    )?.valueInteger ?? null

    const findings = (observationBundle.entry ?? [])
      .map((e: any) => e.resource)
      .filter((o: any) => o.valueCodeableConcept?.coding?.some((c: any) =>
        c.system?.includes('tooth-status')
      ))
      .map((o: any) => ({
        tooth: parseInt(o.bodySite?.coding?.find((c: any) =>
          c.system?.includes('fdi-tooth-number')
        )?.code ?? '0'),
        status: o.valueCodeableConcept?.coding?.find((c: any) =>
          c.system?.includes('tooth-status')
        )?.code ?? 'unknown',
        surfaces: o.extension?.find((ex: any) =>
          ex.url?.includes('tooth-surfaces')
        )?.valueString?.split(',') ?? [],
      }))

    const conditions = (conditionBundle.entry ?? []).map((e: any) => ({
      code: e.resource.code?.coding?.[0]?.code,
      display: e.resource.code?.coding?.[0]?.display ?? e.resource.code?.text,
    }))

    const allHistory = (claimBundle.entry ?? [])
      .flatMap((e: any) => (e.resource.item ?? []).map((item: any) => ({
        code: item.productOrService?.coding?.[0]?.code,
        system: (() => { const s = item.productOrService?.coding?.[0]?.system ?? ''; return s.includes('goz') ? 'GOZ' : s.includes('goae') ? 'GOÄ' : 'BEMA' })(),
        date: e.resource.created ?? e.resource.billablePeriod?.start,
        tooth: item.bodySite?.coding?.[0]?.code ? parseInt(item.bodySite.coding[0].code) : undefined,
      })))

    // Filter by beforeDate if provided (only prior history for frequency checks)
    const billingHistory = beforeDate
      ? allHistory.filter((h: any) => h.date && h.date < beforeDate)
      : allHistory

    // Fetch Encounters and Procedures for clinical documentation context
    const [encounterBundle, procedureBundle] = await Promise.all([
      fhirGet(`Encounter?subject=Patient/${patientId}&_count=50&_sort=-date`),
      fhirGet(`Procedure?subject=Patient/${patientId}&_count=50&_sort=-date`),
    ])

    const encounters = (encounterBundle.entry ?? []).map((e: any) => {
      const enc = e.resource
      const encDate = enc.period?.start ?? enc.meta?.lastUpdated
      if (beforeDate && encDate && encDate > beforeDate) return null
      return {
        id: enc.id,
        date: encDate,
        status: enc.status,
        reason: enc.reasonCode?.[0]?.text ?? enc.reasonCode?.[0]?.coding?.[0]?.display ?? null,
        tooth: enc.extension?.find((ex: any) => ex.url?.includes('fdi-tooth-number'))?.valueInteger ?? null,
      }
    }).filter(Boolean)

    const procedures = (procedureBundle.entry ?? []).map((e: any) => {
      const proc = e.resource
      const procDate = proc.performedDateTime ?? proc.performedPeriod?.start
      if (beforeDate && procDate && procDate > beforeDate) return null
      return {
        id: proc.id,
        date: procDate,
        status: proc.status,
        code: proc.code?.coding?.[0]?.code ?? null,
        display: proc.code?.coding?.[0]?.display ?? proc.code?.text ?? null,
        tooth: proc.bodySite?.find((bs: any) =>
          bs.coding?.some((c: any) => c.system?.includes('fdi-tooth-number'))
        )?.coding?.[0]?.code ?? null,
        notes: proc.note?.map((n: any) => n.text).filter(Boolean) ?? [],
      }
    }).filter(Boolean)

    const context = {
      patient: {
        id: patientId,
        name: [patient.name?.[0]?.given?.join(' '), patient.name?.[0]?.family].filter(Boolean).join(' '),
        birthDate: patient.birthDate,
        gender: patient.gender,
      },
      coverageType,
      bonusPercent,
      pflegegrad,
      findings,
      conditions,
      billingHistory,
      encounters,
      procedures,
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(context, null, 2) }] }
  },
)
