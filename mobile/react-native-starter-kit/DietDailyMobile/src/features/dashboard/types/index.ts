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
  analysisMode?: string
  allFoodsOverview?: {
    high_risk_foods: string[]
    moderate_risk_foods: string[]
    watch_foods: string[]
    supportive_foods: string[]
    neutral_foods: string[]
  }
  foodsToMonitor?: Array<{ food: string; risk_level?: string; reasoning?: string[]; recommended_actions?: string[] }>
  supportiveFoods?: Array<{ food: string; benefits?: string[]; suggestions?: string[] }>
  reasoningTrace?: string[]
  evidenceNotes?: string[]
  dailyFoodBreakdown?: Array<{
    date?: string
    day_summary?: string
    meals?: Array<{
      meal?: string
      foods?: Array<{
        name?: string
        suitability?: string
        reasoning?: string[]
        symptom_links?: string[]
        notes?: string[]
      }>
    }>
  }>
  nextSteps?: {
    maintain?: string[]
    monitor?: string[]
    experiments?: string[]
  }
  analysisVersion?: string
  aiModel?: string
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
  analysisVersion?: string
  lastUpdated?: string
  foodKnowledge?: {
    missingCount: number
    staleCount: number
    warnings: string[]
    items: Array<{
      foodId: string
      foodName: string
      reason: 'missing' | 'stale'
      status: 'pending' | 'stale'
      lastUpdatedAt?: string | null
    }>
  }
}

export interface DashboardData {
  stats: DashboardStats
  weeklyTrend: WeeklyTrend
  insights: HealthInsight[]
  analysisHistory?: WeeklyAnalysisHistoryItem[]
  analysisHistoryTotal?: number
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
