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
  | 'other';

export interface Symptom {
  id: string;
  type: SymptomType;
  severity: SymptomSeverity;
  description?: string;
  timestamp: Date;
  duration?: number; // in minutes
  triggers?: string[];
  notes?: string;
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
    fodmap_level: 'low' | 'medium' | 'high';
    major_allergens: string[];
  };
}

// Extended MedicalProfile for scoring engine
export interface ExtendedMedicalProfile extends Omit<MedicalProfile, 'conditions'> {
  primary_condition: string;
  known_allergies?: string[];
  personal_triggers?: string[];
  current_phase?: 'remission' | 'active_flare' | 'mild_symptoms';
  current_side_effects?: string[];
  lactose_intolerant?: boolean;
  fiber_sensitive?: boolean;
}