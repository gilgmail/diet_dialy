import { supabase } from '@/shared/api/supabase/client'
import { useAuthStore } from '@/shared/stores/authStore'
import type { User } from '@supabase/supabase-js'

export interface AuthError {
  message: string
  code?: string
}

export interface AuthResult {
  user: User | null
  error: AuthError | null
}

export class AuthService {
  /**
   * Sign in with Google OAuth
   * Opens browser for Google authentication
   */
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'dietdaily://auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        return {
          user: null,
          error: { message: error.message, code: error.status?.toString() },
        }
      }

      // Get current session after OAuth
      const {
        data: { session },
      } = await supabase.auth.getSession()

      return {
        user: session?.user ?? null,
        error: null,
      }
    } catch (error) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return {
          error: { message: error.message, code: error.status?.toString() },
        }
      }

      // Clear auth store
      useAuthStore.getState().clearAuth()

      return { error: null }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }
    }
  }

  /**
   * Get current session
   */
  static async getSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        return {
          session: null,
          error: { message: error.message, code: error.status?.toString() },
        }
      }

      return { session, error: null }
    } catch (error) {
      return {
        session: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<AuthResult> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        return {
          user: null,
          error: { message: error.message, code: error.status?.toString() },
        }
      }

      return { user, error: null }
    } catch (error) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }
    }
  }

  /**
   * Initialize auth state listener
   * Should be called once when app starts
   */
  static initAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      const { setUser, setLoading } = useAuthStore.getState()

      setLoading(true)

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || null,
          avatar_url: session.user.user_metadata?.avatar_url || null,
        })
      } else {
        setUser(null)
      }

      setLoading(false)
    })
  }

  /**
   * Refresh session
   */
  static async refreshSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession()

      if (error) {
        return {
          session: null,
          error: { message: error.message, code: error.status?.toString() },
        }
      }

      return { session, error: null }
    } catch (error) {
      return {
        session: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }
    }
  }
}
