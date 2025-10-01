// Medical condition types for IBD/化療/過敏/IBS patients
export type MedicalCondition =
  | 'ibd'           // Inflammatory Bowel Disease
  | 'chemotherapy'  // 化療 - Chemotherapy
  | 'allergy'       // 過敏 - Allergies
  | 'ibs'           // Irritable Bowel Syndrome
  | 'crohns'        // Crohn's Disease
  | 'uc'            // Ulcerative Colitis
  | 'celiac'        // Celiac Disease
  | 'other';

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export type SymptomType =
  | 'abdominal_pain'    // 腹痛
  | 'bloating'          // 脹氣
  | 'diarrhea'          // 腹瀉
  | 'bloody_stool'      // 血便
  | 'constipation'
  | 'nausea'
  | 'vomiting'
  | 'fatigue'
  | 'headache'
  | 'skin_reaction'
  | 'joint_pain'
  | 'mood_changes'
  | 'sleep_issues'
  | 'appetite_changes'
  | 'weight_changes'
  | 'fever'
  | 'dehydration'
  | 'mouth_sores'
  | 'taste_changes'
  | 'swallowing_difficulty'
  | 'heartburn'
  | 'gas'
  | 'cramping'
  | 'urgency'
  | 'allergy_symptoms'
  | 'immune_suppression'
  | 'loss_of_appetite'
  | 'rash'
  | 'itching'
  | 'difficulty_breathing'
  | 'muscle_pain'
  | 'insomnia'
  | 'other';

// Symptom tracking related types
export interface SymptomEntry {
  id: string;
  userId: string;
  symptoms: Symptom[];
  recordedAt: Date;
  triggeredBy?: string; // food ID that may have triggered symptoms
  severity_overall: SymptomSeverity;
  notes?: string;
  medication_taken?: string[];
}

export interface SymptomTrend {
  symptom_type: SymptomType;
  frequency: number; // times per week
  average_severity: number; // 1-10 scale
  common_triggers: string[];
  improvement_trend: 'improving' | 'stable' | 'worsening';
}

export interface Symptom {
  id: string;
  type: SymptomType;
  severity: SymptomSeverity;
  severity_score: number; // 1-10 numerical scale
  description?: string;
  timestamp: Date;
  duration?: number; // in minutes
  triggers?: string[];
  notes?: string;
  related_food_ids?: string[]; // foods consumed 2-24 hours before symptom
  medication_relief?: boolean;
  activity_impact: 'none' | 'mild' | 'moderate' | 'severe';
}

export interface MedicalProfile {
  id: string;
  userId: string;
  conditions: MedicalCondition[];
  allergies: string[];
  medications: Medication[];
  dietaryRestrictions: string[];
  emergencyContact?: EmergencyContact;
  healthcareProvider?: HealthcareProvider;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy?: string;
  purpose: string;
  sideEffects?: string[];
  isActive: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface HealthcareProvider {
  name: string;
  specialty: string;
  phone: string;
  email?: string;
  address?: string;
}

// Additional types for scoring engine integration
export interface FoodItem {
  id: string;
  name_zh: string;
  name_en: string;
  category: string;
  medical_scores: {
    ibd_score: 1 | 2 | 3 | 4;
    ibd_risk_factors: string[];
    chemo_safety: 'safe' | 'caution' | 'avoid';
    chemo_nutrition_type: 'high_protein' | 'high_calorie' | 'anti_nausea' | 'soft_texture' | 'neutral';
    fodmap_level: 'low' | 'medium' | 'high';
    major_allergens: string[];
    cross_contamination_risk: string[];
    texture: 'soft' | 'medium' | 'hard' | 'liquid';
    preparation_safety: 'raw_safe' | 'cooked_only' | 'sterile_required';
  };
}

// Extended MedicalProfile for scoring engine
export interface ExtendedMedicalProfile extends Omit<MedicalProfile, 'conditions'> {
  primary_condition: string;
  secondary_conditions?: string[];
  known_allergies?: string[];
  personal_triggers?: string[];
  current_phase?: 'remission' | 'active_flare' | 'mild_symptoms';
  current_side_effects?: string[];
  lactose_intolerant?: boolean;
  fiber_sensitive?: boolean;
  chemo_treatment_type?: 'mild' | 'moderate' | 'intensive';
  chemo_cycle_day?: number;
  allergy_severity_levels?: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
  ibs_subtype?: 'ibs_d' | 'ibs_c' | 'ibs_m' | 'ibs_u'; // diarrhea, constipation, mixed, unsubtyped
  fodmap_tolerance?: Record<string, 'low' | 'medium' | 'high'>;
}

// ==========================================
// DAILY SYMPTOM TRACKING TYPES
// ==========================================

// Core daily symptom scores (0-5 scale: 0=not filled, 1-5=severity)
export interface CoreSymptomScores {
  overall_health: 0 | 1 | 2 | 3 | 4 | 5;    // 健康: 0=not filled, 1=very poor, 5=excellent
  abdominal_pain: 0 | 1 | 2 | 3 | 4 | 5;    // 腹痛: 0=not filled, 1=none, 5=severe
  diarrhea: 0 | 1 | 2 | 3 | 4 | 5;          // 腹瀉: 0=not filled, 1=none, 5=severe
  bloody_stool: 0 | 1 | 2 | 3 | 4 | 5;      // 血便: 0=not filled, 1=none, 5=severe
  bloating: 0 | 1 | 2 | 3 | 4 | 5;          // 脹氣: 0=not filled, 1=none, 5=severe
}

// Additional symptom with severity
export interface AdditionalSymptom {
  type: SymptomType;
  severity: 0 | 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

// Context scores for comprehensive tracking
export interface ContextualScores {
  mood_score?: 1 | 2 | 3 | 4 | 5;           // 1=very poor, 5=excellent
  energy_level?: 1 | 2 | 3 | 4 | 5;         // 1=very low, 5=very high
  sleep_quality?: 1 | 2 | 3 | 4 | 5;        // 1=very poor, 5=excellent
  stress_level?: 1 | 2 | 3 | 4 | 5;         // 1=very low, 5=very high
}

// Daily symptom entry interface
// Stool Type Scale (大便形態分類) - 1 to 5 scale
export type BristolStoolType = 1 | 2 | 3 | 4 | 5;
// 1: 非常硬/便秘 (Very hard/Constipation)
// 2: 偏硬 (Somewhat hard)
// 3: 正常 (Normal) - DEFAULT
// 4: 偏軟 (Somewhat soft)
// 5: 水狀/腹瀉 (Watery/Diarrhea)

export interface DailySymptomEntry extends CoreSymptomScores, ContextualScores {
  id: string;
  user_id: string;
  recorded_date: string; // YYYY-MM-DD format
  recorded_at: Date;

  // Bowel movement tracking
  bowel_movement_count?: number; // 大便次數總計: 0-50, null if not recorded
  stool_type?: BristolStoolType; // Bristol Stool Scale: 1=硬塊, 4=正常, 7=水狀

  // Additional symptoms beyond core 5
  additional_symptoms: AdditionalSymptom[];

  // Medication and treatment tracking
  medications_taken: string[];
  medication_adherence?: 1 | 2 | 3 | 4 | 5; // 1=poor adherence, 5=perfect adherence

  // Environmental and lifestyle factors
  weather_conditions?: string;
  activity_level?: 'low' | 'moderate' | 'high';

  // User observations
  notes?: string;
  triggers_identified: string[];
  improvement_factors: string[];

  // Correlation data
  related_food_entries: string[]; // Food entry IDs from same day

  // Metadata
  entry_source: 'manual' | 'imported' | 'migrated';
  data_completeness_score: number; // 0.0 to 1.0

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Pattern analysis result types
export interface SymptomTrendData {
  average: number;
  trend_direction: 'improving' | 'stable' | 'worsening';
  stability: number; // 0.0 to 1.0 (1.0 = very stable)
  weekly_change: number;
  monthly_change: number;
}

export interface SymptomPatternAnalysis {
  id: string;
  user_id: string;
  analysis_period: 'weekly' | 'monthly' | 'quarterly';
  period_start: Date;
  period_end: Date;

  // Core symptom trends
  overall_health_trend: SymptomTrendData;
  abdominal_pain_trend: SymptomTrendData;
  diarrhea_trend: SymptomTrendData;
  bloody_stool_trend: SymptomTrendData;
  bloating_trend: SymptomTrendData;

  // Pattern insights
  symptom_frequency: Record<string, number>; // Frequency per period
  worst_days_pattern: Record<string, number>; // Day-of-week patterns
  best_days_pattern: Record<string, number>;

  // Correlation analysis
  food_correlations: Record<string, number>; // food_id -> correlation strength
  medication_effectiveness: Record<string, number>;
  lifestyle_correlations: Record<string, number>;

  // Risk and protective factors
  identified_triggers: string[];
  protective_factors: string[];

  // Statistical measures
  overall_stability_score: number; // 0.0 to 1.0
  improvement_rate: number; // -1.0 to 1.0

  // Confidence metrics
  data_quality_score: number;
  analysis_confidence: number;

  // Metadata
  analysis_method: 'statistical' | 'ai_enhanced' | 'hybrid';
  computed_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Alert configuration types
export type SymptomAlertType =
  | 'symptom_deterioration'
  | 'symptom_improvement'
  | 'pattern_change'
  | 'missed_entry'
  | 'threshold_breach'
  | 'correlation_detected';

export interface SymptomThreshold {
  symptom: keyof CoreSymptomScores;
  min?: number;
  max?: number;
  duration: number; // Days to trigger alert
}

export interface SymptomAlert {
  id: string;
  user_id: string;
  alert_type: SymptomAlertType;
  alert_name: string;
  description?: string;

  // Threshold configuration
  symptom_thresholds: SymptomThreshold[];
  severity_threshold: 1 | 2 | 3 | 4 | 5;
  duration_threshold: number; // Days to trigger

  // Alert conditions and delivery
  trigger_conditions: Record<string, any>; // Complex conditions
  notification_frequency: 'immediate' | 'daily' | 'weekly' | 'disabled';
  notification_channels: ('app' | 'email' | 'sms')[];

  // Status
  is_active: boolean;
  last_triggered_at?: Date;
  trigger_count: number;

  // Escalation
  escalation_rules: Record<string, any>;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface SymptomAlertHistory {
  id: string;
  alert_id: string;
  user_id: string;

  // Trigger details
  triggered_at: Date;
  trigger_symptom_entry?: string; // Daily entry ID
  trigger_reason: string;
  trigger_data: Record<string, any>;

  // Resolution
  acknowledged_at?: Date;
  resolved_at?: Date;
  resolution_action?: 'ignored' | 'consulted_doctor' | 'changed_medication' | 'lifestyle_change' | 'other';
  resolution_notes?: string;

  // Notification status
  notification_sent: boolean;
  notification_channels_used: string[];
  notification_delivery_status: Record<string, any>;

  // User feedback
  was_helpful?: boolean;
  user_feedback?: string;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

// Food correlation analysis types
export interface SymptomFoodCorrelation {
  id: string;
  user_id: string;
  food_id: string;

  // Correlation metrics
  correlation_type: 'positive' | 'negative' | 'neutral';
  correlation_strength: number; // -1.0 to 1.0
  confidence_level: number; // 0.0 to 1.0

  // Impact on specific symptoms
  symptom_impacts: Record<keyof CoreSymptomScores, number>;

  // Statistical data
  sample_size: number;
  time_lag_hours?: number; // Time between consumption and symptom impact

  // Analysis period
  analysis_start_date: Date;
  analysis_end_date: Date;

  // Food details (denormalized for performance)
  food_name: string;
  food_category?: string;

  // User validation
  user_confirmed?: boolean;
  user_notes?: string;

  // Metadata
  analysis_method: 'statistical' | 'ai_enhanced' | 'hybrid';
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

// Summary and dashboard types
export interface UserSymptomSummary {
  user_id: string;
  total_entries: number;
  avg_health_score: number;
  avg_abdominal_pain: number;
  avg_diarrhea: number;
  avg_bloody_stool: number;
  avg_bloating: number;
  last_entry_date: Date;
  first_entry_date: Date;
  tracking_streak: number; // Current consecutive days of tracking
}

export interface RecentSymptomTrend {
  user_id: string;
  recorded_date: Date;
  overall_health: number;
  total_symptom_score: number; // Sum of all symptom scores
  health_change: number; // Compared to previous day
  symptom_change: number; // Compared to previous day
  is_improving: boolean;
  is_deteriorating: boolean;
}

// API response types
export interface DailySymptomEntryResponse {
  success: boolean;
  message: string;
  data: DailySymptomEntry | null;
  error?: string;
}

export interface SymptomPatternResponse {
  success: boolean;
  message: string;
  data: SymptomPatternAnalysis | null;
  error?: string;
}

export interface SymptomCorrelationResponse {
  success: boolean;
  message: string;
  data: SymptomFoodCorrelation[] | null;
  error?: string;
}

export interface SymptomAlertResponse {
  success: boolean;
  message: string;
  data: SymptomAlert | SymptomAlert[] | null;
  error?: string;
}