import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Patient } from '@/types'

interface PatientsResponse {
  total: number
  patients: Patient[]
}

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => apiFetch<PatientsResponse>('/api/patients'),
    staleTime: 5 * 60 * 1000,
  })
}
