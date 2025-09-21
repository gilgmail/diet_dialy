// Supabase 中介軟體配置
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          supabaseResponse.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          supabaseResponse.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // 重新整理會話以確保使用者狀態是最新的
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 保護需要身份驗證的路由
  const protectedRoutes = [
    '/food-diary',
    '/history',
    '/reports',
    '/health-analytics',
    '/admin',
    '/setup'
  ]

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    // 重定向到登錄頁面
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}