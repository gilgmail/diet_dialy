/**
 * 增強食物資料庫搜尋 API - Phase 2 優化版
 * 整合多條件搜尋、AI 評分和智能推薦
 *
 * @version 2.0.0
 * @author Diet Daily AI Team
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple in-memory cache for search results
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface EnhancedSearchRequest {
  query?: string
  category?: string
  medicalCondition?: 'ibd' | 'ibs' | 'allergy'
  safetyLevel?: 1 | 2 | 3 | 4 | 5
  sortBy?: 'relevance' | 'safety' | 'popularity' | 'recent'
  limit?: number
  offset?: number
  includeNutrition?: boolean
  excludeAllergens?: string[]
}

export interface EnhancedFoodResult {
  id: string
  name: string
  name_en?: string
  category: string
  brand?: string

  // 營養資訊
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number

  // AI 評分
  medical_score?: number
  safety_level?: string
  confidence?: number

  // 醫療適宜性
  ibd_score?: {
    acute_phase: number
    remission_phase: number
    general_safety: number
  }

  // 標籤和屬性
  allergens: string[]
  tags: string[]
  verification_status: string

  // 搜尋相關性
  relevance_score?: number
  match_reason?: string[]
}

export interface EnhancedSearchResponse {
  success: boolean
  results: EnhancedFoodResult[]
  total_count: number
  search_metadata: {
    query: string
    filters_applied: string[]
    sort_method: string
    search_time_ms: number
  }
  suggestions?: string[]
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)

  // 解析查詢參數
  const query = searchParams.get('query') || ''
  const category = searchParams.get('category')
  const medicalCondition = searchParams.get('medicalCondition') as any
  const safetyLevel = searchParams.get('safetyLevel')
    ? parseInt(searchParams.get('safetyLevel')!) as 1 | 2 | 3 | 4 | 5
    : undefined
  const sortBy = (searchParams.get('sortBy') as any) || 'relevance'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  const includeNutrition = searchParams.get('includeNutrition') === 'true'
  const excludeAllergens = searchParams.get('excludeAllergens')?.split(',') || []

  // Create cache key for this search
  const cacheKey = `${query}|${category}|${safetyLevel}|${sortBy}|${limit}|${offset}|${includeNutrition}|${excludeAllergens.join(',')}`

  // Check cache first
  const cached = searchCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      search_metadata: {
        ...cached.data.search_metadata,
        search_time_ms: 1, // Cache hit
        cached: true
      }
    })
  }

  try {
    // Connect to Supabase and query real data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 配置未找到')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const filtersApplied: string[] = []

    // Build query
    let supabaseQuery = supabase
      .from('diet_daily_foods')
      .select(`
        id,
        name,
        name_en,
        category,
        brand,
        calories,
        protein,
        carbohydrates,
        fat,
        fiber,
        sugar,
        sodium,
        condition_scores,
        ibd_score,
        allergens,
        tags,
        verification_status,
        created_at
      `)

    // Apply filters
    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,name_en.ilike.%${query}%`)
      filtersApplied.push('text_search')
    }

    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category)
      filtersApplied.push('category')
    }

    // Apply safety level filter if specified
    if (safetyLevel !== undefined) {
      // Note: Database still contains old 0-3 scale in condition_scores
      // We'll filter by processing the results since the database structure varies
      filtersApplied.push('safety_level')
    }

    // Exclude allergens if specified
    if (excludeAllergens.length > 0) {
      excludeAllergens.forEach(allergen => {
        supabaseQuery = supabaseQuery.not('allergens', 'cs', `["${allergen}"]`)
      })
      filtersApplied.push('allergen_filter')
    }

    // Only include verified foods
    supabaseQuery = supabaseQuery.eq('verification_status', 'approved')
    filtersApplied.push('verified_only')

    // Apply pagination
    const startIndex = offset
    const endIndex = offset + limit - 1
    supabaseQuery = supabaseQuery.range(startIndex, endIndex)

    // Execute query
    const { data: supabaseFoods, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Supabase 查詢錯誤: ${error.message}`)
    }

    const paginatedFoods = supabaseFoods || []

    // 處理結果
    const results: EnhancedFoodResult[] = paginatedFoods.map(food => {
      const result: EnhancedFoodResult = {
        id: food.id,
        name: food.name,
        name_en: food.name_en || undefined,
        category: food.category,
        brand: food.brand || undefined,
        allergens: food.allergens || [],
        tags: food.tags || [],
        verification_status: food.verification_status,
      }

      // 添加營養資訊（如果請求）
      if (includeNutrition) {
        result.calories = food.calories || undefined
        result.protein = food.protein || undefined
        result.carbohydrates = food.carbohydrates || undefined
        result.fat = food.fat || undefined
        result.fiber = food.fiber || undefined
      }

      // 添加醫療評分 - 使用新的 1-5 分制
      const ibdScore = food.ibd_score ||
        food.condition_scores?.ibd?.general_safety ||
        3 // 預設值

      result.medical_score = ibdScore
      result.safety_level = getSafetyLevelText(ibdScore)
      result.confidence = 0.8 // 預設信心度

      // 如果有詳細的 condition_scores，提供額外評分資訊
      if (food.condition_scores?.ibd) {
        result.ibd_score = {
          acute_phase: food.condition_scores.ibd.acute_phase || ibdScore,
          remission_phase: food.condition_scores.ibd.remission_phase || ibdScore,
          general_safety: food.condition_scores.ibd.general_safety || ibdScore
        }
      }

      // 計算搜尋相關性
      if (query.trim()) {
        result.relevance_score = calculateRelevance(food.name, query, food.name_en)
        result.match_reason = getMatchReasons(food, query)
      }

      return result
    })

    // Apply safety level filtering after results are processed
    let filteredResults = results
    if (safetyLevel !== undefined) {
      filteredResults = results.filter(result => {
        const score = result.medical_score || 0
        // Convert old 0-3 scale to 1-5 scale for comparison
        const convertedScore = score === 0 ? 1 :
                              score === 1 ? 2 :
                              score === 2 ? 3 :
                              score === 3 ? 4 : score
        return convertedScore >= safetyLevel
      })
    }

    const searchTime = Date.now() - startTime

    const response: EnhancedSearchResponse = {
      success: true,
      results: filteredResults,
      total_count: filteredResults.length, // This is the actual filtered result count
      search_metadata: {
        query,
        filters_applied: filtersApplied,
        sort_method: sortBy,
        search_time_ms: searchTime
      }
    }

    // 添加搜尋建議
    if (filteredResults.length === 0 && query.trim()) {
      response.suggestions = await generateSearchSuggestions(query)
    }

    // Cache the response
    searchCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })

    // Clean old cache entries (simple cleanup)
    if (searchCache.size > 100) {
      const oldestKeys = Array.from(searchCache.keys()).slice(0, 50)
      oldestKeys.forEach(key => searchCache.delete(key))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('增強搜尋 API 錯誤:', error)

    return NextResponse.json(
      {
        success: false,
        error: '搜尋服務暫時不可用',
        results: [],
        total_count: 0,
        search_metadata: {
          query,
          filters_applied: [],
          sort_method: sortBy,
          search_time_ms: Date.now() - startTime
        }
      },
      { status: 500 }
    )
  }
}

// 輔助函數
function getSafetyLevelText(score: number): string {
  if (score >= 5) return '極推薦'
  if (score >= 4) return '良好'
  if (score >= 3) return '適中'
  if (score >= 2) return '謹慎'
  return '不建議'
}

function calculateRelevance(name: string, query: string, nameEn?: string): number {
  const lowerQuery = query.toLowerCase()

  // Check Chinese name
  const lowerName = name.toLowerCase()
  if (lowerName === lowerQuery) return 1.0
  if (lowerName.startsWith(lowerQuery)) return 0.9
  if (lowerName.includes(lowerQuery)) return 0.7

  // Check English name if available
  if (nameEn) {
    const lowerNameEn = nameEn.toLowerCase()
    if (lowerNameEn === lowerQuery) return 1.0
    if (lowerNameEn.startsWith(lowerQuery)) return 0.9
    if (lowerNameEn.includes(lowerQuery)) return 0.7
  }

  return 0.3
}

function getMatchReasons(food: any, query: string): string[] {
  const reasons: string[] = []
  const lowerQuery = query.toLowerCase()

  if (food.name.toLowerCase().includes(lowerQuery)) {
    reasons.push('名稱匹配')
  }
  if (food.name_en?.toLowerCase().includes(lowerQuery)) {
    reasons.push('英文名稱匹配')
  }
  if (food.brand?.toLowerCase().includes(lowerQuery)) {
    reasons.push('品牌匹配')
  }
  if (food.category.toLowerCase().includes(lowerQuery)) {
    reasons.push('分類匹配')
  }

  return reasons
}

async function generateSearchSuggestions(query: string): Promise<string[]> {
  // Return mock suggestions for testing phase
  const suggestions = ['白米飯', '糙米飯', '燕麥粥', '小米粥', '藜麥']
  return suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5)
}