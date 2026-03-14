import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface CatalogEntry {
  code: string
  system: 'GOZ' | 'BEMA'
  title: string
  punktzahl?: number
}

interface CatalogSearchResponse {
  results: CatalogEntry[]
}

export function useCatalogSearch(query: string, system?: 'GOZ' | 'BEMA') {
  return useQuery({
    queryKey: ['catalog-search', query, system],
    queryFn: () => {
      const params = new URLSearchParams({ q: query })
      if (system) params.set('system', system)
      return apiFetch<CatalogSearchResponse>(`/api/catalog/search?${params}`)
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  })
}
