import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { DashboardService } from '../services/DashboardService'
import type { DashboardData } from '../types'

/**
 * React Query hook for fetching dashboard data
 * Provides aggregated statistics, trends, and insights
 */
export function useDashboard() {
  const { user } = useAuthStore()

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardData | null>({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      console.log('[useDashboard] Fetching dashboard data for user:', user?.id)

      if (!user?.id) {
        console.error('[useDashboard] User not authenticated')
        throw new Error('User not authenticated')
      }

      const result = await DashboardService.getDashboardData(user.id)

      console.log('[useDashboard] Dashboard data result:', {
        hasData: !!result.data,
        hasError: !!result.error,
        stats: result.data?.stats
      })

      if (result.error) {
        console.error('[useDashboard] Error:', result.error.message)
        throw new Error(result.error.message)
      }

      return result.data
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 延長到 10 分鐘，減少不必要的重新載入
    gcTime: 1000 * 60 * 30, // 快取 30 分鐘
    refetchOnMount: false, // 避免每次進入都重新載入
    refetchOnWindowFocus: false, // 避免切換 app 時重新載入
  })

  return {
    // Data
    stats: dashboardData?.stats,
    weeklyTrend: dashboardData?.weeklyTrend,
    insights: dashboardData?.insights || [],
    analysisHistory: dashboardData?.analysisHistory || [],
    analysisHistoryTotal:
      dashboardData?.analysisHistoryTotal ??
      (dashboardData?.analysisHistory ? dashboardData.analysisHistory.length : 0),
    analysisStatus: dashboardData?.analysisStatus || null,
    isLoading,
    error: error?.message || null,

    // Actions
    refetch,
  }
}
