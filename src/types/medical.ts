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
  | 'abdominal_pain'
  | 'bloating'
  | 'diarrhea'
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