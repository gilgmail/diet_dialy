// FODMAP 資料庫服務層
// 提供完整的 FODMAP 數據管理和個人化分析

import { supabase } from './client'

export interface FODMAPComponents {
  id?: string
  food_id: string
  fructans: number          // 果聚糖
  gos: number              // 半乳寡糖
  lactose: number          // 乳糖
  excess_fructose: number  // 過量果糖
  sorbitol: number         // 山梨醇
  mannitol: number         // 甘露醇
  xylitol: number          // 木糖醇
  maltitol: number         // 麥芽糖醇
  total_fodmap_score?: number
  fodmap_risk_level?: 'low' | 'medium' | 'high'
  safe_portion_size?: number
  moderate_portion_size?: number
  confidence_level: number
  data_source?: string
}

export interface FODMAPAnalysis {
  food_name: string
  category: string
  total_fodmap_score: number
  fodmap_risk_level: 'low' | 'medium' | 'high'
  safe_portion_size: number
  primary_fodmaps: string[]
  ibd_considerations?: string
  preparation_tips?: string
}

export interface UserFODMAPTolerance {
  id?: string
  user_id: string
  fodmap_type: 'fructans' | 'gos' | 'lactose' | 'excess_fructose' | 'sorbitol' | 'mannitol' | 'xylitol' | 'maltitol'
  tolerance_level: 'none' | 'low' | 'medium' | 'high'
  safe_amount: number
  determined_by: 'self_reported' | 'elimination_diet' | 'challenge_test'
  confidence: number
  last_tested?: string
}

export interface PersonalFODMAPRecommendation {
  food_name: string
  category: string
  personal_risk_level: 'avoid' | 'caution' | 'moderate' | 'safe'
  recommended_portion: number
  reason: string
}

export class FODMAPService {

  // 獲取食物的 FODMAP 成分
  async getFoodFODMAP(foodId: string): Promise<FODMAPComponents | null> {
    const { data, error } = await supabase
      .from('fodmap_components')
      .select('*')
      .eq('food_id', foodId)
      .single()

    if (error) {
      console.error('獲取 FODMAP 數據失敗:', error)
      return null
    }

    return data
  }

  // 批次獲取 FODMAP 數據
  async getBatchFODMAP(foodIds: string[]): Promise<Map<string, FODMAPComponents>> {
    const { data, error } = await supabase
      .from('fodmap_components')
      .select('*')
      .in('food_id', foodIds)

    if (error) {
      console.error('批次獲取 FODMAP 數據失敗:', error)
      return new Map()
    }

    const fodmapMap = new Map<string, FODMAPComponents>()
    data.forEach(item => {
      fodmapMap.set(item.food_id, item)
    })

    return fodmapMap
  }

  // 更新或建立食物的 FODMAP 數據
  async updateFoodFODMAP(fodmapData: FODMAPComponents): Promise<FODMAPComponents | null> {
    const { data, error } = await supabase
      .from('fodmap_components')
      .upsert({
        ...fodmapData,
        last_updated: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('更新 FODMAP 數據失敗:', error)
      throw error
    }

    return data
  }

  // 搜尋特定 FODMAP 風險等級的食物
  async getFoodsByFODMAPRisk(
    riskLevel: 'low' | 'medium' | 'high',
    limit = 50
  ): Promise<FODMAPAnalysis[]> {
    const { data, error } = await supabase
      .from('fodmap_analysis_view')
      .select('*')
      .eq('fodmap_risk_level', riskLevel)
      .not('total_fodmap_score', 'is', null)
      .order('total_fodmap_score', { ascending: riskLevel === 'low' })
      .limit(limit)

    if (error) {
      console.error('搜尋 FODMAP 風險等級食物失敗:', error)
      return []
    }

    return data.map(item => ({
      food_name: item.name,
      category: item.category,
      total_fodmap_score: item.total_fodmap_score,
      fodmap_risk_level: item.fodmap_risk_level,
      safe_portion_size: item.safe_portion_size,
      primary_fodmaps: this.identifyPrimaryFODMAPs(item),
      ibd_considerations: item.ibd_considerations,
      preparation_tips: item.preparation_tips
    }))
  }

  // 識別主要 FODMAP 成分
  private identifyPrimaryFODMAPs(data: any): string[] {
    const fodmaps = []

    if (data.fructans > 0.1) fodmaps.push('果聚糖')
    if (data.lactose > 0.1) fodmaps.push('乳糖')
    if (data.excess_fructose > 0.1) fodmaps.push('過量果糖')
    if (data.total_polyols > 0.1) fodmaps.push('多元醇')

    return fodmaps
  }

  // 獲取用戶的 FODMAP 耐受性設定
  async getUserFODMAPTolerance(userId: string): Promise<UserFODMAPTolerance[]> {
    const { data, error } = await supabase
      .from('user_fodmap_tolerance')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('獲取用戶 FODMAP 耐受性失敗:', error)
      return []
    }

    return data
  }

  // 更新用戶的 FODMAP 耐受性
  async updateUserFODMAPTolerance(
    userId: string,
    fodmapType: UserFODMAPTolerance['fodmap_type'],
    toleranceData: Partial<UserFODMAPTolerance>
  ): Promise<UserFODMAPTolerance | null> {
    const { data, error } = await supabase
      .from('user_fodmap_tolerance')
      .upsert({
        user_id: userId,
        fodmap_type: fodmapType,
        ...toleranceData,
        last_tested: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('更新 FODMAP 耐受性失敗:', error)
      throw error
    }

    return data
  }

  // 獲取個人化 FODMAP 推薦
  async getPersonalFODMAPRecommendations(
    userId: string,
    limit = 100
  ): Promise<PersonalFODMAPRecommendation[]> {
    const { data, error } = await supabase
      .rpc('get_personal_fodmap_recommendations', {
        p_user_id: userId
      })
      .limit(limit)

    if (error) {
      console.error('獲取個人化 FODMAP 推薦失敗:', error)
      return []
    }

    return data
  }

  // 分析用戶的 FODMAP 攝取模式
  async analyzeFODMAPIntake(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalFODMAPScore: number
    riskDistribution: { low: number; medium: number; high: number }
    primaryFODMAPSources: string[]
    recommendations: string[]
  }> {
    // 獲取指定期間的飲食記錄
    const { data: foodEntries, error } = await supabase
      .from('diet_daily_food_entries')
      .select(`
        food_id,
        portion_size,
        diet_daily_foods (
          name,
          category
        )
      `)
      .eq('user_id', userId)
      .gte('consumed_at', startDate)
      .lte('consumed_at', endDate)

    if (error) {
      console.error('分析 FODMAP 攝取失敗:', error)
      throw error
    }

    // 獲取相關食物的 FODMAP 數據
    const foodIds = foodEntries.map(entry => entry.food_id)
    const fodmapData = await this.getBatchFODMAP(foodIds)

    let totalFODMAPScore = 0
    const riskCounts = { low: 0, medium: 0, high: 0 }
    const fodmapSources: { [key: string]: number } = {}

    foodEntries.forEach(entry => {
      const fodmap = fodmapData.get(entry.food_id)
      if (!fodmap) return

      const portionMultiplier = (entry.portion_size || 100) / 100
      const entryFODMAPScore = (fodmap.total_fodmap_score || 0) * portionMultiplier

      totalFODMAPScore += entryFODMAPScore

      // 統計風險分布
      if (fodmap.fodmap_risk_level) {
        riskCounts[fodmap.fodmap_risk_level]++
      }

      // 識別主要 FODMAP 來源
      if (entryFODMAPScore > 1.0) {
        const foodName = (entry as any).diet_daily_foods.name
        fodmapSources[foodName] = (fodmapSources[foodName] || 0) + entryFODMAPScore
      }
    })

    // 生成建議
    const recommendations = this.generateFODMAPRecommendations(
      totalFODMAPScore,
      riskCounts,
      fodmapSources
    )

    return {
      totalFODMAPScore,
      riskDistribution: riskCounts,
      primaryFODMAPSources: Object.keys(fodmapSources)
        .sort((a, b) => fodmapSources[b] - fodmapSources[a])
        .slice(0, 5),
      recommendations
    }
  }

  // 生成 FODMAP 飲食建議
  private generateFODMAPRecommendations(
    totalScore: number,
    riskDistribution: { low: number; medium: number; high: number },
    sources: { [key: string]: number }
  ): string[] {
    const recommendations = []

    if (totalScore > 20) {
      recommendations.push('您的總 FODMAP 攝取量較高，建議減少高 FODMAP 食物的攝取')
    }

    if (riskDistribution.high > riskDistribution.low) {
      recommendations.push('建議增加低 FODMAP 食物的比例，減少高風險食物')
    }

    const topSources = Object.keys(sources).slice(0, 3)
    if (topSources.length > 0) {
      recommendations.push(`主要 FODMAP 來源：${topSources.join('、')}，建議尋找替代食物`)
    }

    if (recommendations.length === 0) {
      recommendations.push('您的 FODMAP 攝取控制良好，繼續保持現有飲食模式')
    }

    return recommendations
  }

  // 獲取 FODMAP 統計資料
  async getFODMAPStats() {
    const { data, error } = await supabase
      .rpc('get_fodmap_stats')

    if (error) {
      console.error('獲取 FODMAP 統計失敗:', error)
      return null
    }

    return data[0]
  }

  // 搜尋低 FODMAP 替代食物
  async findLowFODMAPAlternatives(
    originalFoodId: string,
    category?: string
  ): Promise<FODMAPAnalysis[]> {
    let query = supabase
      .from('fodmap_analysis_view')
      .select('*')
      .eq('fodmap_risk_level', 'low')
      .not('total_fodmap_score', 'is', null)
      .neq('id', originalFoodId)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
      .order('total_fodmap_score', { ascending: true })
      .limit(10)

    if (error) {
      console.error('搜尋低 FODMAP 替代食物失敗:', error)
      return []
    }

    return data.map(item => ({
      food_name: item.name,
      category: item.category,
      total_fodmap_score: item.total_fodmap_score,
      fodmap_risk_level: item.fodmap_risk_level,
      safe_portion_size: item.safe_portion_size,
      primary_fodmaps: this.identifyPrimaryFODMAPs(item),
      ibd_considerations: item.ibd_considerations,
      preparation_tips: item.preparation_tips
    }))
  }

  // FODMAP 教育內容
  getFODMAPEducation() {
    return {
      introduction: `FODMAP 是一群容易在小腸發酵的短鏈碳水化合物，包括：
      • 寡糖 (Oligosaccharides): 果聚糖、半乳寡糖
      • 雙糖 (Disaccharides): 乳糖
      • 單糖 (Monosaccharides): 過量果糖
      • 多元醇 (Polyols): 山梨醇、甘露醇等`,

      implementation: `低 FODMAP 飲食實施：
      1. 消除期 (2-6週): 避免所有高 FODMAP 食物
      2. 重新引入期 (6-8週): 逐一測試各類 FODMAP
      3. 個人化期: 建立個人耐受清單`,

      ibd_considerations: `IBD 患者特殊考量：
      • 腸道發炎會降低 FODMAP 耐受性
      • 急性期更需要嚴格限制
      • 緩解期可逐步嘗試
      • 營養均衡很重要`,

      tips: [
        '閱讀食品標籤，注意隱藏的 FODMAP 成分',
        '使用大蒜油替代大蒜，選用青蔥綠色部分',
        '選擇無乳糖乳製品或植物奶',
        '限制果糖含量高的水果',
        '避免含多元醇的無糖產品'
      ]
    }
  }
}

// 單例模式
export const fodmapService = new FODMAPService()