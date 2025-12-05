import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { DashboardService } from '../services/DashboardService'
import type { DataCoverageInfo, MissingDataAlert } from '../types'

/**
 * Hook for fetching data coverage information
 * Phase A: Data Coverage Dashboard
 */
export function useDataCoverage() {
  const { user } = useAuthStore()

  const coverageQuery = useQuery<DataCoverageInfo | null>({
    queryKey: ['dataCoverage', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const result = await DashboardService.getDataCoverage(user.id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 分鐘
    gcTime: 1000 * 60 * 15, // 快取 15 分鐘
  })

  return {
    coverage: coverageQuery.data,
    isLoading: coverageQuery.isLoading,
    error: coverageQuery.error,
    refetch: coverageQuery.refetch,
  }
}

/**
 * Hook for fetching missing data alerts
 * Phase A: Missing Data Alerts
 */
export function useMissingDataAlerts(daysThreshold: number = 2) {
  const { user } = useAuthStore()

  const alertsQuery = useQuery<MissingDataAlert[]>({
    queryKey: ['missingDataAlerts', user?.id, daysThreshold],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await DashboardService.getMissingDataAlerts(user.id, daysThreshold)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data || []
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 分鐘
    gcTime: 1000 * 60 * 15, // 快取 15 分鐘
  })

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    refetch: alertsQuery.refetch,
  }
}

