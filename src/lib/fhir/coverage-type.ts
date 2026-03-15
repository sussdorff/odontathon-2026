/**
 * Shared coverage-type resolver.
 * Single source of truth for GKV vs PKV detection across the product.
 */

const PKV_CODES = new Set(['PKV', 'SEL', 'PPO'])

/**
 * Resolves GKV vs PKV from one or more FHIR Coverage resources.
 * Iterates all coverages and their type.coding entries.
 * Returns 'PKV' if any coding matches a known PKV code, 'GKV' otherwise.
 */
export function resolveCoverageType(coverages: any[]): 'GKV' | 'PKV' {
  for (const cov of coverages) {
    for (const coding of cov?.type?.coding ?? []) {
      if (PKV_CODES.has(coding.code)) return 'PKV'
    }
  }
  return 'GKV'
}
