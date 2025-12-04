export type AdherenceStatus = 'taken' | 'skipped' | 'delayed' | 'missed'

export interface MedicationRegimenSummary {
  id: string
  custom_name?: string | null
  medication_name?: string | null
  default_dose?: string | null
  frequency_type: 'every_n_days' | 'prn' | 'cron'
  interval_days?: number | null
  route?: 'oral' | 'injection' | 'other' | null
  status: 'active' | 'paused' | 'ended'
}

export interface CreateMedicationAdministrationInput {
  regimen_id: string
  taken_at: string
  dose?: string
  route?: 'oral' | 'injection' | 'other'
  symptom_triggered?: boolean
  symptom_notes?: string
  adherence_status?: AdherenceStatus
  notes?: string
}

export interface CreateSleepSessionInput {
  planned_start_time?: string | null
  planned_duration_minutes?: number | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  is_main_sleep?: boolean
  quality_score?: number | null
  detail_payload?: Record<string, unknown>
}

export interface CreateActivitySessionInput {
  activity_type: string
  activity_title?: string
  intensity?: 'low' | 'moderate' | 'high' | string | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  calories?: number | null
  steps?: number | null
  notes?: string
  detail_payload?: Record<string, unknown>
}

export interface MedicationLogEntry {
  id: string
  taken_at: string
  dose?: string | null
  adherence_status: AdherenceStatus
  symptom_triggered: boolean
  notes?: string | null
  regimen_name: string
  regimen_route?: 'oral' | 'injection' | 'other' | null
}

export interface SleepSessionEntry {
  id: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  planned_start_time?: string | null
  planned_duration_minutes?: number | null
  quality_score?: number | null
  is_main_sleep: boolean
}

export interface ActivitySessionEntry {
  id: string
  activity_type: string
  activity_title?: string | null
  intensity?: string | null
  duration_minutes?: number | null
  start_time?: string | null
  end_time?: string | null
  notes?: string | null
}

export interface RecentActivityTemplate {
  id: string
  activity_type: string
  activity_title?: string | null
  intensity?: string | null
  duration_minutes?: number | null
}
