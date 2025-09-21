import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const origin = requestUrl.origin

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    try {
      // 交換授權碼獲取用戶 session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`)
      }

      // 確保用戶已經登入並獲得 session
      if (data.session && data.user) {
        console.log('Authentication successful for user:', data.user.id)

        // 檢查並創建用戶資料（如果不存在）
        try {
          const { data: existingProfile, error: profileError } = await supabase
            .from('diet_daily_users')
            .select('id')
            .eq('id', data.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            // 用戶資料不存在，創建新的
            const profileData = {
              id: data.user.id,
              email: data.user.email!,
              google_id: data.user.user_metadata?.sub,
              name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
              avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { error: insertError } = await supabase
              .from('diet_daily_users')
              .insert(profileData)

            if (insertError) {
              console.error('Error creating user profile:', insertError)
            } else {
              console.log('User profile created successfully')
            }
          }
        } catch (profileError) {
          console.error('Error checking/creating user profile:', profileError)
        }

        // 登入成功，重定向到設定頁面
        return NextResponse.redirect(`${origin}/settings?auth_success=true`)
      }

      // Session 創建失敗
      return NextResponse.redirect(`${origin}/?auth_error=session_creation_failed`)
    } catch (error) {
      console.error('Unexpected auth error:', error)
      return NextResponse.redirect(`${origin}/?auth_error=unexpected_error`)
    }
  }

  // 沒有授權碼，重定向到首頁
  return NextResponse.redirect(`${origin}/`)
}