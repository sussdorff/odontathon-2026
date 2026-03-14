import { z } from 'zod/v4'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import { aidboxConfig } from '../../lib/config'

async function fhirGet(path: string) {
  const res = await fetch(`${aidboxConfig.fhirBaseUrl}/${path}`, {
    headers: { Authorization: aidboxConfig.authHeader },
  })
  if (!res.ok) throw new Error(`FHIR ${path}: ${res.status}`)
  return res.json()
}

export const getCaseContext = tool(
  'get_case_context',
  'Retrieve denormalized patient context: demographics, coverage (GKV/PKV), bonus %, Pflegegrad, dental findings, and billing history.',
  { patientId: z.string().describe('FHIR Patient resource ID') },
  async ({ patientId }) => {
    const [patient, coverageBundle, conditionBundle, observationBundle, claimBundle] =
      await Promise.all([
        fhirGet(`Patient/${patientId}`),
        fhirGet(`Coverage?beneficiary=Patient/${patientId}&_count=10`),
        fhirGet(`Condition?subject=Patient/${patientId}&_count=50`),
        fhirGet(`Observation?subject=Patient/${patientId}&_count=100`),
        fhirGet(`Claim?patient=Patient/${patientId}&_count=50&_sort=-created`),
      ])

    const coverages = (coverageBundle.entry ?? []).map((e: any) => e.resource)
    const coverageType = coverages.some((c: any) =>
      c.type?.coding?.some((cd: any) => cd.code === 'SEL' || cd.code === 'PPO')
    ) ? 'PKV' : 'GKV'

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

    const billingHistory = (claimBundle.entry ?? [])
      .flatMap((e: any) => (e.resource.item ?? []).map((item: any) => ({
        code: item.productOrService?.coding?.[0]?.code,
        system: item.productOrService?.coding?.[0]?.system?.includes('goz') ? 'GOZ' : 'BEMA',
        date: e.resource.created ?? e.resource.billablePeriod?.start,
        tooth: item.bodySite?.coding?.[0]?.code ? parseInt(item.bodySite.coding[0].code) : undefined,
      })))

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
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(context, null, 2) }] }
  },
)
