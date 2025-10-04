import { supabase } from '@/shared/api/supabase/client'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import type {
  DashboardStats,
  DailyStats,
  MealDistribution,
  SeverityDistribution,
  WeeklyTrend,
  HealthInsight,
  DashboardData,
} from '../types'

export class DashboardService {
  /**
   * Get comprehensive dashboard data for the user
   */
  static async getDashboardData(userId: string): Promise<{
    data: DashboardData | null
    error: { message: string } | null
  }> {
    try {
      console.log('[DashboardService] Fetching data for userId:', userId)

      // Fetch food and symptom entries in parallel
      const [foodResult, symptomResult] = await Promise.all([
        this.getFoodEntries(userId),
        this.getSymptomEntries(userId),
      ])

      console.log('[DashboardService] Food entries:', {
        count: foodResult.data?.length || 0,
        hasError: !!foodResult.error,
        error: foodResult.error
      })

      console.log('[DashboardService] Symptom entries:', {
        count: symptomResult.data?.length || 0,
        hasError: !!symptomResult.error,
        error: symptomResult.error
      })

      // Only throw if food entries fail (symptom entries are optional for now)
      if (foodResult.error) {
        throw new Error('Failed to fetch food entries')
      }

      const foodEntries = foodResult.data || []
      const symptomEntries = symptomResult.data || [] // Use empty array if symptom fetch fails

      // Calculate statistics
      const stats = this.calculateStats(foodEntries, symptomEntries)
      const weeklyTrend = this.calculateWeeklyTrend(foodEntries, symptomEntries)
      const insights = this.generateInsights(stats, weeklyTrend)

      console.log('[DashboardService] Calculated stats:', stats)

      return {
        data: {
          stats,
          weeklyTrend,
          insights,
        },
        error: null,
      }
    } catch (error) {
      console.error('[DashboardService] Error:', error)
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        },
      }
    }
  }

  /**
   * Get food entries for the user
   */
  private static async getFoodEntries(userId: string) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .order('consumed_at', { ascending: false })

    return { data: data as FoodEntry[], error }
  }

  /**
   * Get symptom entries for the user
   */
  private static async getSymptomEntries(userId: string) {
    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })

    return { data: data as SymptomEntry[], error }
  }

  /**
   * Calculate dashboard statistics
   */
  private static calculateStats(
    foodEntries: FoodEntry[],
    symptomEntries: SymptomEntry[]
  ): DashboardStats {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)

    // Food stats
    const todayFoodEntries = foodEntries.filter(
      (entry) => new Date(entry.consumed_at) >= startOfToday
    )
    const weekFoodEntries = foodEntries.filter(
      (entry) => new Date(entry.consumed_at) >= startOfWeek
    )

    const totalCalories = foodEntries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    )
    const todayCalories = todayFoodEntries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    )
    const weekCalories = weekFoodEntries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    )

    // Symptom stats - use recorded_at for timestamp filtering
    const todaySymptomEntries = symptomEntries.filter(
      (entry) => new Date(entry.recorded_at) >= startOfToday
    )
    const weekSymptomEntries = symptomEntries.filter(
      (entry) => new Date(entry.recorded_at) >= startOfWeek
    )

    // Most common symptom
    const symptomCounts = symptomEntries.reduce((acc, entry) => {
      acc[entry.symptom_name] = (acc[entry.symptom_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostCommonSymptom = Object.keys(symptomCounts).sort(
      (a, b) => symptomCounts[b] - symptomCounts[a]
    )[0]

    // Average severity
    const severityMap = { mild: 1, moderate: 2, severe: 3 }
    const averageSeverity =
      symptomEntries.length > 0
        ? symptomEntries.reduce(
            (sum, entry) => sum + severityMap[entry.severity],
            0
          ) / symptomEntries.length
        : undefined

    return {
      totalFoodEntries: foodEntries.length,
      todayFoodEntries: todayFoodEntries.length,
      weekFoodEntries: weekFoodEntries.length,
      totalCalories,
      todayCalories,
      weekCalories,
      totalSymptomEntries: symptomEntries.length,
      todaySymptomEntries: todaySymptomEntries.length,
      weekSymptomEntries: weekSymptomEntries.length,
      mostCommonSymptom,
      averageSeverity,
      lastEntryDate:
        foodEntries[0]?.consumed_at || symptomEntries[0]?.recorded_at,
      firstEntryDate:
        foodEntries[foodEntries.length - 1]?.consumed_at ||
        symptomEntries[symptomEntries.length - 1]?.recorded_at,
    }
  }

  /**
   * Calculate weekly trend data
   */
  private static calculateWeeklyTrend(
    foodEntries: FoodEntry[],
    symptomEntries: SymptomEntry[]
  ): WeeklyTrend {
    const now = new Date()
    const week: DailyStats[] = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)

      const dayFoodEntries = foodEntries.filter((entry) => {
        const entryDate = new Date(entry.consumed_at)
        return entryDate >= date && entryDate < nextDay
      })

      const daySymptomEntries = symptomEntries.filter((entry) => {
        const entryDate = new Date(entry.recorded_at)
        return entryDate >= date && entryDate < nextDay
      })

      const dayCalories = dayFoodEntries.reduce(
        (sum, entry) => sum + (entry.calories || 0),
        0
      )

      week.push({
        date: date.toISOString(),
        foodCount: dayFoodEntries.length,
        symptomCount: daySymptomEntries.length,
        totalCalories: dayCalories,
      })
    }

    // Meal distribution
    const mealDistribution: MealDistribution = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    }

    foodEntries.forEach((entry) => {
      if (entry.meal_type in mealDistribution) {
        mealDistribution[entry.meal_type]++
      }
    })

    // Severity distribution
    const severityDistribution: SeverityDistribution = {
      mild: 0,
      moderate: 0,
      severe: 0,
    }

    symptomEntries.forEach((entry) => {
      if (entry.severity in severityDistribution) {
        severityDistribution[entry.severity]++
      }
    })

    return {
      week,
      mealDistribution,
      severityDistribution,
    }
  }

  /**
   * Generate health insights based on data
   */
  private static generateInsights(
    stats: DashboardStats,
    trend: WeeklyTrend
  ): HealthInsight[] {
    const insights: HealthInsight[] = []

    // Consistent tracking insight
    if (stats.weekFoodEntries >= 14) {
      insights.push({
        id: '1',
        type: 'positive',
        icon: '🎉',
        title: '持續記錄',
        description: '本週已記錄多筆飲食，保持良好習慣！',
        timestamp: new Date().toISOString(),
      })
    }

    // Low symptom frequency
    if (stats.weekSymptomEntries === 0) {
      insights.push({
        id: '2',
        type: 'positive',
        icon: '😊',
        title: '健康狀況良好',
        description: '本週未記錄任何症狀，繼續保持！',
        timestamp: new Date().toISOString(),
      })
    }

    // High symptom frequency warning
    if (stats.weekSymptomEntries > 10) {
      insights.push({
        id: '3',
        type: 'warning',
        icon: '⚠️',
        title: '注意症狀頻率',
        description: '本週症狀記錄較多，建議諮詢醫療專業人員',
        timestamp: new Date().toISOString(),
      })
    }

    // Calorie tracking
    if (stats.weekCalories > 0) {
      const avgDailyCalories = Math.round(stats.weekCalories / 7)
      insights.push({
        id: '4',
        type: 'info',
        icon: '📊',
        title: '每日平均熱量',
        description: `本週平均每日攝取 ${avgDailyCalories} 大卡`,
        timestamp: new Date().toISOString(),
      })
    }

    // Most common symptom
    if (stats.mostCommonSymptom) {
      insights.push({
        id: '5',
        type: 'info',
        icon: '🔍',
        title: '常見症狀',
        description: `最常記錄的症狀：${stats.mostCommonSymptom}`,
        timestamp: new Date().toISOString(),
      })
    }

    return insights
  }
}
