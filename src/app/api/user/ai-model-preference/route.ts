import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export type AIModelPreference = 'sonnet-4.5-latest' | 'haiku-3.5-latest' | 'haiku-3-legacy' | 'mock'

interface AIModelOption {
  value: AIModelPreference
  label: string
  description: string
  modelId: string
  costLevel: 'free' | 'low' | 'medium' | 'high'
  estimatedCostPerAnalysis: string
}

export const AI_MODEL_OPTIONS: AIModelOption[] = [
  {
    value: 'sonnet-4.5-latest',
    label: 'Claude 4.5 Sonnet（最新）',
    description: '最強大的模型，分析最準確深入',
    modelId: 'claude-sonnet-4-5-20250929',
    costLevel: 'high',
    estimatedCostPerAnalysis: '~$0.06-0.10'
  },
  {
    value: 'haiku-3.5-latest',
    label: 'Claude 3.5 Haiku（推薦）',
    description: '平衡性能與成本，適合日常使用',
    modelId: 'claude-3-5-haiku-latest',
    costLevel: 'medium',
    estimatedCostPerAnalysis: '~$0.01-0.02'
  },
  {
    value: 'haiku-3-legacy',
    label: 'Claude 3 Haiku（經濟）',
    description: '最便宜，但 token 限制較小',
    modelId: 'claude-3-haiku-20240307',
    costLevel: 'low',
    estimatedCostPerAnalysis: '~$0.003-0.006'
  },
  {
    value: 'mock',
    label: '測試模式（免費）',
    description: '使用模擬資料，完全免費，適合測試',
    modelId: 'mock',
    costLevel: 'free',
    estimatedCostPerAnalysis: '$0.00'
  }
]

/**
 * GET /api/user/ai-model-preference?userId=xxx
 * 從 diet_daily_users.preferences.mobileSettings 獲取 AI 模型偏好
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 從 diet_daily_users 表讀取 preferences
    const { data: user, error: userError } = await admin
      .from('diet_daily_users')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      throw userError
    }

    // 從 preferences.mobileSettings.aiModelPreference 讀取設定
    let preference: AIModelPreference = 'haiku-3.5-latest' // 預設值

    if (user?.preferences && typeof user.preferences === 'object') {
      const prefs = user.preferences as Record<string, any>
      if (prefs.mobileSettings && typeof prefs.mobileSettings === 'object') {
        const mobileSettings = prefs.mobileSettings as Record<string, any>
        if (mobileSettings.aiModelPreference && typeof mobileSettings.aiModelPreference === 'string') {
          preference = mobileSettings.aiModelPreference as AIModelPreference
        }
      }
    }

    return NextResponse.json({
      preference,
      options: AI_MODEL_OPTIONS,
      selectedOption: AI_MODEL_OPTIONS.find((opt) => opt.value === preference)
    })
  } catch (error) {
    console.error('[GET /api/user/ai-model-preference] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/user/ai-model-preference
 * 更新 diet_daily_users.preferences.mobileSettings.aiModelPreference
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, preference } = body as { userId: string; preference: AIModelPreference }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // 驗證偏好值
    if (!AI_MODEL_OPTIONS.find((opt) => opt.value === preference)) {
      return NextResponse.json({ error: 'Invalid AI model preference' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 讀取現有的 preferences
    const { data: existing, error: fetchError } = await admin
      .from('diet_daily_users')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    // 合併新的 aiModelPreference 到 mobileSettings
    let preferences: Record<string, any> = {}
    if (existing?.preferences && typeof existing.preferences === 'object') {
      preferences = { ...(existing.preferences as Record<string, any>) }
    }

    if (!preferences.mobileSettings || typeof preferences.mobileSettings !== 'object') {
      preferences.mobileSettings = {}
    } else {
      preferences.mobileSettings = { ...(preferences.mobileSettings as Record<string, any>) }
    }

    preferences.mobileSettings.aiModelPreference = preference

    // 更新 diet_daily_users (加上 .select() 避免 204 No Content)
    const { error: updateError } = await admin
      .from('diet_daily_users')
      .update({ preferences })
      .eq('id', userId)
      .select('id, preferences')
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      preference,
      selectedOption: AI_MODEL_OPTIONS.find((opt) => opt.value === preference)
    })
  } catch (error) {
    console.error('[PATCH /api/user/ai-model-preference] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
