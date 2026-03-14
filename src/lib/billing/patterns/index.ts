import { zePatterns } from './ze-patterns'
import { kchPatterns } from './kch-patterns'
import { parPatterns } from './par-patterns'
import type { BillingPattern } from '../types'

export { zePatterns } from './ze-patterns'
export { kchPatterns } from './kch-patterns'
export { parPatterns } from './par-patterns'

export const allPatterns: BillingPattern[] = [
  ...zePatterns,
  ...kchPatterns,
  ...parPatterns,
]
