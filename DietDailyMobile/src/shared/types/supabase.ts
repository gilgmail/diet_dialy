// Supabase 數據庫類型定義
// 自動生成的類型，對應 schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      diet_daily_users: {
        Row: {
          id: string
          email: string
          google_id: string | null
          name: string | null
          avatar_url: string | null
          medical_conditions: Json
          allergies: Json
          dietary_restrictions: Json
          medications: Json
          timezone: string
          language: string
          preferences: Json
          is_admin: boolean
          admin_permissions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          google_id?: string | null
          name?: string | null
          avatar_url?: string | null
          medical_conditions?: Json
          allergies?: Json
          dietary_restrictions?: Json
          medications?: Json
          timezone?: string
          language?: string
          preferences?: Json
          is_admin?: boolean
          admin_permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          google_id?: string | null
          name?: string | null
          avatar_url?: string | null
          medical_conditions?: Json
          allergies?: Json
          dietary_restrictions?: Json
          medications?: Json
          timezone?: string
          language?: string
          preferences?: Json
          is_admin?: boolean
          admin_permissions?: Json
          created_at?: string
          updated_at?: string
        }
      }
      diet_daily_foods: {
        Row: {
          id: string
          name: string
          name_en: string | null
          brand: string | null
          category: string
          calories: number | null
          protein: number | null
          carbohydrates: number | null
          fat: number | null
          fiber: number | null
          sugar: number | null
          sodium: number | null
          nutrition_data: Json
          medical_scores: Json
          allergens: Json
          tags: Json
          properties: Json
          verification_status: 'pending' | 'approved' | 'rejected'
          verified_by: string | null
          verification_notes: string | null
          verified_at: string | null
          created_by: string | null
          is_custom: boolean
          // IBD AI 評分欄位
          ibd_score: number | null
          ibd_reasoning: Json
          ibd_recommendations: string | null
          ibd_confidence: number | null
          ibd_warning: string | null
          ibd_scored_at: string | null
          ibd_scorer_version: string | null
          ai_analysis: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_en?: string | null
          brand?: string | null
          category: string
          calories?: number | null
          protein?: number | null
          carbohydrates?: number | null
          fat?: number | null
          fiber?: number | null
          sugar?: number | null
          sodium?: number | null
          nutrition_data?: Json
          medical_scores?: Json
          allergens?: Json
          tags?: Json
          properties?: Json
          verification_status?: 'pending' | 'approved' | 'rejected'
          verified_by?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          created_by?: string | null
          is_custom?: boolean
          // IBD AI 評分欄位
          ibd_score?: number | null
          ibd_reasoning?: Json
          ibd_recommendations?: string | null
          ibd_confidence?: number | null
          ibd_warning?: string | null
          ibd_scored_at?: string | null
          ibd_scorer_version?: string | null
          ai_analysis?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_en?: string | null
          brand?: string | null
          category?: string
          calories?: number | null
          protein?: number | null
          carbohydrates?: number | null
          fat?: number | null
          fiber?: number | null
          sugar?: number | null
          sodium?: number | null
          nutrition_data?: Json
          medical_scores?: Json
          allergens?: Json
          tags?: Json
          properties?: Json
          verification_status?: 'pending' | 'approved' | 'rejected'
          verified_by?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          created_by?: string | null
          is_custom?: boolean
          // IBD AI 評分欄位
          ibd_score?: number | null
          ibd_reasoning?: Json
          ibd_recommendations?: string | null
          ibd_confidence?: number | null
          ibd_warning?: string | null
          ibd_scored_at?: string | null
          ibd_scorer_version?: string | null
          ai_analysis?: Json
          created_at?: string
          updated_at?: string
        }
      }
      food_entries: {
        Row: {
          id: string
          user_id: string
          food_id: string | null
          food_name: string
          food_category: string | null
          amount: number
          unit: string
          calories: number | null
          nutrition_data: Json
          medical_score: number | null
          medical_analysis: Json
          consumed_at: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          symptoms_before: Json
          symptoms_after: Json
          symptom_severity: number | null
          notes: string | null
          photo_url: string | null
          location: string | null
          sync_status: 'pending' | 'synced' | 'error'
          is_custom_food: boolean | null
          custom_food_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_id?: string | null
          food_name: string
          food_category?: string | null
          amount?: number
          unit?: string
          calories?: number | null
          nutrition_data?: Json
          medical_score?: number | null
          medical_analysis?: Json
          consumed_at: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          symptoms_before?: Json
          symptoms_after?: Json
          symptom_severity?: number | null
          notes?: string | null
          photo_url?: string | null
          location?: string | null
          sync_status?: 'pending' | 'synced' | 'error'
          is_custom_food?: boolean | null
          custom_food_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_id?: string | null
          food_name?: string
          food_category?: string | null
          amount?: number
          unit?: string
          calories?: number | null
          nutrition_data?: Json
          medical_score?: number | null
          medical_analysis?: Json
          consumed_at?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          symptoms_before?: Json
          symptoms_after?: Json
          symptom_severity?: number | null
          notes?: string | null
          photo_url?: string | null
          location?: string | null
          sync_status?: 'pending' | 'synced' | 'error'
          is_custom_food?: boolean | null
          custom_food_source?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          logged_at: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
          items: Json
          is_symptom_triggered: boolean
          notes: string | null
          photo_urls: string[]
          captured_via: 'manual' | 'ios_manual' | 'wearable' | 'import' | 'auto'
          analysis_status: 'pending' | 'completed' | 'error'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          logged_at?: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
          items?: Json
          is_symptom_triggered?: boolean
          notes?: string | null
          photo_urls?: string[]
          captured_via?: 'manual' | 'ios_manual' | 'wearable' | 'import' | 'auto'
          analysis_status?: 'pending' | 'completed' | 'error'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          logged_at?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
          items?: Json
          is_symptom_triggered?: boolean
          notes?: string | null
          photo_urls?: string[]
          captured_via?: 'manual' | 'ios_manual' | 'wearable' | 'import' | 'auto'
          analysis_status?: 'pending' | 'completed' | 'error'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      daily_wellness_log: {
        Row: {
          user_id: string
          log_date: string
          breakfast_time: string | null
          sleep_quality_score: number | null
          energy_level: number | null
          mood_score: number | null
          activity_minutes: number | null
          notes: string | null
          captured_via: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          log_date: string
          breakfast_time?: string | null
          sleep_quality_score?: number | null
          energy_level?: number | null
          mood_score?: number | null
          activity_minutes?: number | null
          notes?: string | null
          captured_via?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          log_date?: string
          breakfast_time?: string | null
          sleep_quality_score?: number | null
          energy_level?: number | null
          mood_score?: number | null
          activity_minutes?: number | null
          notes?: string | null
          captured_via?: string
          created_at?: string
          updated_at?: string
        }
      }
      sleep_sessions: {
        Row: {
          id: string
          user_id: string
          source: string
          source_record_id: string | null
          start_time: string | null
          end_time: string | null
          duration_minutes: number | null
          planned_start_time: string | null
          planned_duration_minutes: number | null
          is_main_sleep: boolean
          quality_score: number | null
          capture_method: string
          detail_payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source?: string
          source_record_id?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          planned_start_time?: string | null
          planned_duration_minutes?: number | null
          is_main_sleep?: boolean
          quality_score?: number | null
          capture_method?: string
          detail_payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source?: string
          source_record_id?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          planned_start_time?: string | null
          planned_duration_minutes?: number | null
          is_main_sleep?: boolean
          quality_score?: number | null
          capture_method?: string
          detail_payload?: Json
          created_at?: string
        }
      }
      activity_sessions: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          activity_title: string | null
          intensity: string | null
          start_time: string | null
          end_time: string | null
          duration_minutes: number | null
          calories: number | null
          steps: number | null
          source: string
          capture_method: string
          notes: string | null
          detail_payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          activity_title?: string | null
          intensity?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          calories?: number | null
          steps?: number | null
          source?: string
          capture_method?: string
          notes?: string | null
          detail_payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          activity_title?: string | null
          intensity?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
          calories?: number | null
          steps?: number | null
          source?: string
          capture_method?: string
          notes?: string | null
          detail_payload?: Json
          created_at?: string
        }
      }
      medication_catalog: {
        Row: {
          id: string
          name: string
          route: 'oral' | 'injection' | 'other'
          is_injection: boolean
          default_interval_days: number | null
          default_dosage: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          route?: 'oral' | 'injection' | 'other'
          is_injection?: boolean
          default_interval_days?: number | null
          default_dosage?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          route?: 'oral' | 'injection' | 'other'
          is_injection?: boolean
          default_interval_days?: number | null
          default_dosage?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medication_regimens: {
        Row: {
          id: string
          user_id: string
          medication_id: string | null
          custom_name: string | null
          route: 'oral' | 'injection' | 'other' | null
          frequency_type: 'every_n_days' | 'prn' | 'cron'
          interval_days: number | null
          cycle_anchor_date: string
          symptom_trigger_allowed: boolean
          default_dose: string | null
          status: 'active' | 'paused' | 'ended'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          medication_id?: string | null
          custom_name?: string | null
          route?: 'oral' | 'injection' | 'other' | null
          frequency_type: 'every_n_days' | 'prn' | 'cron'
          interval_days?: number | null
          cycle_anchor_date: string
          symptom_trigger_allowed?: boolean
          default_dose?: string | null
          status?: 'active' | 'paused' | 'ended'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          medication_id?: string | null
          custom_name?: string | null
          route?: 'oral' | 'injection' | 'other' | null
          frequency_type?: 'every_n_days' | 'prn' | 'cron'
          interval_days?: number | null
          cycle_anchor_date?: string
          symptom_trigger_allowed?: boolean
          default_dose?: string | null
          status?: 'active' | 'paused' | 'ended'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medication_administrations: {
        Row: {
          id: string
          regimen_id: string
          scheduled_at: string | null
          taken_at: string
          dose: string | null
          route: 'oral' | 'injection' | 'other' | null
          symptom_triggered: boolean
          symptom_notes: string | null
          adherence_status: 'taken' | 'skipped' | 'delayed' | 'missed'
          captured_via: 'manual' | 'reminder' | 'wearable' | 'imported'
          vitals_snapshot: Json
          side_effects: Json
          detail_payload: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          regimen_id: string
          scheduled_at?: string | null
          taken_at?: string
          dose?: string | null
          route?: 'oral' | 'injection' | 'other' | null
          symptom_triggered?: boolean
          symptom_notes?: string | null
          adherence_status?: 'taken' | 'skipped' | 'delayed' | 'missed'
          captured_via?: 'manual' | 'reminder' | 'wearable' | 'imported'
          vitals_snapshot?: Json
          side_effects?: Json
          detail_payload?: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          regimen_id?: string
          scheduled_at?: string | null
          taken_at?: string
          dose?: string | null
          route?: 'oral' | 'injection' | 'other' | null
          symptom_triggered?: boolean
          symptom_notes?: string | null
          adherence_status?: 'taken' | 'skipped' | 'delayed' | 'missed'
          captured_via?: 'manual' | 'reminder' | 'wearable' | 'imported'
          vitals_snapshot?: Json
          side_effects?: Json
          detail_payload?: Json
          notes?: string | null
          created_at?: string
        }
      }
      medication_cycles: {
        Row: {
          id: string
          regimen_id: string
          cycle_number: number
          cycle_start_date: string
          expected_next_date: string | null
          actual_next_date: string | null
          provider_notes: string | null
          status: 'scheduled' | 'completed' | 'skipped'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          regimen_id: string
          cycle_number: number
          cycle_start_date: string
          expected_next_date?: string | null
          actual_next_date?: string | null
          provider_notes?: string | null
          status?: 'scheduled' | 'completed' | 'skipped'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          regimen_id?: string
          cycle_number?: number
          cycle_start_date?: string
          expected_next_date?: string | null
          actual_next_date?: string | null
          provider_notes?: string | null
          status?: 'scheduled' | 'completed' | 'skipped'
          created_at?: string
          updated_at?: string
        }
      }
      user_reminders: {
        Row: {
          id: string
          user_id: string
          target_type: 'medication_regimen' | 'meal_logs' | 'sleep_sessions' | 'activity_sessions' | 'custom'
          target_id: string | null
          reminder_category: 'medication' | 'food' | 'sleep' | 'activity'
          title: string
          schedule_type: 'cron' | 'every_n_days' | 'relative_cycle'
          interval_days: number | null
          window_start: string | null
          window_end: string | null
          timezone: string
          lead_time_minutes: number | null
          snooze_minutes: number | null
          auto_dismiss_rule: 'existing_entry' | 'manual_only' | 'never'
          metadata: Json
          status: 'active' | 'paused' | 'archived'
          ios_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: 'medication_regimen' | 'meal_logs' | 'sleep_sessions' | 'activity_sessions' | 'custom'
          target_id?: string | null
          reminder_category: 'medication' | 'food' | 'sleep' | 'activity'
          title: string
          schedule_type: 'cron' | 'every_n_days' | 'relative_cycle'
          interval_days?: number | null
          window_start?: string | null
          window_end?: string | null
          timezone?: string
          lead_time_minutes?: number | null
          snooze_minutes?: number | null
          auto_dismiss_rule?: 'existing_entry' | 'manual_only' | 'never'
          metadata?: Json
          status?: 'active' | 'paused' | 'archived'
          ios_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: 'medication_regimen' | 'meal_logs' | 'sleep_sessions' | 'activity_sessions' | 'custom'
          target_id?: string | null
          reminder_category?: 'medication' | 'food' | 'sleep' | 'activity'
          title?: string
          schedule_type?: 'cron' | 'every_n_days' | 'relative_cycle'
          interval_days?: number | null
          window_start?: string | null
          window_end?: string | null
          timezone?: string
          lead_time_minutes?: number | null
          snooze_minutes?: number | null
          auto_dismiss_rule?: 'existing_entry' | 'manual_only' | 'never'
          metadata?: Json
          status?: 'active' | 'paused' | 'archived'
          ios_visible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reminder_logs: {
        Row: {
          id: string
          reminder_id: string
          status: 'sent' | 'delivered' | 'tapped' | 'dismissed' | 'skipped'
          deliver_at: string
          handled_at: string | null
          context: Json
          created_at: string
        }
        Insert: {
          id?: string
          reminder_id: string
          status: 'sent' | 'delivered' | 'tapped' | 'dismissed' | 'skipped'
          deliver_at?: string
          handled_at?: string | null
          context?: Json
          created_at?: string
        }
        Update: {
          id?: string
          reminder_id?: string
          status?: 'sent' | 'delivered' | 'tapped' | 'dismissed' | 'skipped'
          deliver_at?: string
          handled_at?: string | null
          context?: Json
          created_at?: string
        }
      }
      health_data_sources: {
        Row: {
          id: string
          user_id: string
          provider: string
          scopes: string[]
          status: 'connected' | 'revoked' | 'error' | 'syncing'
          last_synced_at: string | null
          sync_cursor: Json
          error_payload: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          scopes?: string[]
          status?: 'connected' | 'revoked' | 'error' | 'syncing'
          last_synced_at?: string | null
          sync_cursor?: Json
          error_payload?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          scopes?: string[]
          status?: 'connected' | 'revoked' | 'error' | 'syncing'
          last_synced_at?: string | null
          sync_cursor?: Json
          error_payload?: Json
          created_at?: string
          updated_at?: string
        }
      }
      healthkit_sleep_samples: {
        Row: {
          id: string
          user_id: string
          source_id: string
          payload: Json
          parsed: boolean
          sleep_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_id: string
          payload: Json
          parsed?: boolean
          sleep_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_id?: string
          payload?: Json
          parsed?: boolean
          sleep_session_id?: string | null
          created_at?: string
        }
      }
      healthkit_workouts: {
        Row: {
          id: string
          user_id: string
          source_id: string
          payload: Json
          parsed: boolean
          activity_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_id: string
          payload: Json
          parsed?: boolean
          activity_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_id?: string
          payload?: Json
          parsed?: boolean
          activity_session_id?: string | null
          created_at?: string
        }
      }
      medical_reports: {
        Row: {
          id: string
          user_id: string
          title: string
          report_type: 'daily' | 'weekly' | 'monthly' | 'custom'
          date_range_start: string
          date_range_end: string
          summary: Json
          analysis_data: Json
          recommendations: Json
          pdf_url: string | null
          file_size: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          report_type: 'daily' | 'weekly' | 'monthly' | 'custom'
          date_range_start: string
          date_range_end: string
          summary?: Json
          analysis_data?: Json
          recommendations?: Json
          pdf_url?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          report_type?: 'daily' | 'weekly' | 'monthly' | 'custom'
          date_range_start?: string
          date_range_end?: string
          summary?: Json
          analysis_data?: Json
          recommendations?: Json
          pdf_url?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      symptom_tracking: {
        Row: {
          id: string
          user_id: string
          symptom_type: string
          severity: number
          description: string | null
          recorded_at: string
          duration_minutes: number | null
          related_food_entry: string | null
          triggers: Json
          medications_taken: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symptom_type: string
          severity: number
          description?: string | null
          recorded_at: string
          duration_minutes?: number | null
          related_food_entry?: string | null
          triggers?: Json
          medications_taken?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symptom_type?: string
          severity?: number
          description?: string | null
          recorded_at?: string
          duration_minutes?: number | null
          related_food_entry?: string | null
          triggers?: Json
          medications_taken?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 便利的類型別名
export type User = Database['public']['Tables']['diet_daily_users']['Row']
export type Food = Database['public']['Tables']['diet_daily_foods']['Row']
export type FoodEntry = Database['public']['Tables']['food_entries']['Row']
export type MedicalReport = Database['public']['Tables']['medical_reports']['Row']
export type SymptomTracking = Database['public']['Tables']['symptom_tracking']['Row']

export type UserInsert = Database['public']['Tables']['diet_daily_users']['Insert']
export type FoodInsert = Database['public']['Tables']['diet_daily_foods']['Insert']
export type FoodEntryInsert = Database['public']['Tables']['food_entries']['Insert']
export type MedicalReportInsert = Database['public']['Tables']['medical_reports']['Insert']
export type SymptomTrackingInsert = Database['public']['Tables']['symptom_tracking']['Insert']

export type UserUpdate = Database['public']['Tables']['diet_daily_users']['Update']
export type FoodUpdate = Database['public']['Tables']['diet_daily_foods']['Update']
export type FoodEntryUpdate = Database['public']['Tables']['food_entries']['Update']
export type MedicalReportUpdate = Database['public']['Tables']['medical_reports']['Update']
export type SymptomTrackingUpdate = Database['public']['Tables']['symptom_tracking']['Update']

// 醫療狀況和過敏原的類型定義
export interface MedicalCondition {
  id: string
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  diagnosed_date?: string
  notes?: string
}

export interface Allergy {
  id: string
  name: string
  allergen_type: string
  reaction: string
  severity: 'mild' | 'moderate' | 'severe'
}

export interface DietaryRestriction {
  id: string
  type: string
  reason: string
  strict: boolean
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  start_date: string
  end_date?: string
  notes?: string
}

// 營養資訊類型
export interface NutritionData {
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

// 醫療評分類型
export interface MedicalScores {
  overall?: number
  inflammatory_risk?: number
  allergic_risk?: number
  digestive_risk?: number
  glycemic_impact?: number
  cardiovascular_risk?: number
}

// 症狀類型
export interface Symptom {
  type: string
  severity: number
  duration?: number
  notes?: string
}
