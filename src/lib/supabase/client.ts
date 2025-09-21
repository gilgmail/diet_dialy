// Supabase 客戶端配置
import { createBrowserClient } from '@supabase/ssr'

// 瀏覽器端 Supabase 客戶端
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// 單例模式的客戶端實例
export const supabase = createClient()