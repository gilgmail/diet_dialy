// 服務器端 Supabase 配置
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 服務器端 Supabase 客戶端
export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set(name, value, options)
        } catch (error) {
          // 在中介軟體中設置 cookie 時可能會失敗
          console.warn('Failed to set cookie in middleware:', error)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        } catch (error) {
          console.warn('Failed to remove cookie in middleware:', error)
        }
      },
    },
  })
}