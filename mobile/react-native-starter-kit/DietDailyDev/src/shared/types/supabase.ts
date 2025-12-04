export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      correlation_analysis_cache: {
        Row: {
          analysis_options: Json
          cache_key: string
          correlation_data: Json
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_options?: Json
          cache_key: string
          correlation_data: Json
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_options?: Json
          cache_key?: string
          correlation_data?: Json
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "correlation_analysis_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correlation_analysis_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      correlation_analysis_settings: {
        Row: {
          analysis_frequency_days: number | null
          auto_analysis_enabled: boolean | null
          confidence_level: number | null
          created_at: string | null
          default_analysis_window_months: number | null
          exclude_insufficient_data: boolean | null
          id: string
          include_weak_correlations: boolean | null
          min_sample_size: number | null
          minimum_confidence_threshold: number | null
          notification_threshold: string | null
          preferred_risk_visualization: string | null
          preferred_time_windows: number[] | null
          require_minimum_confidence: boolean | null
          show_statistical_details: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_frequency_days?: number | null
          auto_analysis_enabled?: boolean | null
          confidence_level?: number | null
          created_at?: string | null
          default_analysis_window_months?: number | null
          exclude_insufficient_data?: boolean | null
          id?: string
          include_weak_correlations?: boolean | null
          min_sample_size?: number | null
          minimum_confidence_threshold?: number | null
          notification_threshold?: string | null
          preferred_risk_visualization?: string | null
          preferred_time_windows?: number[] | null
          require_minimum_confidence?: boolean | null
          show_statistical_details?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_frequency_days?: number | null
          auto_analysis_enabled?: boolean | null
          confidence_level?: number | null
          created_at?: string | null
          default_analysis_window_months?: number | null
          exclude_insufficient_data?: boolean | null
          id?: string
          include_weak_correlations?: boolean | null
          min_sample_size?: number | null
          minimum_confidence_threshold?: number | null
          notification_threshold?: string | null
          preferred_risk_visualization?: string | null
          preferred_time_windows?: number[] | null
          require_minimum_confidence?: boolean | null
          show_statistical_details?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "correlation_analysis_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correlation_analysis_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crowd_feedback_stats: {
        Row: {
          adjustment_confidence: number | null
          avg_accuracy_rating: number | null
          avg_user_score: number | null
          common_symptoms: Json | null
          food_id: string | null
          id: string
          last_updated: string | null
          score_accurate_count: number | null
          score_overestimate_count: number | null
          score_underestimate_count: number | null
          suggested_score_adjustment: number | null
          total_feedback_count: number | null
        }
        Insert: {
          adjustment_confidence?: number | null
          avg_accuracy_rating?: number | null
          avg_user_score?: number | null
          common_symptoms?: Json | null
          food_id?: string | null
          id?: string
          last_updated?: string | null
          score_accurate_count?: number | null
          score_overestimate_count?: number | null
          score_underestimate_count?: number | null
          suggested_score_adjustment?: number | null
          total_feedback_count?: number | null
        }
        Update: {
          adjustment_confidence?: number | null
          avg_accuracy_rating?: number | null
          avg_user_score?: number | null
          common_symptoms?: Json | null
          food_id?: string | null
          id?: string
          last_updated?: string | null
          score_accurate_count?: number | null
          score_overestimate_count?: number | null
          score_underestimate_count?: number | null
          suggested_score_adjustment?: number | null
          total_feedback_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crowd_feedback_stats_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: true
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crowd_feedback_stats_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: true
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_symptom_entries: {
        Row: {
          abdominal_pain: number | null
          activity_level: string | null
          additional_symptoms: Json | null
          bloating: number | null
          bloody_stool: number | null
          bowel_movement_count: number | null
          created_at: string | null
          data_completeness_score: number | null
          diarrhea: number | null
          energy_level: number | null
          entry_source: string | null
          id: string
          improvement_factors: string[] | null
          medication_adherence: number | null
          medications_taken: Json | null
          mood_score: number | null
          notes: string | null
          overall_health: number
          recorded_at: string
          recorded_date: string
          related_food_entries: string[] | null
          sleep_quality: number | null
          stool_type: number | null
          stress_level: number | null
          triggers_identified: string[] | null
          updated_at: string | null
          user_id: string
          weather_conditions: string | null
        }
        Insert: {
          abdominal_pain?: number | null
          activity_level?: string | null
          additional_symptoms?: Json | null
          bloating?: number | null
          bloody_stool?: number | null
          bowel_movement_count?: number | null
          created_at?: string | null
          data_completeness_score?: number | null
          diarrhea?: number | null
          energy_level?: number | null
          entry_source?: string | null
          id?: string
          improvement_factors?: string[] | null
          medication_adherence?: number | null
          medications_taken?: Json | null
          mood_score?: number | null
          notes?: string | null
          overall_health: number
          recorded_at?: string
          recorded_date: string
          related_food_entries?: string[] | null
          sleep_quality?: number | null
          stool_type?: number | null
          stress_level?: number | null
          triggers_identified?: string[] | null
          updated_at?: string | null
          user_id: string
          weather_conditions?: string | null
        }
        Update: {
          abdominal_pain?: number | null
          activity_level?: string | null
          additional_symptoms?: Json | null
          bloating?: number | null
          bloody_stool?: number | null
          bowel_movement_count?: number | null
          created_at?: string | null
          data_completeness_score?: number | null
          diarrhea?: number | null
          energy_level?: number | null
          entry_source?: string | null
          id?: string
          improvement_factors?: string[] | null
          medication_adherence?: number | null
          medications_taken?: Json | null
          mood_score?: number | null
          notes?: string | null
          overall_health?: number
          recorded_at?: string
          recorded_date?: string
          related_food_entries?: string[] | null
          sleep_quality?: number | null
          stool_type?: number | null
          stress_level?: number | null
          triggers_identified?: string[] | null
          updated_at?: string | null
          user_id?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_symptom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_symptom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      diet_daily_foods: {
        Row: {
          ai_analysis: Json | null
          ai_confidence_scores: Json | null
          ai_nutrient_gaps: Json
          allergens: string[] | null
          authenticity_verified: boolean | null
          brand: string | null
          calories: number | null
          carbohydrates: number | null
          category: string
          condition_scores: Json | null
          created_at: string | null
          created_by: string | null
          fat: number | null
          fiber: number | null
          food_properties: Json | null
          ibd_confidence: number | null
          ibd_reasoning: Json | null
          ibd_recommendations: string | null
          ibd_score: number | null
          ibd_scored_at: string | null
          ibd_scorer_version: string | null
          ibd_warning: string | null
          id: string
          is_custom: boolean | null
          name: string
          name_en: string | null
          nutrition_data: Json | null
          protein: number | null
          sodium: number | null
          sugar: number | null
          tags: string[] | null
          taiwan_origin: boolean | null
          trigger_analysis: Json | null
          updated_at: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          version: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_confidence_scores?: Json | null
          ai_nutrient_gaps?: Json
          allergens?: string[] | null
          authenticity_verified?: boolean | null
          brand?: string | null
          calories?: number | null
          carbohydrates?: number | null
          category: string
          condition_scores?: Json | null
          created_at?: string | null
          created_by?: string | null
          fat?: number | null
          fiber?: number | null
          food_properties?: Json | null
          ibd_confidence?: number | null
          ibd_reasoning?: Json | null
          ibd_recommendations?: string | null
          ibd_score?: number | null
          ibd_scored_at?: string | null
          ibd_scorer_version?: string | null
          ibd_warning?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
          name_en?: string | null
          nutrition_data?: Json | null
          protein?: number | null
          sodium?: number | null
          sugar?: number | null
          tags?: string[] | null
          taiwan_origin?: boolean | null
          trigger_analysis?: Json | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_confidence_scores?: Json | null
          ai_nutrient_gaps?: Json
          allergens?: string[] | null
          authenticity_verified?: boolean | null
          brand?: string | null
          calories?: number | null
          carbohydrates?: number | null
          category?: string
          condition_scores?: Json | null
          created_at?: string | null
          created_by?: string | null
          fat?: number | null
          fiber?: number | null
          food_properties?: Json | null
          ibd_confidence?: number | null
          ibd_reasoning?: Json | null
          ibd_recommendations?: string | null
          ibd_score?: number | null
          ibd_scored_at?: string | null
          ibd_scorer_version?: string | null
          ibd_warning?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
          name_en?: string | null
          nutrition_data?: Json | null
          protein?: number | null
          sodium?: number | null
          sugar?: number | null
          tags?: string[] | null
          taiwan_origin?: boolean | null
          trigger_analysis?: Json | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      diet_daily_foods_backup_before_cleanup: {
        Row: {
          ai_analysis: Json | null
          ai_confidence_scores: Json | null
          allergens: string[] | null
          authenticity_verified: boolean | null
          brand: string | null
          calories: number | null
          carbohydrates: number | null
          category: string | null
          condition_scores: Json | null
          created_at: string | null
          created_by: string | null
          fat: number | null
          fiber: number | null
          food_properties: Json | null
          id: string | null
          is_custom: boolean | null
          name: string | null
          name_en: string | null
          nutrition_data: Json | null
          protein: number | null
          sodium: number | null
          sugar: number | null
          tags: string[] | null
          taiwan_origin: boolean | null
          trigger_analysis: Json | null
          updated_at: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          version: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_confidence_scores?: Json | null
          allergens?: string[] | null
          authenticity_verified?: boolean | null
          brand?: string | null
          calories?: number | null
          carbohydrates?: number | null
          category?: string | null
          condition_scores?: Json | null
          created_at?: string | null
          created_by?: string | null
          fat?: number | null
          fiber?: number | null
          food_properties?: Json | null
          id?: string | null
          is_custom?: boolean | null
          name?: string | null
          name_en?: string | null
          nutrition_data?: Json | null
          protein?: number | null
          sodium?: number | null
          sugar?: number | null
          tags?: string[] | null
          taiwan_origin?: boolean | null
          trigger_analysis?: Json | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_confidence_scores?: Json | null
          allergens?: string[] | null
          authenticity_verified?: boolean | null
          brand?: string | null
          calories?: number | null
          carbohydrates?: number | null
          category?: string | null
          condition_scores?: Json | null
          created_at?: string | null
          created_by?: string | null
          fat?: number | null
          fiber?: number | null
          food_properties?: Json | null
          id?: string | null
          is_custom?: boolean | null
          name?: string | null
          name_en?: string | null
          nutrition_data?: Json | null
          protein?: number | null
          sodium?: number | null
          sugar?: number | null
          tags?: string[] | null
          taiwan_origin?: boolean | null
          trigger_analysis?: Json | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      diet_daily_users: {
        Row: {
          admin_permissions: Json | null
          allergies: Json | null
          avatar_url: string | null
          created_at: string | null
          dietary_restrictions: Json | null
          email: string
          google_id: string | null
          id: string
          is_admin: boolean | null
          language: string | null
          medical_conditions: Json | null
          medications: Json | null
          name: string | null
          preferences: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          admin_permissions?: Json | null
          allergies?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          dietary_restrictions?: Json | null
          email: string
          google_id?: string | null
          id: string
          is_admin?: boolean | null
          language?: string | null
          medical_conditions?: Json | null
          medications?: Json | null
          name?: string | null
          preferences?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_permissions?: Json | null
          allergies?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          dietary_restrictions?: Json | null
          email?: string
          google_id?: string | null
          id?: string
          is_admin?: boolean | null
          language?: string | null
          medical_conditions?: Json | null
          medications?: Json | null
          name?: string | null
          preferences?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      enhanced_correlation_results: {
        Row: {
          alternative_foods: Json | null
          analysis_date: string
          analysis_method: string | null
          analysis_period_end: string
          analysis_period_start: string
          bias_factors: Json | null
          confidence_score: number
          consumption_timing_advice: Json | null
          created_at: string | null
          data_sufficiency: string
          effect_size: string
          food_id: string
          id: string
          limitations: Json | null
          monitoring_advice: Json | null
          overall_risk_level: string
          portion_suggestions: Json | null
          recommendation: string
          sample_size: number
          statistical_significance: string
          symptom_impacts: Json
          time_window_results: Json
          updated_at: string | null
          user_confirmed: boolean | null
          user_id: string
          user_notes: string | null
          user_rating: number | null
        }
        Insert: {
          alternative_foods?: Json | null
          analysis_date?: string
          analysis_method?: string | null
          analysis_period_end: string
          analysis_period_start: string
          bias_factors?: Json | null
          confidence_score: number
          consumption_timing_advice?: Json | null
          created_at?: string | null
          data_sufficiency: string
          effect_size: string
          food_id: string
          id?: string
          limitations?: Json | null
          monitoring_advice?: Json | null
          overall_risk_level: string
          portion_suggestions?: Json | null
          recommendation: string
          sample_size: number
          statistical_significance: string
          symptom_impacts: Json
          time_window_results: Json
          updated_at?: string | null
          user_confirmed?: boolean | null
          user_id: string
          user_notes?: string | null
          user_rating?: number | null
        }
        Update: {
          alternative_foods?: Json | null
          analysis_date?: string
          analysis_method?: string | null
          analysis_period_end?: string
          analysis_period_start?: string
          bias_factors?: Json | null
          confidence_score?: number
          consumption_timing_advice?: Json | null
          created_at?: string | null
          data_sufficiency?: string
          effect_size?: string
          food_id?: string
          id?: string
          limitations?: Json | null
          monitoring_advice?: Json | null
          overall_risk_level?: string
          portion_suggestions?: Json | null
          recommendation?: string
          sample_size?: number
          statistical_significance?: string
          symptom_impacts?: Json
          time_window_results?: Json
          updated_at?: string | null
          user_confirmed?: boolean | null
          user_id?: string
          user_notes?: string | null
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_correlation_results_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_correlation_results_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_correlation_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_correlation_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fodmap_components: {
        Row: {
          confidence_level: number | null
          data_source: string | null
          excess_fructose: number | null
          fodmap_risk_level: string | null
          food_id: string | null
          fructans: number | null
          gos: number | null
          id: string
          lactose: number | null
          last_updated: string | null
          maltitol: number | null
          mannitol: number | null
          moderate_portion_size: number | null
          safe_portion_size: number | null
          sorbitol: number | null
          total_fodmap_score: number | null
          xylitol: number | null
        }
        Insert: {
          confidence_level?: number | null
          data_source?: string | null
          excess_fructose?: number | null
          fodmap_risk_level?: string | null
          food_id?: string | null
          fructans?: number | null
          gos?: number | null
          id?: string
          lactose?: number | null
          last_updated?: string | null
          maltitol?: number | null
          mannitol?: number | null
          moderate_portion_size?: number | null
          safe_portion_size?: number | null
          sorbitol?: number | null
          total_fodmap_score?: number | null
          xylitol?: number | null
        }
        Update: {
          confidence_level?: number | null
          data_source?: string | null
          excess_fructose?: number | null
          fodmap_risk_level?: string | null
          food_id?: string | null
          fructans?: number | null
          gos?: number | null
          id?: string
          lactose?: number | null
          last_updated?: string | null
          maltitol?: number | null
          mannitol?: number | null
          moderate_portion_size?: number | null
          safe_portion_size?: number | null
          sorbitol?: number | null
          total_fodmap_score?: number | null
          xylitol?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fodmap_components_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fodmap_components_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
        ]
      }
      fodmap_food_categories: {
        Row: {
          category_name: string
          common_fodmaps: Json | null
          created_at: string | null
          description: string | null
          general_risk_level: string | null
          ibd_considerations: string | null
          id: string
          preparation_tips: string | null
        }
        Insert: {
          category_name: string
          common_fodmaps?: Json | null
          created_at?: string | null
          description?: string | null
          general_risk_level?: string | null
          ibd_considerations?: string | null
          id?: string
          preparation_tips?: string | null
        }
        Update: {
          category_name?: string
          common_fodmaps?: Json | null
          created_at?: string | null
          description?: string | null
          general_risk_level?: string | null
          ibd_considerations?: string | null
          id?: string
          preparation_tips?: string | null
        }
        Relationships: []
      }
      fodmap_symptom_correlations: {
        Row: {
          evidence_level: string | null
          fodmap_type: string
          id: string
          individual_variation: string | null
          primary_symptoms: Json | null
          research_notes: string | null
          symptom_intensity: string | null
          threshold_dose: number | null
        }
        Insert: {
          evidence_level?: string | null
          fodmap_type: string
          id?: string
          individual_variation?: string | null
          primary_symptoms?: Json | null
          research_notes?: string | null
          symptom_intensity?: string | null
          threshold_dose?: number | null
        }
        Update: {
          evidence_level?: string | null
          fodmap_type?: string
          id?: string
          individual_variation?: string | null
          primary_symptoms?: Json | null
          research_notes?: string | null
          symptom_intensity?: string | null
          threshold_dose?: number | null
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          amount: number
          calories: number | null
          consumed_at: string
          created_at: string | null
          custom_food_source: string | null
          food_category: string | null
          food_id: string | null
          food_name: string
          id: string
          is_custom_food: boolean | null
          location: string | null
          meal_type: string | null
          medical_analysis: Json | null
          medical_score: number | null
          notes: string | null
          nutrition_data: Json | null
          photo_url: string | null
          symptom_severity: number | null
          symptoms_after: Json | null
          symptoms_before: Json | null
          sync_status: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          calories?: number | null
          consumed_at: string
          created_at?: string | null
          custom_food_source?: string | null
          food_category?: string | null
          food_id?: string | null
          food_name: string
          id?: string
          is_custom_food?: boolean | null
          location?: string | null
          meal_type?: string | null
          medical_analysis?: Json | null
          medical_score?: number | null
          notes?: string | null
          nutrition_data?: Json | null
          photo_url?: string | null
          symptom_severity?: number | null
          symptoms_after?: Json | null
          symptoms_before?: Json | null
          sync_status?: string
          unit?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          calories?: number | null
          consumed_at?: string
          created_at?: string | null
          custom_food_source?: string | null
          food_category?: string | null
          food_id?: string | null
          food_name?: string
          id?: string
          is_custom_food?: boolean | null
          location?: string | null
          meal_type?: string | null
          medical_analysis?: Json | null
          medical_score?: number | null
          notes?: string | null
          nutrition_data?: Json | null
          photo_url?: string | null
          symptom_severity?: number | null
          symptoms_after?: Json | null
          symptoms_before?: Json | null
          sync_status?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
        ]
      }
      food_history_entries: {
        Row: {
          consumed_at: string
          created_at: string | null
          data_quality_score: number | null
          entry_source: string | null
          food_id: string
          id: string
          location: string | null
          meal_type: string | null
          notes: string | null
          photo_url: string | null
          portion_amount: number | null
          portion_size: string | null
          portion_unit: string | null
          post_meal_symptoms: Json | null
          pre_meal_symptoms: Json | null
          recognition_confidence: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consumed_at: string
          created_at?: string | null
          data_quality_score?: number | null
          entry_source?: string | null
          food_id: string
          id?: string
          location?: string | null
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          portion_amount?: number | null
          portion_size?: string | null
          portion_unit?: string | null
          post_meal_symptoms?: Json | null
          pre_meal_symptoms?: Json | null
          recognition_confidence?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string
          created_at?: string | null
          data_quality_score?: number | null
          entry_source?: string | null
          food_id?: string
          id?: string
          location?: string | null
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          portion_amount?: number | null
          portion_size?: string | null
          portion_unit?: string | null
          post_meal_symptoms?: Json | null
          pre_meal_symptoms?: Json | null
          recognition_confidence?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_history_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_history_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_history_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_history_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ibd_patient_profiles: {
        Row: {
          avoided_foods: Json | null
          current_phase: string | null
          diagnosis_date: string | null
          dietary_restrictions: Json | null
          fiber_tolerance: string | null
          ibd_type: string | null
          id: string
          personal_triggers: Json | null
          safe_foods: Json | null
          symptom_sensitivity: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avoided_foods?: Json | null
          current_phase?: string | null
          diagnosis_date?: string | null
          dietary_restrictions?: Json | null
          fiber_tolerance?: string | null
          ibd_type?: string | null
          id?: string
          personal_triggers?: Json | null
          safe_foods?: Json | null
          symptom_sensitivity?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avoided_foods?: Json | null
          current_phase?: string | null
          diagnosis_date?: string | null
          dietary_restrictions?: Json | null
          fiber_tolerance?: string | null
          ibd_type?: string | null
          id?: string
          personal_triggers?: Json | null
          safe_foods?: Json | null
          symptom_sensitivity?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ibd_patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ibd_patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ibd_scoring_config: {
        Row: {
          config_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          prompt_template: string
          scoring_criteria: Json
          updated_at: string | null
        }
        Insert: {
          config_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          prompt_template: string
          scoring_criteria: Json
          updated_at?: string | null
        }
        Update: {
          config_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          prompt_template?: string
          scoring_criteria?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      ibd_scoring_history: {
        Row: {
          confidence: number | null
          food_id: string
          food_snapshot: Json
          id: string
          reasoning: Json
          recommendations: string | null
          score: number
          scored_at: string | null
          scorer_version: string | null
          warning: string | null
        }
        Insert: {
          confidence?: number | null
          food_id: string
          food_snapshot: Json
          id?: string
          reasoning?: Json
          recommendations?: string | null
          score: number
          scored_at?: string | null
          scorer_version?: string | null
          warning?: string | null
        }
        Update: {
          confidence?: number | null
          food_id?: string
          food_snapshot?: Json
          id?: string
          reasoning?: Json
          recommendations?: string | null
          score?: number
          scored_at?: string | null
          scorer_version?: string | null
          warning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ibd_scoring_history_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ibd_scoring_history_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_condition_configs: {
        Row: {
          ai_scoring_weights: Json
          condition_code: string
          condition_name: string
          condition_name_zh: string
          created_at: string | null
          id: string
          is_active: boolean | null
          scoring_criteria: Json
          updated_at: string | null
        }
        Insert: {
          ai_scoring_weights?: Json
          condition_code: string
          condition_name: string
          condition_name_zh: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          scoring_criteria?: Json
          updated_at?: string | null
        }
        Update: {
          ai_scoring_weights?: Json
          condition_code?: string
          condition_name?: string
          condition_name_zh?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          scoring_criteria?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          avoided_foods: string[] | null
          condition_details: Json
          dietary_restrictions: string[] | null
          id: string
          medical_conditions: Json
          personal_triggers: string[] | null
          preferences: Json | null
          safe_foods: string[] | null
          symptom_sensitivity: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avoided_foods?: string[] | null
          condition_details?: Json
          dietary_restrictions?: string[] | null
          id?: string
          medical_conditions?: Json
          personal_triggers?: string[] | null
          preferences?: Json | null
          safe_foods?: string[] | null
          symptom_sensitivity?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avoided_foods?: string[] | null
          condition_details?: Json
          dietary_restrictions?: string[] | null
          id?: string
          medical_conditions?: Json
          personal_triggers?: string[] | null
          preferences?: Json | null
          safe_foods?: string[] | null
          symptom_sensitivity?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scoring_improvement_suggestions: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          current_score: number | null
          expert_decision: string | null
          expert_id: string | null
          expert_notes: string | null
          food_id: string | null
          id: string
          implementation_status: string | null
          implemented_at: string | null
          improvement_reason: string
          reviewed_at: string | null
          reviewed_by_expert: boolean | null
          suggested_score: number | null
          suggestion_source: string | null
          supporting_evidence: Json | null
          user_id: string | null
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          current_score?: number | null
          expert_decision?: string | null
          expert_id?: string | null
          expert_notes?: string | null
          food_id?: string | null
          id?: string
          implementation_status?: string | null
          implemented_at?: string | null
          improvement_reason: string
          reviewed_at?: string | null
          reviewed_by_expert?: boolean | null
          suggested_score?: number | null
          suggestion_source?: string | null
          supporting_evidence?: Json | null
          user_id?: string | null
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          current_score?: number | null
          expert_decision?: string | null
          expert_id?: string | null
          expert_notes?: string | null
          food_id?: string | null
          id?: string
          implementation_status?: string | null
          implemented_at?: string | null
          improvement_reason?: string
          reviewed_at?: string | null
          reviewed_by_expert?: boolean | null
          suggested_score?: number | null
          suggestion_source?: string | null
          supporting_evidence?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_improvement_suggestions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_improvement_suggestions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "scoring_improvement_suggestions_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_improvement_suggestions_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_improvement_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_improvement_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      symptom_alert_history: {
        Row: {
          acknowledged_at: string | null
          alert_id: string
          created_at: string | null
          id: string
          notification_channels_used: Json | null
          notification_delivery_status: Json | null
          notification_sent: boolean | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          trigger_data: Json | null
          trigger_reason: string
          trigger_symptom_entry: string | null
          triggered_at: string | null
          updated_at: string | null
          user_feedback: string | null
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_id: string
          created_at?: string | null
          id?: string
          notification_channels_used?: Json | null
          notification_delivery_status?: Json | null
          notification_sent?: boolean | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          trigger_data?: Json | null
          trigger_reason: string
          trigger_symptom_entry?: string | null
          triggered_at?: string | null
          updated_at?: string | null
          user_feedback?: string | null
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_id?: string
          created_at?: string | null
          id?: string
          notification_channels_used?: Json | null
          notification_delivery_status?: Json | null
          notification_sent?: boolean | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          trigger_data?: Json | null
          trigger_reason?: string
          trigger_symptom_entry?: string | null
          triggered_at?: string | null
          updated_at?: string | null
          user_feedback?: string | null
          user_id?: string
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "symptom_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_alert_history_trigger_symptom_entry_fkey"
            columns: ["trigger_symptom_entry"]
            isOneToOne: false
            referencedRelation: "daily_symptom_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_alert_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_alert_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      symptom_alerts: {
        Row: {
          alert_name: string
          alert_type: string
          created_at: string | null
          description: string | null
          duration_threshold: number | null
          escalation_rules: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          notification_channels: Json | null
          notification_frequency: string | null
          severity_threshold: number | null
          symptom_thresholds: Json
          trigger_conditions: Json
          trigger_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_name: string
          alert_type: string
          created_at?: string | null
          description?: string | null
          duration_threshold?: number | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          notification_channels?: Json | null
          notification_frequency?: string | null
          severity_threshold?: number | null
          symptom_thresholds: Json
          trigger_conditions: Json
          trigger_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_name?: string
          alert_type?: string
          created_at?: string | null
          description?: string | null
          duration_threshold?: number | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          notification_channels?: Json | null
          notification_frequency?: string | null
          severity_threshold?: number | null
          symptom_thresholds?: Json
          trigger_conditions?: Json
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      symptom_food_correlations: {
        Row: {
          analysis_end_date: string
          analysis_method: string | null
          analysis_start_date: string
          confidence_level: number
          correlation_strength: number
          correlation_type: string
          created_at: string | null
          food_category: string | null
          food_id: string | null
          food_name: string
          id: string
          last_updated: string | null
          sample_size: number
          symptom_impacts: Json
          time_lag_hours: number | null
          updated_at: string | null
          user_confirmed: boolean | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          analysis_end_date: string
          analysis_method?: string | null
          analysis_start_date: string
          confidence_level: number
          correlation_strength: number
          correlation_type: string
          created_at?: string | null
          food_category?: string | null
          food_id?: string | null
          food_name: string
          id?: string
          last_updated?: string | null
          sample_size: number
          symptom_impacts: Json
          time_lag_hours?: number | null
          updated_at?: string | null
          user_confirmed?: boolean | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          analysis_end_date?: string
          analysis_method?: string | null
          analysis_start_date?: string
          confidence_level?: number
          correlation_strength?: number
          correlation_type?: string
          created_at?: string | null
          food_category?: string | null
          food_id?: string | null
          food_name?: string
          id?: string
          last_updated?: string | null
          sample_size?: number
          symptom_impacts?: Json
          time_lag_hours?: number | null
          updated_at?: string | null
          user_confirmed?: boolean | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_food_correlations_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_food_correlations_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_food_correlations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_food_correlations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      symptom_patterns: {
        Row: {
          abdominal_pain_trend: Json
          analysis_confidence: number | null
          analysis_method: string | null
          analysis_period: string
          best_days_pattern: Json | null
          bloating_trend: Json
          bloody_stool_trend: Json
          computed_at: string | null
          created_at: string | null
          data_quality_score: number | null
          diarrhea_trend: Json
          food_correlations: Json | null
          id: string
          identified_triggers: Json | null
          improvement_rate: number | null
          lifestyle_correlations: Json | null
          medication_effectiveness: Json | null
          overall_health_trend: Json
          overall_stability_score: number | null
          period_end: string
          period_start: string
          protective_factors: Json | null
          symptom_frequency: Json
          updated_at: string | null
          user_id: string
          worst_days_pattern: Json | null
        }
        Insert: {
          abdominal_pain_trend: Json
          analysis_confidence?: number | null
          analysis_method?: string | null
          analysis_period: string
          best_days_pattern?: Json | null
          bloating_trend: Json
          bloody_stool_trend: Json
          computed_at?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          diarrhea_trend: Json
          food_correlations?: Json | null
          id?: string
          identified_triggers?: Json | null
          improvement_rate?: number | null
          lifestyle_correlations?: Json | null
          medication_effectiveness?: Json | null
          overall_health_trend: Json
          overall_stability_score?: number | null
          period_end: string
          period_start: string
          protective_factors?: Json | null
          symptom_frequency: Json
          updated_at?: string | null
          user_id: string
          worst_days_pattern?: Json | null
        }
        Update: {
          abdominal_pain_trend?: Json
          analysis_confidence?: number | null
          analysis_method?: string | null
          analysis_period?: string
          best_days_pattern?: Json | null
          bloating_trend?: Json
          bloody_stool_trend?: Json
          computed_at?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          diarrhea_trend?: Json
          food_correlations?: Json | null
          id?: string
          identified_triggers?: Json | null
          improvement_rate?: number | null
          lifestyle_correlations?: Json | null
          medication_effectiveness?: Json | null
          overall_health_trend?: Json
          overall_stability_score?: number | null
          period_end?: string
          period_start?: string
          protective_factors?: Json | null
          symptom_frequency?: Json
          updated_at?: string | null
          user_id?: string
          worst_days_pattern?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_feedback_quality: {
        Row: {
          consistent_feedback_rate: number | null
          contribution_level: string | null
          credibility_score: number | null
          detailed_feedback_count: number | null
          expert_verified: boolean | null
          feedback_implementation_count: number | null
          feedback_points: number | null
          helpful_feedback_count: number | null
          id: string
          last_updated: string | null
          total_feedback_submitted: number | null
          user_id: string | null
        }
        Insert: {
          consistent_feedback_rate?: number | null
          contribution_level?: string | null
          credibility_score?: number | null
          detailed_feedback_count?: number | null
          expert_verified?: boolean | null
          feedback_implementation_count?: number | null
          feedback_points?: number | null
          helpful_feedback_count?: number | null
          id?: string
          last_updated?: string | null
          total_feedback_submitted?: number | null
          user_id?: string | null
        }
        Update: {
          consistent_feedback_rate?: number | null
          contribution_level?: string | null
          credibility_score?: number | null
          detailed_feedback_count?: number | null
          expert_verified?: boolean | null
          feedback_implementation_count?: number | null
          feedback_points?: number | null
          helpful_feedback_count?: number | null
          id?: string
          last_updated?: string | null
          total_feedback_submitted?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_quality_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_quality_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_fodmap_tolerance: {
        Row: {
          confidence: number | null
          created_at: string | null
          determined_by: string | null
          fodmap_type: string
          id: string
          last_tested: string | null
          safe_amount: number | null
          tolerance_level: string | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          determined_by?: string | null
          fodmap_type: string
          id?: string
          last_tested?: string | null
          safe_amount?: number | null
          tolerance_level?: string | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          determined_by?: string | null
          fodmap_type?: string
          id?: string
          last_tested?: string | null
          safe_amount?: number | null
          tolerance_level?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_fodmap_tolerance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_fodmap_tolerance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_food_feedback: {
        Row: {
          ai_predicted_score: number | null
          alternative_suggestions: string | null
          consumed_at: string
          consumed_with_other_foods: boolean | null
          current_ibd_phase: string | null
          detailed_feedback: string | null
          feedback_completeness: number | null
          feedback_submitted_at: string | null
          food_id: string | null
          id: string
          medication_changes: boolean | null
          other_foods_consumed: string | null
          portion_consumed: number | null
          preparation_method: string | null
          score_accuracy_rating: number | null
          sleep_quality: number | null
          stress_level: number | null
          symptom_duration: number | null
          symptom_onset_time: number | null
          symptom_severity: number | null
          symptoms_experienced: Json | null
          user_actual_experience: number | null
          user_id: string | null
          would_eat_again: boolean | null
        }
        Insert: {
          ai_predicted_score?: number | null
          alternative_suggestions?: string | null
          consumed_at: string
          consumed_with_other_foods?: boolean | null
          current_ibd_phase?: string | null
          detailed_feedback?: string | null
          feedback_completeness?: number | null
          feedback_submitted_at?: string | null
          food_id?: string | null
          id?: string
          medication_changes?: boolean | null
          other_foods_consumed?: string | null
          portion_consumed?: number | null
          preparation_method?: string | null
          score_accuracy_rating?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          symptom_duration?: number | null
          symptom_onset_time?: number | null
          symptom_severity?: number | null
          symptoms_experienced?: Json | null
          user_actual_experience?: number | null
          user_id?: string | null
          would_eat_again?: boolean | null
        }
        Update: {
          ai_predicted_score?: number | null
          alternative_suggestions?: string | null
          consumed_at?: string
          consumed_with_other_foods?: boolean | null
          current_ibd_phase?: string | null
          detailed_feedback?: string | null
          feedback_completeness?: number | null
          feedback_submitted_at?: string | null
          food_id?: string | null
          id?: string
          medication_changes?: boolean | null
          other_foods_consumed?: string | null
          portion_consumed?: number | null
          preparation_method?: string | null
          score_accuracy_rating?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          symptom_duration?: number | null
          symptom_onset_time?: number | null
          symptom_severity?: number | null
          symptoms_experienced?: Json | null
          user_actual_experience?: number | null
          user_id?: string | null
          would_eat_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_food_feedback_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_feedback_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "fodmap_analysis_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      fodmap_analysis_view: {
        Row: {
          category: string | null
          confidence_level: number | null
          excess_fructose: number | null
          fodmap_risk_level: string | null
          fructans: number | null
          ibd_considerations: string | null
          id: string | null
          lactose: number | null
          name: string | null
          preparation_tips: string | null
          safe_portion_size: number | null
          total_fodmap_score: number | null
          total_polyols: number | null
        }
        Relationships: []
      }
      high_safety_foods: {
        Row: {
          category: string | null
          condition_scores: Json | null
          name: string | null
          tags: string[] | null
          taiwan_origin: boolean | null
        }
        Insert: {
          category?: string | null
          condition_scores?: Json | null
          name?: string | null
          tags?: string[] | null
          taiwan_origin?: boolean | null
        }
        Update: {
          category?: string | null
          condition_scores?: Json | null
          name?: string | null
          tags?: string[] | null
          taiwan_origin?: boolean | null
        }
        Relationships: []
      }
      ibd_scoring_stats: {
        Row: {
          average_confidence: number | null
          average_score: number | null
          cautious_foods: number | null
          moderate_foods: number | null
          recommended_foods: number | null
          scored_foods: number | null
          total_foods: number | null
          unsuitable_foods: number | null
        }
        Relationships: []
      }
      recent_correlation_activity: {
        Row: {
          analysis_date: string | null
          confidence_score: number | null
          created_at: string | null
          food_category: string | null
          food_name: string | null
          overall_risk_level: string | null
          recommendation: string | null
          user_confirmed: boolean | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_correlation_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_correlation_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recent_symptom_trends: {
        Row: {
          overall_health: number | null
          prev_health: number | null
          prev_symptoms: number | null
          recorded_date: string | null
          total_symptom_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_symptom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_symptom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      taiwan_foods_summary: {
        Row: {
          avg_ibd_score: number | null
          avg_ibs_score: number | null
          category: string | null
          food_count: number | null
        }
        Relationships: []
      }
      user_correlation_overview: {
        Row: {
          avg_confidence: number | null
          cached_analyses: number | null
          email: string | null
          high_risk_foods: number | null
          last_analysis_date: string | null
          moderate_risk_foods: number | null
          safe_foods: number | null
          total_analyses: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_symptom_summary: {
        Row: {
          avg_abdominal_pain: number | null
          avg_bloating: number | null
          avg_bloody_stool: number | null
          avg_diarrhea: number | null
          avg_health_score: number | null
          first_entry_date: string | null
          last_entry_date: string | null
          total_entries: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_symptom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "diet_daily_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_symptom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_correlation_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      analyze_food_scoring_accuracy: {
        Args: { p_food_id?: string }
        Returns: {
          accuracy_rate: number
          avg_user_score: number
          confidence_level: string
          current_score: number
          feedback_count: number
          food_id: string
          food_name: string
          recommended_adjustment: number
        }[]
      }
      batch_update_ibd_scores: { Args: { food_scores: Json }; Returns: number }
      calculate_ibd_score: {
        Args: {
          p_cooking_method: string
          p_fat_content: number
          p_fiber_content: string
          p_processing_level: string
          p_trigger_factors: Json
        }
        Returns: Json
      }
      calculate_multi_condition_score: {
        Args: { p_conditions: string[]; p_nutrition: Json; p_properties: Json }
        Returns: Json
      }
      cleanup_expired_correlation_cache: { Args: never; Returns: number }
      get_feedback_quality_report: {
        Args: never
        Returns: {
          avg_feedback_per_user: number
          high_quality_feedback_rate: number
          implemented_suggestions: number
          total_improvement_suggestions: number
          total_users_with_feedback: number
        }[]
      }
      get_fodmap_stats: {
        Args: never
        Returns: {
          avg_fodmap_score: number
          high_fodmap_foods: number
          low_fodmap_foods: number
          medium_fodmap_foods: number
          total_foods_with_fodmap: number
        }[]
      }
      get_foods_by_ibd_score: {
        Args: { target_score: number }
        Returns: {
          category: string
          ibd_confidence: number
          ibd_recommendations: string
          ibd_score: number
          id: string
          name: string
        }[]
      }
      get_personal_fodmap_recommendations: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          food_name: string
          personal_risk_level: string
          reason: string
          recommended_portion: number
        }[]
      }
      get_user_correlation_summary: {
        Args: { user_id_param: string }
        Returns: {
          average_confidence: number
          high_risk_foods: number
          last_analysis_date: string
          moderate_risk_foods: number
          recommendations_pending: number
          safe_foods: number
          total_foods_analyzed: number
        }[]
      }
      get_user_food_entries_by_date: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          amount: number
          calories: number
          consumed_at: string
          created_at: string
          food_category: string
          food_id: string
          food_name: string
          id: string
          location: string
          meal_type: string
          medical_analysis: Json
          medical_score: number
          notes: string
          nutrition_data: Json
          photo_url: string
          symptom_severity: number
          symptoms_after: Json
          symptoms_before: Json
          sync_status: string
          unit: string
          updated_at: string
          user_id: string
        }[]
      }
      increment_cache_hit_count: {
        Args: { cache_key_param: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenient aliases for frequently used tables
export type DietDailyUserRow = Tables<'diet_daily_users'>
export type DietDailyUserInsert = TablesInsert<'diet_daily_users'>
export type FoodEntryRow = Tables<'food_entries'>
export type FoodEntryInsert = TablesInsert<'food_entries'>
export type FoodEntryUpdate = TablesUpdate<'food_entries'>
export type DailySymptomEntryRow = Tables<'daily_symptom_entries'>
export type DailySymptomEntryInsert = TablesInsert<'daily_symptom_entries'>
export type DailySymptomEntryUpdate = TablesUpdate<'daily_symptom_entries'>

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
