import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { BowelDiaryService } from '../services/BowelDiaryService'
import type { CreateBowelMovementInput, UpdateBowelMovementInput } from '../types'

export function useBowelDiary(date?: Date) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch bowel movements for specific date or current month
  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bowelMovements', user?.id, date?.toISOString()],
    queryFn: async () => {
      if (!user?.id) return []

      if (date) {
        // Fetch for specific date
        const result = await BowelDiaryService.getBowelMovementsByDate(user.id, date)
        return result.data || []
      } else {
        // Fetch for current month
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const result = await BowelDiaryService.getBowelMovementsByDateRange(
          user.id,
          startOfMonth,
          endOfMonth
        )
        return result.data || []
      }
    },
    enabled: !!user?.id,
  })

  // Create bowel movement
  const { mutateAsync: createEntry, isPending: isCreating } = useMutation({
    mutationFn: async (input: CreateBowelMovementInput) => {
      if (!user?.id) throw new Error('User not authenticated')

      const result = await BowelDiaryService.createBowelMovement(user.id, input)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['bowelMovements', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['foodEntries', user?.id] })
    },
  })

  // Update existing bowel movement
  const { mutateAsync: updateEntry, isPending: isUpdating } = useMutation({
    mutationFn: async ({ entryId, input }: { entryId: string; input: UpdateBowelMovementInput }) => {
      const result = await BowelDiaryService.updateBowelMovement(entryId, input)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bowelMovements', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['foodEntries', user?.id] })
    },
  })

  // Delete bowel movement
  const { mutateAsync: deleteEntry, isPending: isDeleting } = useMutation({
    mutationFn: async (entryId: string) => {
      const result = await BowelDiaryService.deleteBowelMovement(entryId)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bowelMovements', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['foodEntries', user?.id] })
    },
  })

  return {
    entries,
    isLoading,
    error,
    refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    isCreating,
    isUpdating,
    isDeleting,
  }
}
