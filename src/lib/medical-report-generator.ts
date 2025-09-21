// Medical Report Generator for Diet Daily Week 2

import {
  MedicalReport,
  MedicalReportRequest,
  MEDICAL_DISCLAIMERS
} from '@/types/medical-report';
import { FoodHistoryEntry } from '@/types/history';
import { ExtendedMedicalProfile } from '@/types/medical';
import { foodHistoryDatabase } from '@/lib/food-history-database';

export class MedicalReportGenerator {
  private static reportStorage: { [userId: string]: MedicalReport[] } = {};

  static async generateReport(
    request: MedicalReportRequest,
    medicalProfile?: ExtendedMedicalProfile
  ): Promise<MedicalReport> {

    // For demo purposes, create a mock medical profile if not provided
    const defaultProfile: ExtendedMedicalProfile = {
      conditions: ['ibd'],
      allergies: [],
      medications: [],
      dietary_restrictions: ['low_fodmap'],
      goals: ['symptom_management'],
      severity_scores: { ibd: 7 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const profile = medicalProfile || defaultProfile;

    // Get food history for the period - direct file read for reliability
    let historyEntries: FoodHistoryEntry[] = [];
    try {
      const fs = await import('fs');
      const path = await import('path');
      const historyPath = path.join(process.cwd(), 'data', 'user-food-history.json');

      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        const allEntries = data.entries || [];

        // Filter by user and date range
        historyEntries = allEntries.filter((entry: FoodHistoryEntry) => {
          if (entry.userId !== request.userId) return false;

          const entryDate = new Date(entry.consumedAt);
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);

          return entryDate >= startDate && entryDate <= endDate;
        });
      }
    } catch (error) {
      console.error('Error reading food history:', error);
      // Fallback to original database method
      historyEntries = await foodHistoryDatabase.queryHistory({
        userId: request.userId,
        dateFrom: request.startDate,
        dateTo: request.endDate,
        includeSymptoms: request.includeSymptoms || false,
        limit: 1000
      });
    }

    if (historyEntries.length === 0) {
      throw new Error('指定期間內沒有食物記錄');
    }

    const analysisDepth = request.analysisDepth || 'standard';

    return {
      id: `report-${Date.now()}`,
      userId: request.userId,
      reportType: request.reportType,
      period: this.generatePeriodDescription(request.startDate, request.endDate, request.reportType),
      medicalProfile: profile,

      summary: this.generateSummary(historyEntries),
      analysis: this.generateAnalysis(historyEntries, profile, analysisDepth),
      medicalInsights: this.generateMedicalInsights(historyEntries, profile),
      discussionPoints: this.generateDiscussionPoints(historyEntries, profile),

      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: historyEntries.length,
        analysisDepth,
        confidenceScore: this.calculateConfidenceScore(historyEntries),
        disclaimer: MEDICAL_DISCLAIMERS['zh-TW']
      }
    };

    // Store report for user
    if (!this.reportStorage[request.userId]) {
      this.reportStorage[request.userId] = [];
    }
    this.reportStorage[request.userId].push(report);

    return report;
  }

  static async getReportsForUser(
    userId: string,
    options: {
      reportType?: 'weekly' | 'monthly' | 'custom';
      limit?: number;
    } = {}
  ): Promise<MedicalReport[]> {
    const userReports = this.reportStorage[userId] || [];

    let filteredReports = userReports;

    if (options.reportType) {
      filteredReports = userReports.filter(r => r.reportType === options.reportType);
    }

    // Sort by generation date (newest first)
    filteredReports.sort((a, b) =>
      new Date(b.metadata.generatedAt).getTime() - new Date(a.metadata.generatedAt).getTime()
    );

    if (options.limit) {
      filteredReports = filteredReports.slice(0, options.limit);
    }

    return filteredReports;
  }

  private static generatePeriodDescription(
    startDate: string,
    endDate: string,
    reportType: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let description = '';
    if (reportType === 'weekly') {
      description = `${start.getFullYear()}年${start.getMonth() + 1}月第${Math.ceil(start.getDate() / 7)}週`;
    } else if (reportType === 'monthly') {
      description = `${start.getFullYear()}年${start.getMonth() + 1}月`;
    } else {
      description = `${start.toLocaleDateString('zh-TW')} - ${end.toLocaleDateString('zh-TW')}`;
    }

    return {
      startDate,
      endDate,
      description
    };
  }

  private static generateSummary(historyEntries: FoodHistoryEntry[]) {
    const totalFoods = historyEntries.length;
    const uniqueFoods = new Set(historyEntries.map(entry => entry.foodId)).size;

    const averageMedicalScore = historyEntries.reduce(
      (sum, entry) => sum + (entry.medicalScore.score || (entry.medicalScore.score || entry.medicalScore.overall_score || 0) || 0),
      0
    ) / totalFoods;

    // Calculate risk factor exposure (foods with score < 3)
    const highRiskFoods = historyEntries.filter(entry => (entry.medicalScore.score || (entry.medicalScore.score || entry.medicalScore.overall_score || 0) || 0) < 3);
    const riskFactorExposure = (highRiskFoods.length / totalFoods) * 100;

    // Calculate symptom frequency
    const entriesWithSymptoms = historyEntries.filter(entry =>
      entry.symptoms && (entry.symptoms.before.length > 0 || entry.symptoms.after.length > 0)
    );
    const symptomFrequency = (entriesWithSymptoms.length / totalFoods) * 100;

    // Calculate compliance score (foods with score >= 4)
    const compliantFoods = historyEntries.filter(entry => (entry.medicalScore.score || (entry.medicalScore.score || entry.medicalScore.overall_score || 0) || 0) >= 4);
    const complianceScore = (compliantFoods.length / totalFoods) * 100;

    return {
      totalFoods,
      uniqueFoods,
      averageMedicalScore: Math.round(averageMedicalScore),
      riskFactorExposure: Math.round(riskFactorExposure),
      symptomFrequency: Math.round(symptomFrequency),
      complianceScore: Math.round(complianceScore)
    };
  }

  private static generateAnalysis(
    historyEntries: FoodHistoryEntry[],
    medicalProfile: ExtendedMedicalProfile,
    analysisDepth: string
  ) {
    // Top risk foods (score < 50)
    const riskFoods = historyEntries
      .filter(entry => (entry.medicalScore.score || entry.medicalScore.overall_score || 0) < 50)
      .reduce((acc, entry) => {
        const existing = acc.find(item => item.foodName === entry.foodData.name_zh);
        if (existing) {
          existing.frequency++;
        } else {
          acc.push({
            foodName: entry.foodData.name_zh,
            frequency: 1,
            riskScore: (entry.medicalScore.score || entry.medicalScore.overall_score || 0),
            mainConcerns: entry.foodData.medical_scores.ibd_risk_factors.slice(0, 3)
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // Safe foods (score >= 75)
    const safeFoods = historyEntries
      .filter(entry => (entry.medicalScore.score || entry.medicalScore.overall_score || 0) >= 75)
      .reduce((acc, entry) => {
        const existing = acc.find(item => item.foodName === entry.foodData.name_zh);
        if (existing) {
          existing.frequency++;
        } else {
          acc.push({
            foodName: entry.foodData.name_zh,
            frequency: 1,
            medicalScore: (entry.medicalScore.score || entry.medicalScore.overall_score || 0),
            benefits: this.generateBenefits(entry.foodData, medicalProfile)
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // Risk factor trends
    const riskFactorCounts: Record<string, number> = {};
    historyEntries.forEach(entry => {
      entry.foodData.medical_scores.ibd_risk_factors.forEach(factor => {
        riskFactorCounts[factor] = (riskFactorCounts[factor] || 0) + 1;
      });
    });

    const riskFactorTrends = Object.entries(riskFactorCounts)
      .map(([factor, frequency]) => ({
        factor,
        frequency,
        trend: 'stable' as const, // TODO: Implement actual trend analysis
        recommendation: this.generateRiskFactorRecommendation(factor, medicalProfile)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8);

    // Symptom correlations (basic implementation)
    const symptomCorrelations = this.generateSymptomCorrelations(historyEntries);

    // Nutritional balance
    const categoryCounts: Record<string, number> = {};
    historyEntries.forEach(entry => {
      categoryCounts[entry.foodData.category] = (categoryCounts[entry.foodData.category] || 0) + 1;
    });

    const totalCategoryEntries = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
    const categoryPercentages: Record<string, number> = {};
    Object.entries(categoryCounts).forEach(([category, count]) => {
      categoryPercentages[category] = Math.round((count / totalCategoryEntries) * 100);
    });

    return {
      topRiskFoods: riskFoods,
      safeFoods: safeFoods,
      riskFactorTrends: riskFactorTrends,
      symptomCorrelations: symptomCorrelations,
      nutritionalBalance: {
        categories: categoryPercentages,
        recommendations: this.generateNutritionalRecommendations(categoryPercentages, medicalProfile)
      }
    };
  }

  private static generateBenefits(foodData: any, medicalProfile: ExtendedMedicalProfile): string[] {
    const benefits: string[] = [];

    if (foodData.medical_scores.ibd_score >= 4) {
      benefits.push('IBD友善食物');
    }
    if (foodData.medical_scores.chemo_safety === 'safe') {
      benefits.push('化療期間安全');
    }
    if (foodData.medical_scores.fodmap_level === 'low') {
      benefits.push('低FODMAP');
    }
    if (foodData.medical_scores.major_allergens.length === 0) {
      benefits.push('無常見過敏原');
    }

    return benefits.slice(0, 3);
  }

  private static generateRiskFactorRecommendation(factor: string, medicalProfile: ExtendedMedicalProfile): string {
    const recommendations: Record<string, string> = {
      'high sodium': '減少攝取加工食品和調味料，選擇新鮮食材',
      'spicy food': 'IBD患者應避免辛辣食物，可能加重炎症',
      'high fat': '選擇健康油脂，避免油炸和高脂肪食物',
      'gluten': '考慮無麩質飲食，諮詢營養師建議',
      'dairy': '可嘗試乳糖不耐症檢測，選擇替代品',
      'processed food': '優先選擇天然、未加工的食物',
      'fried food': '改用蒸、煮、烤等健康烹飪方式'
    };

    return recommendations[factor] || '請諮詢醫療專業人員獲得個人化建議';
  }

  private static generateSymptomCorrelations(historyEntries: FoodHistoryEntry[]) {
    const correlations: any[] = [];

    historyEntries
      .filter(entry => entry.symptoms)
      .forEach(entry => {
        const allSymptoms = [
          ...(entry.symptoms?.before || []),
          ...(entry.symptoms?.after || [])
        ];

        allSymptoms.forEach(symptom => {
          const existing = correlations.find(item =>
            item.foodName === entry.foodData.name_zh && item.symptomType === symptom
          );

          if (existing) {
            existing.correlation = Math.min(existing.correlation + 0.1, 1.0);
            existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
          } else {
            correlations.push({
              foodName: entry.foodData.name_zh,
              symptomType: symptom,
              correlation: 0.6, // Base correlation
              confidence: 0.7   // Base confidence
            });
          }
        });
      });

    return correlations
      .filter(item => item.correlation > 0.5)
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 10);
  }

  private static generateNutritionalRecommendations(
    categories: Record<string, number>,
    medicalProfile: ExtendedMedicalProfile
  ): string[] {
    const recommendations: string[] = [];

    if (categories.vegetable < 30) {
      recommendations.push('建議增加蔬菜攝取量至每日30%以上');
    }
    if (categories.protein < 20) {
      recommendations.push('確保足夠的蛋白質攝取，建議佔每日攝取20%以上');
    }
    if (categories.grain > 40) {
      recommendations.push('考慮減少精製穀物，增加全穀類選擇');
    }
    if (categories.snack > 20) {
      recommendations.push('減少點心類食物，選擇營養密度更高的食物');
    }

    // Add condition-specific recommendations
    if (medicalProfile.primary_condition === 'ibd') {
      recommendations.push('IBD患者應特別注意纖維攝取，避免粗糙食物');
    }
    if (medicalProfile.primary_condition === 'chemotherapy') {
      recommendations.push('化療期間注重食品安全，避免生食和未消毒食品');
    }

    return recommendations.slice(0, 5);
  }

  private static generateMedicalInsights(
    historyEntries: FoodHistoryEntry[],
    medicalProfile: ExtendedMedicalProfile
  ) {
    const keyFindings: string[] = [];
    const recommendations: string[] = [];
    const warningSignals: string[] = [];
    const positivePatterns: string[] = [];
    const nextSteps: string[] = [];

    const avgScore = historyEntries.reduce((sum, entry) => sum + (entry.medicalScore.score || entry.medicalScore.overall_score || 0), 0) / historyEntries.length;

    // Key findings
    if (avgScore < 2.5) {
      keyFindings.push('整體飲食醫療評分偏低，存在較多風險因子');
    } else if (avgScore >= 3.5) {
      keyFindings.push('飲食選擇整體良好，符合醫療建議');
    }

    const riskFoodCount = historyEntries.filter(entry => (entry.medicalScore.score || entry.medicalScore.overall_score || 0) < 60).length;
    if (riskFoodCount > historyEntries.length * 0.3) {
      keyFindings.push(`${Math.round((riskFoodCount/historyEntries.length)*100)}% 的食物屬於高風險類別`);
    }

    // Recommendations
    recommendations.push('持續記錄飲食並監控症狀變化');
    recommendations.push('定期與醫療團隊討論飲食調整');
    if (medicalProfile.primary_condition === 'ibd') {
      recommendations.push('考慮採用低刺激性飲食計劃');
    }

    // Warning signals
    const highRiskFoods = historyEntries.filter(entry => (entry.medicalScore.score || entry.medicalScore.overall_score || 0) < 40);
    if (highRiskFoods.length > 0) {
      warningSignals.push(`發現 ${highRiskFoods.length} 項極高風險食物，建議立即調整`);
    }

    const symptomEntries = historyEntries.filter(entry => entry.symptoms);
    if (symptomEntries.length > historyEntries.length * 0.2) {
      warningSignals.push('症狀發生頻率較高，建議諮詢醫生');
    }

    // Positive patterns
    const safeFoods = historyEntries.filter(entry => (entry.medicalScore.score || entry.medicalScore.overall_score || 0) >= 75);
    if (safeFoods.length > historyEntries.length * 0.5) {
      positivePatterns.push('超過50%的食物選擇符合醫療建議');
    }

    if (historyEntries.some(entry => entry.recognitionConfidence)) {
      positivePatterns.push('積極使用智能識別功能，有助於準確記錄');
    }

    // Next steps
    nextSteps.push('繼續使用Diet Daily記錄飲食');
    nextSteps.push('將此報告與醫生分享討論');
    if (avgScore < 3) {
      nextSteps.push('重點改善高風險食物的選擇');
    }

    return {
      keyFindings,
      recommendations,
      warningSignals,
      positivePatterns,
      nextSteps
    };
  }

  private static generateDiscussionPoints(
    historyEntries: FoodHistoryEntry[],
    medicalProfile: ExtendedMedicalProfile
  ) {
    const concernsToDiscuss: any[] = [];
    const questionsToAsk: string[] = [];
    const medicationInteractions: any[] = [];
    const lifestyleRecommendations: string[] = [];

    // Generate concerns based on data
    const highRiskFoods = historyEntries.filter(entry => (entry.medicalScore.score || entry.medicalScore.overall_score || 0) < 40);
    if (highRiskFoods.length > 0) {
      concernsToDiscuss.push({
        topic: '高風險食物攝取',
        details: `發現 ${highRiskFoods.length} 次高風險食物攝取，可能影響病情控制`,
        urgency: 'high' as const
      });
    }

    const symptomEntries = historyEntries.filter(entry => entry.symptoms);
    if (symptomEntries.length > 0) {
      concernsToDiscuss.push({
        topic: '症狀與飲食關聯',
        details: `記錄到 ${symptomEntries.length} 次症狀，需要分析與特定食物的關聯性`,
        urgency: 'medium' as const
      });
    }

    // Questions to ask
    questionsToAsk.push('目前的飲食計劃是否需要調整？');
    questionsToAsk.push('是否需要進行特殊飲食測試？');
    questionsToAsk.push('症狀變化是否與季節或壓力相關？');
    questionsToAsk.push('是否需要補充特定營養素？');

    // Lifestyle recommendations
    lifestyleRecommendations.push('維持規律的用餐時間');
    lifestyleRecommendations.push('充分咀嚼，慢食有助消化');
    lifestyleRecommendations.push('記錄食物攝取和症狀反應');
    lifestyleRecommendations.push('保持適當的運動習慣');

    return {
      concernsToDiscuss,
      questionsToAsk,
      medicationInteractions,
      lifestyleRecommendations
    };
  }

  private static calculateConfidenceScore(historyEntries: FoodHistoryEntry[]): number {
    let score = 0.5; // Base score

    // More data points = higher confidence
    if (historyEntries.length >= 30) score += 0.3;
    else if (historyEntries.length >= 15) score += 0.2;
    else if (historyEntries.length >= 7) score += 0.1;

    // Photo recognition adds confidence
    const photoEntries = historyEntries.filter(entry => entry.recognitionConfidence);
    if (photoEntries.length > 0) {
      score += 0.1;
    }

    // Symptom tracking adds confidence
    const symptomEntries = historyEntries.filter(entry => entry.symptoms);
    if (symptomEntries.length > historyEntries.length * 0.1) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}

// Create a singleton instance for the generator
export const medicalReportGenerator = {
  generateReport: MedicalReportGenerator.generateReport.bind(MedicalReportGenerator),
  getReportsForUser: MedicalReportGenerator.getReportsForUser.bind(MedicalReportGenerator),
};

// Export convenience function
export async function generateMedicalReport(
  request: MedicalReportRequest,
  medicalProfile?: ExtendedMedicalProfile
): Promise<MedicalReport> {
  return MedicalReportGenerator.generateReport(request, medicalProfile);
}