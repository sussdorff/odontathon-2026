/**
 * Aidbox FHIR server configuration.
 * Single source of truth — import from here, don't read env vars directly.
 */
const FHIR_BASE = (process.env.AIDBOX_FHIR_URL ?? '').replace(/\/$/, '')
const AIDBOX_USER = process.env.AIDBOX_USER ?? process.env.AIDBOX_ADMIN_ID ?? ''
const AIDBOX_PASSWORD = process.env.AIDBOX_PASSWORD ?? process.env.AIDBOX_ADMIN_PASSWORD ?? ''
const AIDBOX_BASE = (process.env.AIDBOX_URL ?? FHIR_BASE.replace(/\/fhir$/, '')).replace(/\/$/, '')

export const aidboxConfig = {
  fhirBaseUrl: FHIR_BASE,
  aidboxBaseUrl: AIDBOX_BASE,
  user: AIDBOX_USER,
  password: AIDBOX_PASSWORD,
  authHeader: `Basic ${Buffer.from(`${AIDBOX_USER}:${AIDBOX_PASSWORD}`).toString('base64')}`,
  fhirVersion: '4.0.1' as const,
}
