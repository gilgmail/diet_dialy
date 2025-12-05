import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { BowelDiaryService } from '../services/BowelDiaryService'

/**
 * Hook to get today's bowel movement summary
 * Shows: total count, last entry time, blood status, diarrhea/constipation flags
 */
export function useBowelDiarySummary(date?: Date) {
  const { user } = useAuthStore()
  const queryDate = date || new Date()

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['bowelMovementSummary', user?.id, queryDate.toISOString()],
    queryFn: async () => {
      if (!user?.id) return null

      // Get all entries for the date
      const result = await BowelDiaryService.getBowelMovementsByDate(user.id, queryDate)

      if (!result.data || result.data.length === 0) {
        return {
          totalCount: 0,
          lastTime: null,
          hasBloodToday: false,
          hasDiarrhea: false,
          hasConstipation: false,
        }
      }

      const entries = result.data

      return {
        totalCount: entries.length,
        lastTime: entries.length > 0
          ? new Date(entries[entries.length - 1].occurred_at)
          : null,
        hasBloodToday: entries.some(e => e.has_blood),
        hasDiarrhea: entries.some(e => e.stool_type === 5),
        hasConstipation: entries.some(e => e.stool_type === 1),
      }
    },
    enabled: !!user?.id,
  })

  return {
    summary: summary || {
      totalCount: 0,
      lastTime: null,
      hasBloodToday: false,
      hasDiarrhea: false,
      hasConstipation: false,
    },
    isLoading,
    error,
    refetch,
  }
}
