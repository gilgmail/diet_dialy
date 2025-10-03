// Symptom Diary Types

export interface SymptomEntry {
  id: string
  user_id: string
  symptom_name: string
  severity: SeverityLevel
  duration_minutes?: number
  notes?: string
  occurred_at: string
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
