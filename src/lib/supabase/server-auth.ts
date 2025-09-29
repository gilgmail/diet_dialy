// Server-side authentication utilities for API routes
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export interface AuthenticatedUser {
  id: string
  email?: string
  user_metadata?: any
}

/**
 * Get authenticated user from server-side API route
 * @param request NextRequest object
 * @returns Authenticated user or null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // No-op for server-side read operations
          },
          remove() {
            // No-op for server-side read operations
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('Server auth check failed:', error?.message || 'No user found')
      return null
    }

    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata
    }
  } catch (error) {
    console.error('Server authentication error:', error)
    return null
  }
}

/**
 * Alternative method using cookies() for App Router
 */
export async function getAuthenticatedUserFromCookies(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {
            // No-op for server-side read operations
          },
          remove() {
            // No-op for server-side read operations
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('Server auth check failed:', error?.message || 'No user found')
      return null
    }

    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata
    }
  } catch (error) {
    console.error('Server authentication error:', error)
    return null
  }
}

/**
 * Create an authentication response for unauthorized access
 */
export function createUnauthorizedResponse(message: string = '未授權訪問') {
  return Response.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED'
    },
    { status: 401 }
  )
}

/**
 * Validate user access to a specific resource
 * @param authenticatedUserId The authenticated user's ID
 * @param resourceUserId The user ID associated with the resource
 * @returns true if access is allowed, false otherwise
 */
export function validateUserAccess(authenticatedUserId: string, resourceUserId: string): boolean {
  return authenticatedUserId === resourceUserId
}