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