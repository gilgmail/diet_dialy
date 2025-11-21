declare module '@/lib/supabase/server-auth' {
  export type AuthenticatedUser = {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }

  export function getAuthenticatedUser(request: any): Promise<AuthenticatedUser | null>
  export function createUnauthorizedResponse(message?: string): Response
}
