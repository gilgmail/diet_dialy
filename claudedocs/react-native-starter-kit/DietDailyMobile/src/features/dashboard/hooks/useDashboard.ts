import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { DashboardService } from '../services/DashboardService'

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
  } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const result = await DashboardService.getDashboardData(user.id)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return {
    // Data
    stats: dashboardData?.stats,
    weeklyTrend: dashboardData?.weeklyTrend,
    insights: dashboardData?.insights || [],
    isLoading,
    error: error?.message || null,

    // Actions
    refetch,
  }
}
