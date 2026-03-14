import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { PracticeRule } from '@/types'

interface PracticeRulesResponse {
  rules: PracticeRule[]
}

export function usePracticeRules() {
  return useQuery({
    queryKey: ['practice-rules'],
    queryFn: () => apiFetch<PracticeRulesResponse>('/api/practice-rules'),
    staleTime: 10 * 60 * 1000,
  })
}
