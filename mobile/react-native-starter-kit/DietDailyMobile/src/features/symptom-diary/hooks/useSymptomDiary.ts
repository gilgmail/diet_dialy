import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { supabase } from '@/shared/api/supabase/client'
import { SymptomDiaryService } from '../services/SymptomDiaryService'
import type {
  CreateSymptomEntryInput,
  UpdateSymptomEntryInput,
} from '../types'

/**
 * React Query hook for managing symptom diary entries
 * Provides CRUD operations with automatic cache invalidation
 */
export function useSymptomDiary() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Query: Fetch all symptom entries
  const {
    data: entries,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['symptomEntries', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const result = await SymptomDiaryService.getSymptomEntries(user.id)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    enabled: !!user?.id,
  })

  // Realtime subscription for symptom entries changes
  useEffect(() => {
    if (!user?.id) return

    console.log('[useSymptomDiary] Setting up realtime subscription for user:', user.id)

    const channel = supabase
      .channel('symptom_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'daily_symptom_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useSymptomDiary] Realtime event received:', payload.eventType, payload)

          // Invalidate queries to trigger refetch
          queryClient.invalidateQueries({
            queryKey: ['symptomEntries', user.id],
          })
        }
      )
      .subscribe((status) => {
        console.log('[useSymptomDiary] Subscription status:', status)
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('[useSymptomDiary] Cleaning up realtime subscription')
      channel.unsubscribe()
    }
  }, [user?.id, queryClient])

  // Mutation: Create new symptom entry
  const createEntryMutation = useMutation({
    mutationFn: async (input: CreateSymptomEntryInput) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const result = await SymptomDiaryService.createSymptomEntry(
        user.id,
        input
      )

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
    },
  })

  // Mutation: Update symptom entry
  const updateEntryMutation = useMutation({
    mutationFn: async ({
      entryId,
      input,
    }: {
      entryId: string
      input: UpdateSymptomEntryInput
    }) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const result = await SymptomDiaryService.updateSymptomEntry(
        entryId,
        user.id,
        input
      )

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
    },
  })

  // Mutation: Delete symptom entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const result = await SymptomDiaryService.deleteSymptomEntry(
        entryId,
        user.id
      )

      if (result.error) {
        throw new Error(result.error.message)
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptomEntries', user?.id] })
    },
  })

  // Helper function to get entries by date
  const getSymptomEntriesByDate = async (date: Date) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    const result = await SymptomDiaryService.getSymptomEntriesByDate(
      user.id,
      date
    )

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.data
  }

  return {
    // Data
    entries: entries || [],
    isLoading,
    error: error?.message || null,

    // Actions
    createEntry: createEntryMutation.mutateAsync,
    updateEntry: updateEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutateAsync,
    refetch,
    getSymptomEntriesByDate,

    // Mutation states
    isCreating: createEntryMutation.isPending,
    isUpdating: updateEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,

    // Mutation errors
    createError: createEntryMutation.error?.message || null,
    updateError: updateEntryMutation.error?.message || null,
    deleteError: deleteEntryMutation.error?.message || null,
  }
}
