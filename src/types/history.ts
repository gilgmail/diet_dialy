// Food History Tracking Types for Diet Daily Week 2

import { DatabaseFoodItem } from './food';
import { MedicalScore } from '@/lib/medical/scoring-engine';

export interface FoodHistoryEntry {
  id: string;
  userId: string;
  foodId: string;
  foodData: DatabaseFoodItem; // Snapshot of food data at time of consumption
  consumedAt: string; // ISO timestamp
  portion: {
    amount: number;
    unit: 'small' | 'medium' | 'large' | 'custom';
    customUnit?: string;
    customAmount?: number;
  };
  medicalScore: MedicalScore; // Medical evaluation at time of consumption
  notes?: string;
  photoUrl?: string; // If captured via photo recognition
  recognitionConfidence?: number; // 0-1 if from AI recognition
  location?: string;
  tags?: string[];
  symptoms?: {
    before: string[];
    after: string[];
    severity: 1 | 2 | 3 | 4 | 5;
    timeAfter?: number; // minutes after eating
  };
  createdAt: string;
  updatedAt: string;
}

export interface FoodHistoryDatabase {
  entries: FoodHistoryEntry[];
  metadata: {
    userId: string;
    totalEntries: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
    lastUpdated: string;
  };
}

export interface CreateHistoryEntryRequest {
  foodId: string;
  portion: FoodHistoryEntry['portion'];
  notes?: string;
  photoUrl?: string;
  recognitionConfidence?: number;
  location?: string;
  tags?: string[];
  symptoms?: FoodHistoryEntry['symptoms'];
}

export interface UpdateHistoryEntryRequest extends Partial<CreateHistoryEntryRequest> {
  id: string;
}

export interface FoodHistoryQuery {
  userId: string;
  dateFrom?: string;
  dateTo?: string;
  foodIds?: string[];
  tags?: string[];
  includeSymptoms?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'consumedAt' | 'createdAt' | 'medicalScore';
  sortOrder?: 'asc' | 'desc';
}

export interface FoodHistoryStats {
  totalEntries: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  averageMedicalScore: {
    overall: number;
    ibd: number;
    chemo: number;
    allergy: number;
  };
  mostFrequentFoods: Array<{
    foodId: string;
    foodName: string;
    count: number;
    averageScore: number;
  }>;
  riskFactorTrends: Array<{
    factor: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  symptomCorrelations: Array<{
    foodId: string;
    foodName: string;
    symptomFrequency: number;
    avgSeverity: number;
  }>;
}

export interface DailyFoodSummary {
  date: string;
  entries: FoodHistoryEntry[];
  totalEntries: number;
  averageMedicalScore: number;
  riskFactors: string[];
  allergens: string[];
  symptoms: {
    count: number;
    averageSeverity: number;
    types: string[];
  };
}

export interface WeeklyFoodReport {
  weekStart: string;
  weekEnd: string;
  dailySummaries: DailyFoodSummary[];
  weeklyStats: {
    totalFoods: number;
    uniqueFoods: number;
    averageScore: number;
    riskFactorFrequency: Record<string, number>;
    allergenFrequency: Record<string, number>;
    symptomTrends: Array<{
      day: string;
      count: number;
      severity: number;
    }>;
  };
  recommendations: string[];
  medicalInsights: string[];
}

// Portion size definitions
export const PORTION_SIZES = {
  small: { label: '小份', multiplier: 0.5 },
  medium: { label: '正常', multiplier: 1.0 },
  large: { label: '大份', multiplier: 1.5 },
  custom: { label: '自訂', multiplier: 1.0 }
} as const;

// Common symptoms for tracking
export const COMMON_SYMPTOMS = [
  '腹痛', '腹瀉', '便秘', '腹脹', '噁心', '嘔吐',
  '胃灼熱', '消化不良', '頭痛', '疲勞', '皮膚搔癢',
  '呼吸困難', '關節痛', '情緒變化'
] as const;

// Food tags for categorization
export const FOOD_TAGS = [
  '早餐', '午餐', '晚餐', '點心', '飲料', '外食',
  '自煮', '聚餐', '出差', '旅行', '工作餐', '應酬'
] as const;