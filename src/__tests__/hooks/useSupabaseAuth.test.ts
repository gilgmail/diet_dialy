import { renderHook, act, waitFor } from '@testing-library/react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

// Mock the auth service
jest.mock('@/lib/supabase/auth', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    getUserProfile: jest.fn(),
    upsertUserProfile: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    updateUserProfile: jest.fn(),
  },
}))

// Get the mocked auth service for use in tests
import { authService } from '@/lib/supabase/auth'
const mockAuthService = authService as jest.Mocked<typeof authService>

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    sub: 'google-sub-id',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  }
}

const mockUserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  google_id: 'google-sub-id',
  avatar_url: 'https://example.com/avatar.jpg',
  is_admin: false,
  medical_conditions: ['IBD'],
  allergies: ['milk'],
  dietary_restrictions: ['vegetarian'],
  medications: []
}

describe('useSupabaseAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock setup
    mockAuthService.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    })
  })

  describe('Initialization', () => {
    it('initializes with loading state', () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.userProfile).toBe(null)
    })

    it('loads authenticated user on initialization', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.userProfile).toEqual(mockUserProfile)
    })

    it('handles no user on initialization', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBe(null)
      expect(result.current.userProfile).toBe(null)
    })
  })

  describe('Authentication State Changes', () => {
    it('handles SIGNED_IN event', async () => {
      let authCallback: (event: string, session: any) => void

      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: { unsubscribe: jest.fn() }
          }
        }
      })

      mockAuthService.getCurrentUser.mockResolvedValue(null)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      // Simulate SIGNED_IN event
      act(() => {
        authCallback('SIGNED_IN', { user: mockUser })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.userProfile).toEqual(mockUserProfile)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles SIGNED_OUT event', async () => {
      let authCallback: (event: string, session: any) => void

      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: { unsubscribe: jest.fn() }
          }
        }
      })

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Simulate SIGNED_OUT event
      act(() => {
        authCallback('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })

      expect(result.current.user).toBe(null)
      expect(result.current.userProfile).toBe(null)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles TOKEN_REFRESHED event', async () => {
      let authCallback: (event: string, session: any) => void

      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: { unsubscribe: jest.fn() }
          }
        }
      })

      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      // Simulate TOKEN_REFRESHED event
      act(() => {
        authCallback('TOKEN_REFRESHED', { user: mockUser })
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Profile Management', () => {
    it('creates profile if none exists', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(null)
      mockAuthService.upsertUserProfile.mockResolvedValue(mockUserProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.userProfile).toEqual(mockUserProfile)
      })

      expect(mockAuthService.upsertUserProfile).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        google_id: mockUser.user_metadata.sub,
        name: mockUser.user_metadata.full_name,
        avatar_url: mockUser.user_metadata.avatar_url
      })
    })

    it('updates profile successfully', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)
      mockAuthService.updateUserProfile.mockResolvedValue({
        ...mockUserProfile,
        medical_conditions: ['IBD', 'IBS']
      })

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      const updates = { medical_conditions: ['IBD', 'IBS'] }

      await act(async () => {
        await result.current.updateProfile(updates)
      })

      expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith(
        mockUser.id,
        updates
      )
      expect(result.current.userProfile?.medical_conditions).toEqual(['IBD', 'IBS'])
    })

    it('throws error when updating profile without authentication', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })

      await expect(
        result.current.updateProfile({ medical_conditions: ['IBD'] })
      ).rejects.toThrow('User not authenticated')
    })

    it('refreshes profile successfully', async () => {
      const updatedProfile = { ...mockUserProfile, name: 'Updated Name' }

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile
        .mockResolvedValueOnce(mockUserProfile)
        .mockResolvedValueOnce(updatedProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.userProfile?.name).toBe('Test User')
      })

      await act(async () => {
        await result.current.refreshProfile()
      })

      expect(result.current.userProfile?.name).toBe('Updated Name')
    })
  })

  describe('Authentication Actions', () => {
    it('calls Google sign-in', async () => {
      mockAuthService.signInWithGoogle.mockResolvedValue({})
      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(mockAuthService.signInWithGoogle).toHaveBeenCalledTimes(1)
    })

    it('handles Google sign-in error', async () => {
      const error = new Error('Sign-in failed')
      mockAuthService.signInWithGoogle.mockRejectedValue(error)
      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      await expect(result.current.signInWithGoogle()).rejects.toThrow('Sign-in failed')
    })

    it('signs out successfully', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)
      mockAuthService.signOut.mockResolvedValue({})

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1)
      expect(result.current.user).toBe(null)
      expect(result.current.userProfile).toBe(null)
    })

    it('handles sign-out error', async () => {
      const error = new Error('Sign-out failed')
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)
      mockAuthService.signOut.mockRejectedValue(error)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await expect(result.current.signOut()).rejects.toThrow('Sign-out failed')
    })
  })

  describe('Admin Status', () => {
    it('correctly identifies admin users', async () => {
      const adminProfile = { ...mockUserProfile, is_admin: true }

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(adminProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true)
      })
    })

    it('correctly identifies non-admin users', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false)
      })
    })

    it('handles missing user profile for admin check', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockResolvedValue(null)

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('handles initialization errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Initialization failed'))

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(consoleError).toHaveBeenCalledWith('Initialize auth error:', expect.any(Error))

      consoleError.mockRestore()
    })

    it('handles profile loading errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.getUserProfile.mockRejectedValue(new Error('Profile load failed'))

      const { result } = renderHook(() => useSupabaseAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.userProfile).toBe(null)
      expect(consoleError).toHaveBeenCalledWith('Load user profile error:', expect.any(Error))

      consoleError.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('unsubscribes from auth state changes on unmount', () => {
      const unsubscribe = jest.fn()
      mockAuthService.onAuthStateChange.mockReturnValue({
        data: {
          subscription: { unsubscribe }
        }
      })

      mockAuthService.getCurrentUser.mockResolvedValue(null)

      const { unmount } = renderHook(() => useSupabaseAuth())

      unmount()

      expect(unsubscribe).toHaveBeenCalledTimes(1)
    })
  })
})