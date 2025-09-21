// Supabase 醫療報告服務
import { supabase } from './client'
import type { MedicalReport, MedicalReportInsert, MedicalReportUpdate } from '@/types/supabase'

export class SupabaseMedicalReportsService {

  // 建立醫療報告
  async createMedicalReport(reportData: MedicalReportInsert): Promise<MedicalReport | null> {
    const { data, error } = await supabase
      .from('medical_reports')
      .insert(reportData)
      .select()
      .single()

    if (error) {
      console.error('Create medical report error:', error)
      throw error
    }

    return data
  }

  // 獲取用戶的醫療報告
  async getUserMedicalReports(userId: string): Promise<MedicalReport[]> {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get user medical reports error:', error)
      throw error
    }

    return data || []
  }

  // 根據 ID 獲取醫療報告
  async getMedicalReportById(id: string): Promise<MedicalReport | null> {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get medical report by ID error:', error)
      return null
    }

    return data
  }

  // 更新醫療報告
  async updateMedicalReport(id: string, updates: MedicalReportUpdate): Promise<MedicalReport | null> {
    const { data, error } = await supabase
      .from('medical_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update medical report error:', error)
      throw error
    }

    return data
  }

  // 刪除醫療報告
  async deleteMedicalReport(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('medical_reports')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete medical report error:', error)
      throw error
    }

    return true
  }

  // 根據日期範圍獲取報告
  async getMedicalReportsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MedicalReport[]> {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get medical reports by date range error:', error)
      throw error
    }

    return data || []
  }

  // 根據報告類型獲取報告
  async getMedicalReportsByType(
    userId: string,
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom'
  ): Promise<MedicalReport[]> {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('report_type', reportType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get medical reports by type error:', error)
      throw error
    }

    return data || []
  }

  // 生成報告摘要統計
  async generateReportSummary(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    // 這裡可以整合食物記錄和症狀追蹤數據來生成報告摘要
    // 實際實現會根據具體的醫療分析需求來設計

    const { data: foodEntries, error: foodError } = await supabase
      .from('food_entries')
      .select('calories, medical_score, symptoms_before, symptoms_after, consumed_at')
      .eq('user_id', userId)
      .gte('consumed_at', startDate)
      .lte('consumed_at', endDate)

    if (foodError) {
      console.error('Get food entries for report error:', foodError)
      throw foodError
    }

    const { data: symptoms, error: symptomsError } = await supabase
      .from('symptom_tracking')
      .select('symptom_type, severity, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)

    if (symptomsError) {
      console.error('Get symptoms for report error:', symptomsError)
      throw symptomsError
    }

    // 計算統計數據
    const totalCalories = foodEntries?.reduce((sum, entry) => sum + (entry.calories || 0), 0) || 0
    const averageMedicalScore = foodEntries?.length
      ? foodEntries.reduce((sum, entry) => sum + (entry.medical_score || 0), 0) / foodEntries.length
      : 0

    const symptomFrequency: Record<string, number> = {}
    symptoms?.forEach(symptom => {
      symptomFrequency[symptom.symptom_type] = (symptomFrequency[symptom.symptom_type] || 0) + 1
    })

    return {
      summary: {
        total_entries: foodEntries?.length || 0,
        total_calories: totalCalories,
        average_medical_score: averageMedicalScore,
        symptom_episodes: symptoms?.length || 0,
        most_common_symptoms: Object.entries(symptomFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([symptom, count]) => ({ symptom, count }))
      },
      analysis_data: {
        daily_calories: this.calculateDailyCalories(foodEntries || [], startDate, endDate),
        symptom_trends: this.calculateSymptomTrends(symptoms || []),
        food_correlation: this.calculateFoodCorrelation(foodEntries || [])
      }
    }
  }

  // 計算每日卡路里攝取
  private calculateDailyCalories(entries: any[], startDate: string, endDate: string): any[] {
    const dailyCalories: Record<string, number> = {}

    entries.forEach(entry => {
      const date = new Date(entry.consumed_at).toISOString().split('T')[0]
      dailyCalories[date] = (dailyCalories[date] || 0) + (entry.calories || 0)
    })

    return Object.entries(dailyCalories)
      .map(([date, calories]) => ({ date, calories }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // 計算症狀趨勢
  private calculateSymptomTrends(symptoms: any[]): any[] {
    const dailySymptoms: Record<string, { count: number; averageSeverity: number; severitySum: number }> = {}

    symptoms.forEach(symptom => {
      const date = new Date(symptom.recorded_at).toISOString().split('T')[0]
      if (!dailySymptoms[date]) {
        dailySymptoms[date] = { count: 0, averageSeverity: 0, severitySum: 0 }
      }
      dailySymptoms[date].count += 1
      dailySymptoms[date].severitySum += symptom.severity
    })

    // 計算平均嚴重度
    Object.keys(dailySymptoms).forEach(date => {
      const data = dailySymptoms[date]
      data.averageSeverity = data.count > 0 ? data.severitySum / data.count : 0
    })

    return Object.entries(dailySymptoms)
      .map(([date, data]) => ({
        date,
        count: data.count,
        averageSeverity: data.averageSeverity
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // 計算食物關聯性
  private calculateFoodCorrelation(entries: any[]): any[] {
    const correlations: Record<string, { medicalScoreSum: number; count: number; averageScore: number }> = {}

    entries.forEach(entry => {
      if (entry.medical_score !== null && entry.medical_score !== undefined) {
        if (!correlations[entry.food_name]) {
          correlations[entry.food_name] = { medicalScoreSum: 0, count: 0, averageScore: 0 }
        }
        correlations[entry.food_name].medicalScoreSum += entry.medical_score
        correlations[entry.food_name].count += 1
      }
    })

    // 計算平均醫療評分
    Object.keys(correlations).forEach(foodName => {
      const data = correlations[foodName]
      data.averageScore = data.count > 0 ? data.medicalScoreSum / data.count : 0
    })

    return Object.entries(correlations)
      .map(([foodName, data]) => ({
        food_name: foodName,
        average_medical_score: data.averageScore,
        frequency: data.count
      }))
      .sort((a, b) => b.average_medical_score - a.average_medical_score)
      .slice(0, 20) // 取前20個
  }
}

export const medicalReportsService = new SupabaseMedicalReportsService()