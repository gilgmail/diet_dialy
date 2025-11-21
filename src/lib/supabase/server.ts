// 服務器端 Supabase 配置
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 服務器端 Supabase 客戶端 (使用 user auth context)
export function createClient() {
  const cookieStore = cookies() as unknown as Awaited<ReturnType<typeof cookies>>
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

// Admin client (bypasses RLS) - 僅用於 server-side 操作
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }

  // Use native Node.js https module instead of undici to avoid fetch failures in Docker
  // This is a workaround for: https://github.com/supabase/supabase-js/issues/882
  const customFetch = async (url: string, options: RequestInit = {}) => {
    const https = await import('https')
    const http = await import('http')
    const urlModule = await import('url')

    return new Promise<Response>((resolve, reject) => {
      const parsedUrl = new urlModule.URL(url)
      const protocol = parsedUrl.protocol === 'https:' ? https : http

      // Convert Headers object to plain object if needed
      let headers: Record<string, string> = {}
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            headers[key] = value
          })
        } else {
          headers = options.headers as Record<string, string>
        }
      }

      const reqOptions = {
        method: options.method || 'GET',
        headers: headers,
      }

      const req = protocol.request(parsedUrl, reqOptions, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          // Response constructor doesn't allow body for 204 No Content
          // https://developer.mozilla.org/en-US/docs/Web/API/Response/Response
          const responseInit: ResponseInit = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new Headers(res.headers as HeadersInit)
          }
          const response = (res.statusCode === 204 || res.statusCode === 205 || res.statusCode === 304)
            ? new Response(null, responseInit)
            : new Response(data, responseInit)
          resolve(response)
        })
      })

      req.on('error', reject)

      if (options.body) {
        req.write(options.body)
      }

      req.end()
    })
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: customFetch as any
    }
  })
}
