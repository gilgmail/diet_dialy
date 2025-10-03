import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '../services/FoodDiaryService'
import type { CreateFoodEntryInput, UpdateFoodEntryInput } from '../types'

const QUERY_KEYS = {
  foodEntries: (userId: string) => ['foodEntries', userId],
  foodEntriesByDate: (userId: string, date: Date) => [
    'foodEntries',
    userId,
    date.toISOString().split('T')[0],
  ],
}

export function useFoodDiary() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Get all food entries
  const {
    data: entries,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.foodEntries(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await FoodDiaryService.getFoodEntries(user.id)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!user?.id,
  })

  // Get food entries by date
  const getFoodEntriesByDate = (date: Date) => {
    return useQuery({
      queryKey: QUERY_KEYS.foodEntriesByDate(user?.id || '', date),
      queryFn: async () => {
        if (!user?.id) throw new Error('User not authenticated')
        const result = await FoodDiaryService.getFoodEntriesByDate(user.id, date)
        if (result.error) throw new Error(result.error.message)
        return result.data
      },
      enabled: !!user?.id,
    })
  }

  // Create food entry
  const createEntry = useMutation({
    mutationFn: async (input: CreateFoodEntryInput) => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await FoodDiaryService.createFoodEntry(user.id, input)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.foodEntries(user?.id || ''),
      })
    },
  })

  // Update food entry
  const updateEntry = useMutation({
    mutationFn: async ({
      entryId,
      input,
    }: {
      entryId: string
      input: UpdateFoodEntryInput
    }) => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await FoodDiaryService.updateFoodEntry(entryId, user.id, input)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.foodEntries(user?.id || ''),
      })
    },
  })

  // Delete food entry
  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      if (!user?.id) throw new Error('User not authenticated')
      const result = await FoodDiaryService.deleteFoodEntry(entryId, user.id)
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.foodEntries(user?.id || ''),
      })
    },
  })

  return {
    // Data
    entries: entries || [],
    isLoading,
    error,

    // Actions
    createEntry: createEntry.mutateAsync,
    updateEntry: updateEntry.mutateAsync,
    deleteEntry: deleteEntry.mutateAsync,
    refetch,
    getFoodEntriesByDate,

    // Mutation states
    isCreating: createEntry.isPending,
    isUpdating: updateEntry.isPending,
    isDeleting: deleteEntry.isPending,
    createError: createEntry.error,
    updateError: updateEntry.error,
    deleteError: deleteEntry.error,
  }
}
