import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { BowelDiaryService } from '../services/BowelDiaryService'
import type { CreateBowelMovementInput, UpdateBowelMovementInput } from '../types'

export function useBowelDiary() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch bowel movements for current month
  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ['bowelMovements', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const result = await BowelDiaryService.getBowelMovementsByDateRange(
        user.id,
        startOfMonth,
        endOfMonth
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Create or update bowel movement
  const { mutateAsync: upsertEntry, isPending: isUpserting } = useMutation({
    mutationFn: async (input: CreateBowelMovementInput) => {
      if (!user?.id) throw new Error('User not authenticated')

      const result = await BowelDiaryService.upsertBowelMovement(user.id, input)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    onSuccess: () => {
      // Invalidate bowel movements query
      queryClient.invalidateQueries({ queryKey: ['bowelMovements', user?.id] })
      // Also invalidate symptom entries as they share the same table
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
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
    },
  })

  return {
    entries,
    isLoading,
    error,
    refetch,
    upsertEntry,
    updateEntry,
    deleteEntry,
    isUpserting,
    isUpdating,
    isDeleting,
  }
}
