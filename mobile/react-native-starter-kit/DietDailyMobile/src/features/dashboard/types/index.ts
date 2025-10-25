// Dashboard Types

export interface DashboardStats {
  // Food Entry Stats
  totalFoodEntries: number
  todayFoodEntries: number
  weekFoodEntries: number
  totalCalories: number
  todayCalories: number
  weekCalories: number

  // Symptom Entry Stats
  totalSymptomEntries: number
  todaySymptomEntries: number
  weekSymptomEntries: number
  mostCommonSymptom?: string
  averageSeverity?: number

  // Time Range Stats
  lastEntryDate?: string
  firstEntryDate?: string
}

export interface DailyStats {
  date: string
  foodCount: number
  symptomCount: number
  totalCalories: number
}

export interface MealDistribution {
  breakfast: number
  lunch: number
  dinner: number
  snack: number
}

export interface SeverityDistribution {
  mild: number
  moderate: number
  severe: number
}

export interface WeeklyTrend {
  week: DailyStats[]
  mealDistribution: MealDistribution
  severityDistribution: SeverityDistribution
}

export interface HealthInsight {
  id: string
  type: 'positive' | 'warning' | 'info'
  icon: string
  title: string
  description: string
  timestamp: string
}

export interface WeeklyAnalysisHistoryItem {
  id: string
  title: string
  createdAt: string
  startDate: string
  endDate: string
  summary: string
  pdfPath: string
  followUpActions: string[]
  foodsToMonitor?: Array<{ food: string; risk_level?: string; reasoning?: string[]; recommended_actions?: string[] }>
  supportiveFoods?: Array<{ food: string; benefits?: string[]; suggestions?: string[] }>
}

export type WeeklyAnalysisStatusState = 'pending' | 'in_progress' | 'completed' | 'failed'

export type WeeklyAnalysisStatusStepKey =
  | 'dataset'
  | 'server_processing'
  | 'server_response'
  | 'report_generation'

export interface WeeklyAnalysisStatusStep {
  key: WeeklyAnalysisStatusStepKey
  label: string
  state: WeeklyAnalysisStatusState
  detail?: string
  timestamp?: string
}

export interface WeeklyAnalysisStatus {
  datasetSummary: {
    foodEntries: number
    symptomEntries: number
    totalRecords: number
  }
  steps: WeeklyAnalysisStatusStep[]
  reportGenerated: boolean
  lastUpdated?: string
}

export interface DashboardData {
  stats: DashboardStats
  weeklyTrend: WeeklyTrend
  insights: HealthInsight[]
  analysisHistory?: WeeklyAnalysisHistoryItem[]
  analysisStatus?: WeeklyAnalysisStatus | null
}

// Chart Data Types
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface LineChartData {
  labels: string[]
  datasets: {
    data: number[]
    color?: string
  }[]
}

export interface PieChartData {
  segments: {
    value: number
    color: string
    label: string
  }[]
}
