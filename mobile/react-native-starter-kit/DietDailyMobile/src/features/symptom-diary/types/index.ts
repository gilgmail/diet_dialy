// Symptom Diary Types
// Compatible with daily_symptom_entries table structure

export interface SymptomEntry {
  id: string
  user_id: string
  recorded_date: string // YYYY-MM-DD format
  recorded_at: string

  // UI-friendly fields (mapped from/to database fields)
  symptom_name: string
  severity: SeverityLevel
  duration_minutes?: number
  notes?: string

  // Core symptom scores (0-5 scale, for database compatibility)
  overall_health: number
  abdominal_pain: number
  diarrhea: number
  bloody_stool: number
  bloating: number

  // Additional data arrays (for database compatibility)
  additional_symptoms: string[]
  medications_taken: string[]
  triggers_identified: string[]

  created_at: string
  updated_at: string
}

export type SeverityLevel = 'mild' | 'moderate' | 'severe'

export interface CreateSymptomEntryInput {
  symptom_name: string
  severity: SeverityLevel
  duration_minutes?: number
  notes?: string
  occurred_at?: string // ISO date string
}

export interface UpdateSymptomEntryInput {
  symptom_name?: string
  severity?: SeverityLevel
  duration_minutes?: number
  notes?: string
  occurred_at?: string
}

export const SEVERITY_LEVELS: {
  value: SeverityLevel
  label: string
  icon: string
  color: string
}[] = [
  { value: 'mild', label: '輕微', icon: '😊', color: '#10B981' },
  { value: 'moderate', label: '中等', icon: '😐', color: '#F59E0B' },
  { value: 'severe', label: '嚴重', icon: '😣', color: '#EF4444' },
]

export const COMMON_SYMPTOMS = [
  { name: '腹痛', category: '消化系統', icon: '🤕' },
  { name: '腹脹', category: '消化系統', icon: '😖' },
  { name: '腹瀉', category: '消化系統', icon: '💩' },
  { name: '便秘', category: '消化系統', icon: '😣' },
  { name: '噁心', category: '消化系統', icon: '🤢' },
  { name: '嘔吐', category: '消化系統', icon: '🤮' },
  { name: '頭痛', category: '神經系統', icon: '🤕' },
  { name: '疲勞', category: '全身症狀', icon: '😴' },
  { name: '皮疹', category: '皮膚症狀', icon: '🔴' },
  { name: '搔癢', category: '皮膚症狀', icon: '😾' },
]
