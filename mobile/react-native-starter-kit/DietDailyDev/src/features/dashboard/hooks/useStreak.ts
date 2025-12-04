import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { DashboardService } from '../services/DashboardService'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  milestones: number[]
}

/**
 * Hook for fetching user streak data
 * Phase A: Gamification - Streak tracking
 */
export function useStreak() {
  const { user } = useAuthStore()

  const streakQuery = useQuery<StreakData | null>({
    queryKey: ['streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const result = await DashboardService.getStreak(user.id)
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
    streak: streakQuery.data,
    isLoading: streakQuery.isLoading,
    error: streakQuery.error,
    refetch: streakQuery.refetch,
  }
}

