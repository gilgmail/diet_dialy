/**
 * Diet Daily - Symptom Tracking System
 * 症狀追蹤和分析系統，用於醫療條件監控
 */

import type {
  SymptomEntry,
  SymptomTrend,
  Symptom,
  SymptomType,
  SymptomSeverity
} from '@/types/medical';

export interface SymptomAnalysis {
  weekly_trends: SymptomTrend[];
  food_correlations: FoodSymptomCorrelation[];
  severity_patterns: SeverityPattern[];
  recommendations: string[];
  alert_conditions: AlertCondition[];
}

export interface FoodSymptomCorrelation {
  food_id: string;
  food_name: string;
  symptom_types: SymptomType[];
  correlation_strength: number; // 0-1, higher = stronger correlation
  confidence_level: 'low' | 'medium' | 'high';
  occurrences: number;
  time_to_onset: number; // average hours from food to symptom
}

export interface SeverityPattern {
  symptom_type: SymptomType;
  time_of_day_pattern: Record<string, number>; // hour -> severity score
  day_of_week_pattern: Record<string, number>;
  severity_trend: 'improving' | 'stable' | 'worsening';
}

export interface AlertCondition {
  type: 'severity_spike' | 'new_pattern' | 'worsening_trend' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  created_at: Date;
}

/**
 * 症狀追蹤系統
 */
export class SymptomTracker {
  private symptomEntries: SymptomEntry[] = [];

  /**
   * 記錄新的症狀
   */
  recordSymptom(symptom: Omit<Symptom, 'id'>): string {
    const symptomWithId = {
      ...symptom,
      id: this.generateSymptomId()
    };

    // 查找或創建症狀記錄條目
    const today = new Date().toDateString();
    let entry = this.symptomEntries.find(
      e => e.recordedAt.toDateString() === today && e.userId === 'demo-user'
    );

    if (!entry) {
      entry = {
        id: this.generateEntryId(),
        userId: 'demo-user',
        symptoms: [],
        recordedAt: new Date(),
        severity_overall: symptom.severity
      };
      this.symptomEntries.push(entry);
    }

    entry.symptoms.push(symptomWithId);

    // 更新整體嚴重程度
    this.updateOverallSeverity(entry);

    return symptomWithId.id;
  }

  /**
   * 分析症狀趨勢
   */
  async analyzeSymptoms(days: number = 30): Promise<SymptomAnalysis> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentEntries = this.symptomEntries.filter(
      entry => entry.recordedAt >= cutoffDate
    );

    const foodCorrelations = await this.analyzeFoodHistoryCorrelations();

    return {
      weekly_trends: this.calculateWeeklyTrends(recentEntries),
      food_correlations: foodCorrelations,
      severity_patterns: this.analyzeSeverityPatterns(recentEntries),
      recommendations: this.generateRecommendations(recentEntries),
      alert_conditions: this.checkAlertConditions(recentEntries)
    };
  }

  /**
   * 計算每週症狀趨勢
   */
  private calculateWeeklyTrends(entries: SymptomEntry[]): SymptomTrend[] {
    const symptomGroups = this.groupSymptomsByType(entries);
    const trends: SymptomTrend[] = [];

    for (const [symptomType, symptoms] of Object.entries(symptomGroups)) {
      const frequency = symptoms.length / (entries.length || 1);
      const averageSeverity = symptoms.reduce((sum, s) => sum + s.severity_score, 0) / symptoms.length;

      // 分析改善趨勢
      const recentSymptoms = symptoms.slice(-7); // 最近7次
      const olderSymptoms = symptoms.slice(0, 7);

      let improvementTrend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (recentSymptoms.length > 0 && olderSymptoms.length > 0) {
        const recentAvg = recentSymptoms.reduce((sum, s) => sum + s.severity_score, 0) / recentSymptoms.length;
        const olderAvg = olderSymptoms.reduce((sum, s) => sum + s.severity_score, 0) / olderSymptoms.length;

        if (recentAvg < olderAvg - 0.5) improvementTrend = 'improving';
        else if (recentAvg > olderAvg + 0.5) improvementTrend = 'worsening';
      }

      trends.push({
        symptom_type: symptomType as SymptomType,
        frequency,
        average_severity: averageSeverity,
        common_triggers: this.findCommonTriggers(symptoms),
        improvement_trend: improvementTrend
      });
    }

    return trends;
  }

  /**
   * 尋找食物與症狀的關聯性（整合食物歷史資料）
   */
  private async findFoodCorrelations(entries: SymptomEntry[]): Promise<FoodSymptomCorrelation[]> {
    return this.analyzeFoodHistoryCorrelations();
  }

  /**
   * 分析食物歷史與症狀的關聯性
   */
  private async analyzeFoodHistoryCorrelations(): Promise<FoodSymptomCorrelation[]> {
    try {
      // 使用動態導入避免循環依賴
      const { FoodHistoryDatabaseManager } = await import('@/lib/food-history-database');
      const historyManager = FoodHistoryDatabaseManager.getInstance();
      const historyDb = await historyManager.loadDatabase();

      const correlations: Map<string, {
        foodName: string,
        symptoms: SymptomType[],
        occurrences: number,
        totalOnsetTime: number,
        severitySum: number
      }> = new Map();

      // 分析食物歷史中的症狀資料
      for (const historyEntry of historyDb.entries) {
        if (historyEntry.symptoms?.after && historyEntry.symptoms.after.length > 0) {
          const foodId = historyEntry.foodId;
          const foodName = historyEntry.foodData?.name_zh || historyEntry.foodData?.name_en || `食物-${foodId}`;
          const timeAfter = historyEntry.symptoms.timeAfter || 120; // 預設 2 小時
          const severity = historyEntry.symptoms.severity || 3;

          const existing = correlations.get(foodId) || {
            foodName,
            symptoms: [],
            occurrences: 0,
            totalOnsetTime: 0,
            severitySum: 0
          };

          // 將症狀字串轉換為 SymptomType
          for (const symptomStr of historyEntry.symptoms.after) {
            const symptomType = this.mapStringToSymptomType(symptomStr);
            if (symptomType && !existing.symptoms.includes(symptomType)) {
              existing.symptoms.push(symptomType);
            }
          }

          existing.occurrences++;
          existing.totalOnsetTime += timeAfter;
          existing.severitySum += severity;

          correlations.set(foodId, existing);
        }
      }

      // 轉換為最終格式
      return Array.from(correlations.entries()).map(([foodId, data]) => ({
        food_id: foodId,
        food_name: data.foodName,
        symptom_types: data.symptoms,
        correlation_strength: Math.min(data.occurrences / 5, 1), // 5次或以上認為強關聯
        confidence_level: (data.occurrences >= 3 ? 'high' : data.occurrences >= 2 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        occurrences: data.occurrences,
        time_to_onset: data.totalOnsetTime / data.occurrences
      })).sort((a, b) => b.correlation_strength - a.correlation_strength);
    } catch (error) {
      console.error('分析食物關聯性時發生錯誤:', error);
      return [];
    }
  }

  /**
   * 將症狀字串對應到 SymptomType
   */
  private mapStringToSymptomType(symptomStr: string): SymptomType | null {
    const symptomMap: Record<string, SymptomType> = {
      '噁心': 'nausea',
      '嘔吐': 'vomiting',
      '腹痛': 'abdominal_pain',
      '腹瀉': 'diarrhea',
      '便秘': 'constipation',
      '脹氣': 'bloating',
      '胃食道逆流': 'heartburn',
      '食慾不振': 'loss_of_appetite',
      '疲勞': 'fatigue',
      '頭痛': 'headache',
      '皮疹': 'rash',
      '搔癢': 'itching',
      '呼吸困難': 'difficulty_breathing',
      '關節疼痛': 'joint_pain',
      '肌肉疼痛': 'muscle_pain',
      '情緒變化': 'mood_changes',
      '失眠': 'insomnia',
      '其他': 'other'
    };

    const normalized = symptomStr.trim().toLowerCase();
    for (const [key, value] of Object.entries(symptomMap)) {
      if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
        return value;
      }
    }
    return null;
  }

  /**
   * 分析嚴重程度模式
   */
  private analyzeSeverityPatterns(entries: SymptomEntry[]): SeverityPattern[] {
    const patterns: SeverityPattern[] = [];
    const symptomGroups = this.groupSymptomsByType(entries);

    for (const [symptomType, symptoms] of Object.entries(symptomGroups)) {
      const timeOfDayPattern: Record<string, number> = {};
      const dayOfWeekPattern: Record<string, number> = {};

      // 分析時間模式
      for (const symptom of symptoms) {
        const hour = symptom.timestamp.getHours();
        const day = symptom.timestamp.getDay();

        timeOfDayPattern[hour.toString()] = (timeOfDayPattern[hour.toString()] || 0) + symptom.severity_score;
        dayOfWeekPattern[day.toString()] = (dayOfWeekPattern[day.toString()] || 0) + symptom.severity_score;
      }

      // 計算趨勢
      const recentSymptoms = symptoms.slice(-10);
      const olderSymptoms = symptoms.slice(0, 10);
      let trend: 'improving' | 'stable' | 'worsening' = 'stable';

      if (recentSymptoms.length > 0 && olderSymptoms.length > 0) {
        const recentAvg = recentSymptoms.reduce((sum, s) => sum + s.severity_score, 0) / recentSymptoms.length;
        const olderAvg = olderSymptoms.reduce((sum, s) => sum + s.severity_score, 0) / olderSymptoms.length;

        if (recentAvg < olderAvg - 1) trend = 'improving';
        else if (recentAvg > olderAvg + 1) trend = 'worsening';
      }

      patterns.push({
        symptom_type: symptomType as SymptomType,
        time_of_day_pattern: timeOfDayPattern,
        day_of_week_pattern: dayOfWeekPattern,
        severity_trend: trend
      });
    }

    return patterns;
  }

  /**
   * 生成建議
   */
  private generateRecommendations(entries: SymptomEntry[]): string[] {
    const recommendations: string[] = [];
    const symptomCounts = this.countSymptomTypes(entries);

    // 基於最常見症狀的建議
    const topSymptoms = Object.entries(symptomCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    for (const [symptomType, count] of topSymptoms) {
      switch (symptomType) {
        case 'nausea':
          recommendations.push('考慮少量多餐，避免空腹和過飽');
          recommendations.push('嘗試薑茶或薄荷茶緩解噁心');
          break;
        case 'abdominal_pain':
          recommendations.push('記錄疼痛與飲食的時間關係');
          recommendations.push('考慮溫熱敷腹部緩解不適');
          break;
        case 'diarrhea':
          recommendations.push('增加水分攝取，避免脫水');
          recommendations.push('選擇 BRAT 飲食（香蕉、米飯、蘋果泥、吐司）');
          break;
        case 'bloating':
          recommendations.push('注意可能的 FODMAP 食物觸發');
          recommendations.push('飯後適度散步幫助消化');
          break;
      }
    }

    // 通用建議
    if (entries.length > 0) {
      recommendations.push('持續記錄症狀有助於找出模式');
      recommendations.push('如症狀持續或惡化，請諮詢醫療專業人士');
    }

    return recommendations;
  }

  /**
   * 檢查警報條件
   */
  private checkAlertConditions(entries: SymptomEntry[]): AlertCondition[] {
    const alerts: AlertCondition[] = [];
    const recentEntries = entries.slice(-7); // 最近7天

    // 檢查嚴重程度激增
    const severitySpike = recentEntries.some(entry =>
      entry.symptoms.some(symptom => symptom.severity_score >= 8)
    );

    if (severitySpike) {
      alerts.push({
        type: 'severity_spike',
        severity: 'high',
        message: '檢測到高嚴重度症狀',
        recommendation: '建議聯繫醫療團隊評估',
        created_at: new Date()
      });
    }

    // 檢查惡化趨勢
    const trends = this.calculateWeeklyTrends(entries);
    const worseningTrends = trends.filter(t => t.improvement_trend === 'worsening');

    if (worseningTrends.length > 0) {
      alerts.push({
        type: 'worsening_trend',
        severity: 'medium',
        message: `檢測到症狀惡化趨勢：${worseningTrends.map(t => t.symptom_type).join(', ')}`,
        recommendation: '考慮調整飲食或藥物治療',
        created_at: new Date()
      });
    }

    return alerts;
  }

  /**
   * 輔助方法
   */
  private groupSymptomsByType(entries: SymptomEntry[]): Record<string, Symptom[]> {
    const groups: Record<string, Symptom[]> = {};

    for (const entry of entries) {
      for (const symptom of entry.symptoms) {
        if (!groups[symptom.type]) {
          groups[symptom.type] = [];
        }
        groups[symptom.type]?.push(symptom);
      }
    }

    return groups;
  }

  private countSymptomTypes(entries: SymptomEntry[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entry of entries) {
      for (const symptom of entry.symptoms) {
        counts[symptom.type] = (counts[symptom.type] || 0) + 1;
      }
    }

    return counts;
  }

  private findCommonTriggers(symptoms: Symptom[]): string[] {
    const triggers: Record<string, number> = {};

    for (const symptom of symptoms) {
      if (symptom.triggers) {
        for (const trigger of symptom.triggers) {
          triggers[trigger] = (triggers[trigger] || 0) + 1;
        }
      }
    }

    return Object.entries(triggers)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([trigger]) => trigger);
  }

  private updateOverallSeverity(entry: SymptomEntry): void {
    if (entry.symptoms.length === 0) return;

    const maxSeverity = Math.max(...entry.symptoms.map(s => s.severity_score));

    if (maxSeverity >= 8) entry.severity_overall = 'severe';
    else if (maxSeverity >= 5) entry.severity_overall = 'moderate';
    else entry.severity_overall = 'mild';
  }

  private generateSymptomId(): string {
    return `symptom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEntryId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 獲取症狀統計
   */
  getSymptomStats(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentEntries = this.symptomEntries.filter(
      entry => entry.recordedAt >= cutoffDate
    );

    const totalSymptoms = recentEntries.reduce((sum, entry) => sum + entry.symptoms.length, 0);
    const averageSeverity = recentEntries.length > 0 ?
      recentEntries.reduce((sum, entry) => {
        const entrySeverity = entry.symptoms.reduce((s, symptom) => s + symptom.severity_score, 0) / entry.symptoms.length;
        return sum + (isNaN(entrySeverity) ? 0 : entrySeverity);
      }, 0) / recentEntries.length : 0;

    return {
      total_entries: recentEntries.length,
      total_symptoms: totalSymptoms,
      average_severity: averageSeverity,
      symptom_free_days: days - recentEntries.length
    };
  }
}

// Export singleton instance
export const symptomTracker = new SymptomTracker();