import { Platform } from 'react-native'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/shared/api/supabase/client'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthError {
  message: string
  code?: string
}

export interface AuthResult {
  user: User | null
  error: AuthError | null
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class AuthService {
  /**
   * Sign in with Google OAuth
   * Opens browser for Google authentication
   */
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      // Use custom URL scheme for proper deep linking
      const redirectTo = Linking.createURL('auth/callback', {
        scheme: 'dietdaily'
      })

      console.log('Google Auth redirect URL:', redirectTo)

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
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

        return { user: null, error: null }
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
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

      const authUrl = data?.url

      if (!authUrl) {
        return {
          user: null,
          error: { message: '無法建立 Google 登入流程，請稍後再試' },
        }
      }

      console.log('Opening auth URL:', authUrl)

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo)

      console.log('Auth session result:', result)

      if (result.type !== 'success') {
        return {
          user: null,
          error: { message: '使用者已取消 Google 登入' },
        }
      }

      // Extract tokens from URL if present
      if (result.type === 'success' && result.url) {
        console.log('Auth URL received:', result.url)

        // Tokens are in URL fragment (#), not query params (?)
        // Parse fragment manually: dietdaily://auth/callback#access_token=...&refresh_token=...
        const fragmentMatch = result.url.match(/#(.+)/)
        if (fragmentMatch) {
          const fragment = fragmentMatch[1]
          const params = new URLSearchParams(fragment)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          console.log('Has access_token:', !!accessToken)
          console.log('Has refresh_token:', !!refreshToken)

          if (accessToken && refreshToken) {
            console.log('Setting session with extracted tokens...')
            // Set session directly from tokens
            const { data: sessionData, error: sessionSetError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionSetError) {
              console.error('Session set error:', sessionSetError)
              return {
                user: null,
                error: { message: sessionSetError.message },
              }
            }

            if (sessionData.user) {
              console.log('Session set successfully! User:', sessionData.user.email)
              return {
                user: sessionData.user,
                error: null,
              }
            }
          }
        }
      }

      const { session, error: sessionError } = await this.waitForSession(10000)

      if (sessionError) {
        return {
          user: null,
          error: sessionError,
        }
      }

      if (!session?.user) {
        return {
          user: null,
          error: { message: '尚未取得登入資訊，請稍後再試' },
        }
      }

      return {
        user: session.user,
        error: null,
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }
    }
  }

  private static async waitForSession(
    timeoutMs = 4000,
    intervalMs = 200
  ): Promise<{ session: Session | null; error: AuthError | null }> {
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
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

      if (session?.user) {
        return { session, error: null }
      }

      await sleep(intervalMs)
    }

    return { session: null, error: null }
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
