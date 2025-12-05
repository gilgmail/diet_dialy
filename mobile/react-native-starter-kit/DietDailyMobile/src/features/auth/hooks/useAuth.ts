import { useState, useCallback } from 'react'
import { useAuthStore } from '@/shared/stores/authStore'
import { AuthService } from '../services/AuthService'
import type { AuthError } from '../services/AuthService'

export function useAuth() {
  const { user, isLoading, setLoading } = useAuthStore()
  const [error, setError] = useState<AuthError | null>(null)

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await AuthService.signInWithGoogle()

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, error: null }
    } catch (err) {
      const error = {
        message: err instanceof Error ? err.message : 'Authentication failed',
      }
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await AuthService.signOut()

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, error: null }
    } catch (err) {
      const error = {
        message: err instanceof Error ? err.message : 'Sign out failed',
      }
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await AuthService.refreshSession()

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, error: null }
    } catch (err) {
      const error = {
        message: err instanceof Error ? err.message : 'Session refresh failed',
      }
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    user,
    isLoading,
    error,
    isAuthenticated: !!user,

    // Actions
    signInWithGoogle,
    signOut,
    refreshSession,
    clearError,
  }
}
