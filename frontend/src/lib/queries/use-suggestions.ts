import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { BillingSuggestion } from '@/types'

interface SuggestionsResponse {
  patientId: string
  findingsCount: number
  patterns: number
  suggestions: BillingSuggestion[]
}

export function useSuggestions(patientId: string | null) {
  return useQuery({
    queryKey: ['suggestions', patientId],
    queryFn: () => apiFetch<SuggestionsResponse>(`/api/patients/${patientId}/suggestions`),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
  })
}
