// 健康報告生成服務
// 聚合 7 天飲食、症狀、排便資料並產生報告

import { startOfDay, endOfDay, subDays, format, addDays } from 'date-fns'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { BowelDiaryService } from '@/features/bowel-diary/services/BowelDiaryService'
import type {
  WeeklyHealthReport,
  DailyHealthData,
  ReportSummary,
  ReportStatistics,
  FoodFrequency,
  SymptomTrendData,
  BowelStats,
  ReportGenerationOptions,
  ReportGenerationResult
} from '../types/report'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import type { BowelMovementEntry } from '@/features/bowel-diary/types'

export class ReportService {
  /**
   * 產生 7 天健康報告
   */
  static async generateWeeklyReport(
    userId: string,
    options?: Partial<ReportGenerationOptions>
  ): Promise<ReportGenerationResult> {
    try {
      const endDate = options?.endDate || new Date()
      const includeDays = options?.includeDays || 7
      const startDate = subDays(endDate, includeDays - 1)

      console.log('[ReportService] Generating report:', {
        userId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        includeDays
      })

      // 1. 並行查詢所有資料
      const [foodsResult, symptomsResult, bowelResult] = await Promise.all([
        FoodDiaryService.getFoodEntriesByDateRange(userId, startDate, endDate),
        SymptomDiaryService.getSymptomEntriesByDateRange(userId, startDate, endDate),
        BowelDiaryService.getBowelMovementsByDateRange(userId, startDate, endDate)
      ])

      console.log('[ReportService] Data fetched:', {
        foods: foodsResult.data?.length || 0,
        symptoms: symptomsResult.data?.length || 0,
        bowels: bowelResult.data?.length || 0
      })

      if (foodsResult.error || symptomsResult.error || bowelResult.error) {
        const errors = [
          foodsResult.error?.message,
          symptomsResult.error?.message,
          bowelResult.error?.message
        ].filter(Boolean).join('; ')
        throw new Error(`資料查詢失敗: ${errors}`)
      }

      // 2. 聚合每日資料
      const dailyData = this.aggregateDailyData(
        foodsResult.data || [],
        symptomsResult.data || [],
        bowelResult.data || [],
        startDate,
        endDate
      )

      // 3. 計算統計資料
      const statistics = this.calculateStatistics(dailyData)

      // 4. 計算摘要
      const summary = this.calculateSummary(
        foodsResult.data || [],
        symptomsResult.data || [],
        bowelResult.data || [],
        dailyData
      )

      // 5. 組裝報告
      const report: WeeklyHealthReport = {
        userId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        generatedAt: new Date().toISOString(),
        summary,
        dailyData,
        statistics,
        aiAnalysis: {
          status: 'unavailable'  // 預設無 AI
        },
        metadata: {
          appVersion: '1.0.0',
          reportVersion: '2025.11.28',
          timezone: options?.timezone || 'Asia/Taipei',
          language: 'zh-TW'
        }
      }

      console.log('[ReportService] Report generated successfully')
      return { data: report, error: null }

    } catch (error) {
      console.error('[ReportService] Error:', error)
      return {
        data: null,
        error: error instanceof Error ? error : new Error('報告生成失敗')
      }
    }
  }

  /**
   * 聚合每日資料
   */
  private static aggregateDailyData(
    foods: FoodEntry[],
    symptoms: SymptomEntry[],
    bowels: BowelMovementEntry[],
    startDate: Date,
    endDate: Date
  ): DailyHealthData[] {
    const days: DailyHealthData[] = []

    // 為每一天建立資料
    for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
      const dateStr = format(d, 'yyyy-MM-dd')

      // 篩選當日資料
      const dayFoods = foods.filter(f => {
        const consumedDate = format(new Date(f.consumed_at), 'yyyy-MM-dd')
        return consumedDate === dateStr
      })

      const daySymptom = symptoms.find(s => s.recorded_date === dateStr) || null

      const dayBowels = bowels.filter(b => b.recorded_date === dateStr)

      // 計算當日資料完整度
      const completeness = this.calculateDayCompleteness(
        dayFoods.length,
        !!daySymptom,
        dayBowels.length
      )

      days.push({
        date: dateStr,
        foods: dayFoods,
        symptoms: daySymptom,
        bowelMovements: dayBowels,
        completeness
      })
    }

    return days
  }

  /**
   * 計算單日資料完整度
   *
   * 評分標準：
   * - 有飲食記錄: 40%
   * - 有症狀記錄: 30%
   * - 有排便記錄: 30%
   */
  private static calculateDayCompleteness(
    foodCount: number,
    hasSymptom: boolean,
    bowelCount: number
  ): number {
    let score = 0
    if (foodCount > 0) score += 0.4
    if (hasSymptom) score += 0.3
    if (bowelCount > 0) score += 0.3
    return score
  }

  /**
   * 計算摘要統計
   */
  private static calculateSummary(
    foods: FoodEntry[],
    symptoms: SymptomEntry[],
    bowels: BowelMovementEntry[],
    dailyData: DailyHealthData[]
  ): ReportSummary {
    const totalCompleteness = dailyData.reduce((sum, day) => sum + day.completeness, 0)
    const dataCompleteness = dailyData.length > 0 ? totalCompleteness / dailyData.length : 0

    return {
      totalFoods: foods.length,
      totalSymptomEntries: symptoms.length,
      totalBowelMovements: bowels.length,
      dataCompleteness
    }
  }

  /**
   * 計算統計資料
   */
  private static calculateStatistics(dailyData: DailyHealthData[]): ReportStatistics {
    // 計算最常食用的食物
    const foodFrequency = new Map<string, number>()
    dailyData.forEach(day => {
      day.foods.forEach(food => {
        const name = food.food_name
        foodFrequency.set(name, (foodFrequency.get(name) || 0) + 1)
      })
    })

    const mostFrequentFoods: FoodFrequency[] = Array.from(foodFrequency.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 分析症狀趨勢
    const symptomTrends = this.analyzeSymptomTrends(dailyData)

    // 分析排便統計
    const bowelMovementStats = this.analyzeBowelStats(dailyData)

    return {
      mostFrequentFoods,
      symptomTrends,
      bowelMovementStats
    }
  }

  /**
   * 分析症狀趨勢
   */
  private static analyzeSymptomTrends(dailyData: DailyHealthData[]): SymptomTrendData {
    const symptoms = dailyData
      .filter(d => d.symptoms)
      .map(d => d.symptoms!)

    if (symptoms.length === 0) {
      return { trend: 'no_data' }
    }

    // 計算平均評分
    const avgOverallHealth = symptoms.reduce((s, sym) =>
      s + (sym.overall_health || 0), 0
    ) / symptoms.length

    const avgAbdominalPain = symptoms.reduce((s, sym) =>
      s + (sym.abdominal_pain || 0), 0
    ) / symptoms.length

    const avgDiarrhea = symptoms.reduce((s, sym) =>
      s + (sym.diarrhea || 0), 0
    ) / symptoms.length

    const avgBloating = symptoms.reduce((s, sym) =>
      s + (sym.bloating || 0), 0
    ) / symptoms.length

    const avgBloodyStools = symptoms.reduce((s, sym) =>
      s + (sym.bloody_stool || 0), 0
    ) / symptoms.length

    // 簡單趨勢判斷（前半週 vs 後半週）
    const mid = Math.floor(symptoms.length / 2)
    if (mid === 0) {
      return {
        trend: 'stable',
        avgScores: {
          overallHealth: avgOverallHealth,
          abdominalPain: avgAbdominalPain,
          diarrhea: avgDiarrhea,
          bloating: avgBloating,
          bloodyStools: avgBloodyStools
        }
      }
    }

    const firstHalf = symptoms.slice(0, mid)
    const secondHalf = symptoms.slice(mid)

    const firstAvg = firstHalf.reduce((s, sym) =>
      s + (sym.overall_health || 0), 0
    ) / firstHalf.length

    const secondAvg = secondHalf.reduce((s, sym) =>
      s + (sym.overall_health || 0), 0
    ) / secondHalf.length

    // 判斷趨勢（overall_health 越高表示越健康）
    const trend = secondAvg > firstAvg + 0.5 ? 'improving'
                : secondAvg < firstAvg - 0.5 ? 'worsening'
                : 'stable'

    return {
      trend,
      avgScores: {
        overallHealth: avgOverallHealth,
        abdominalPain: avgAbdominalPain,
        diarrhea: avgDiarrhea,
        bloating: avgBloating,
        bloodyStools: avgBloodyStools
      }
    }
  }

  /**
   * 分析排便統計
   */
  private static analyzeBowelStats(dailyData: DailyHealthData[]): BowelStats {
    const allBowels = dailyData.flatMap(d => d.bowelMovements)

    if (allBowels.length === 0) {
      return {
        totalCount: 0,
        avgPerDay: 0,
        bristolDistribution: {}
      }
    }

    // Bristol Scale 分布
    const bristolDistribution: Record<string, number> = {}
    allBowels.forEach(bowel => {
      const type = bowel.stool_type || 'unknown'
      bristolDistribution[type] = (bristolDistribution[type] || 0) + 1
    })

    // 血便計數
    const hasBloodCount = allBowels.filter(b => b.has_blood).length

    return {
      totalCount: allBowels.length,
      avgPerDay: allBowels.length / dailyData.length,
      bristolDistribution,
      hasBloodCount
    }
  }
}
