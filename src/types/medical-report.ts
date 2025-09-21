// Medical Report Types for Diet Daily Week 2

import { ExtendedMedicalProfile } from './medical';

export interface MedicalReport {
  id: string;
  userId: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  period: {
    startDate: string;
    endDate: string;
    description: string; // e.g., "2024年9月第1週", "2024年9月"
  };
  medicalProfile: ExtendedMedicalProfile;

  // Summary Statistics
  summary: {
    totalFoods: number;
    uniqueFoods: number;
    averageMedicalScore: number;
    riskFactorExposure: number; // Percentage of high-risk foods
    symptomFrequency: number; // Average symptoms per day
    complianceScore: number; // How well following medical recommendations
  };

  // Detailed Analysis
  analysis: {
    topRiskFoods: Array<{
      foodName: string;
      frequency: number;
      riskScore: number;
      mainConcerns: string[];
    }>;

    safeFoods: Array<{
      foodName: string;
      frequency: number;
      medicalScore: number;
      benefits: string[];
    }>;

    riskFactorTrends: Array<{
      factor: string;
      frequency: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      recommendation: string;
    }>;

    symptomCorrelations: Array<{
      foodName: string;
      symptomType: string;
      correlation: number; // 0-1
      confidence: number; // 0-1
    }>;

    nutritionalBalance: {
      categories: Record<string, number>; // Percentage of each food category
      recommendations: string[];
    };
  };

  // Medical Insights
  medicalInsights: {
    keyFindings: string[];
    recommendations: string[];
    warningSignals: string[];
    positivePatterns: string[];
    nextSteps: string[];
  };

  // Doctor Discussion Points
  discussionPoints: {
    concernsToDiscuss: Array<{
      topic: string;
      details: string;
      urgency: 'low' | 'medium' | 'high';
    }>;

    questionsToAsk: string[];

    medicationInteractions: Array<{
      food: string;
      medication: string;
      interaction: string;
      severity: string;
    }>;

    lifestyleRecommendations: string[];
  };

  // Report Metadata
  metadata: {
    generatedAt: string;
    dataPoints: number; // Number of food entries analyzed
    analysisDepth: 'basic' | 'standard' | 'comprehensive';
    confidenceScore: number; // 0-1, based on data quality and quantity
    disclaimer: string;
  };
}

export interface MedicalReportRequest {
  userId: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  includeSymptoms?: boolean;
  analysisDepth?: 'basic' | 'standard' | 'comprehensive';
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    type: 'summary' | 'chart' | 'list' | 'text';
    required: boolean;
  }>;
  medicalConditions: string[]; // Which conditions this template is designed for
}

// Report export formats
export interface ReportExportOptions {
  format: 'pdf' | 'html' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  language: 'zh-TW' | 'en';
  template: 'doctor' | 'patient' | 'technical';
}

// Predefined report templates
export const REPORT_TEMPLATES = {
  IBD_WEEKLY: {
    id: 'ibd-weekly',
    name: 'IBD 週報告',
    description: '針對炎症性腸病患者的週度飲食分析',
    sections: [
      { id: 'summary', title: '週度摘要', type: 'summary' as const, required: true },
      { id: 'risk-foods', title: '高風險食物', type: 'list' as const, required: true },
      { id: 'safe-foods', title: '安全食物', type: 'list' as const, required: true },
      { id: 'symptoms', title: '症狀關聯', type: 'chart' as const, required: false },
      { id: 'recommendations', title: '醫療建議', type: 'text' as const, required: true }
    ],
    medicalConditions: ['ibd', 'crohns', 'ulcerative_colitis']
  },

  CHEMO_MONTHLY: {
    id: 'chemo-monthly',
    name: '化療月報告',
    description: '化療期間營養狀況月度評估',
    sections: [
      { id: 'summary', title: '月度摘要', type: 'summary' as const, required: true },
      { id: 'safety-analysis', title: '食品安全分析', type: 'chart' as const, required: true },
      { id: 'nutrition-balance', title: '營養均衡', type: 'chart' as const, required: true },
      { id: 'side-effects', title: '副作用管理', type: 'text' as const, required: true },
      { id: 'next-cycle', title: '下週期建議', type: 'list' as const, required: true }
    ],
    medicalConditions: ['chemotherapy', 'cancer_treatment']
  },

  ALLERGY_CUSTOM: {
    id: 'allergy-custom',
    name: '過敏追蹤報告',
    description: '過敏原暴露和反應追蹤分析',
    sections: [
      { id: 'summary', title: '期間摘要', type: 'summary' as const, required: true },
      { id: 'allergen-exposure', title: '過敏原暴露', type: 'chart' as const, required: true },
      { id: 'reaction-patterns', title: '反應模式', type: 'chart' as const, required: true },
      { id: 'avoidance-success', title: '避免成功率', type: 'summary' as const, required: true },
      { id: 'emergency-plan', title: '緊急應對計劃', type: 'text' as const, required: true }
    ],
    medicalConditions: ['food_allergy', 'anaphylaxis']
  }
} as const;

// Medical disclaimers
export const MEDICAL_DISCLAIMERS = {
  'zh-TW': '此報告僅供參考，不能取代專業醫療建議。請與您的醫療團隊討論任何飲食或治療決定。',
  'en': 'This report is for reference only and cannot replace professional medical advice. Please discuss any dietary or treatment decisions with your healthcare team.'
};

// Risk severity levels
export const RISK_LEVELS = {
  LOW: { value: 1, label: '低風險', color: 'green' },
  MODERATE: { value: 2, label: '中等風險', color: 'yellow' },
  HIGH: { value: 3, label: '高風險', color: 'orange' },
  CRITICAL: { value: 4, label: '嚴重風險', color: 'red' }
} as const;