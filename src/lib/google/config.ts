// Google Cloud Console configuration
import type { GoogleConfig, MedicalSpreadsheetStructure } from '@/types/google';

// Google OAuth 2.0 Configuration
export const GOOGLE_CONFIG: GoogleConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
  scopes: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ]
};

// Required scopes for medical data management
export const MEDICAL_SCOPES = {
  PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',
  EMAIL: 'https://www.googleapis.com/auth/userinfo.email',
  SHEETS: 'https://www.googleapis.com/auth/spreadsheets',
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  DRIVE_METADATA: 'https://www.googleapis.com/auth/drive.metadata.readonly'
};

// Medical spreadsheet templates for each condition
export const MEDICAL_SPREADSHEET_TEMPLATES: MedicalSpreadsheetStructure = {
  // IBD (Inflammatory Bowel Disease) tracking
  ibd_symptoms: {
    name: 'IBD Symptom Tracker',
    headers: [
      'Date',
      'Time',
      'Symptom Type',
      'Severity (1-10)',
      'Location',
      'Duration (minutes)',
      'Triggers',
      'Medications Taken',
      'Food Before Symptom',
      'Stress Level (1-10)',
      'Sleep Hours',
      'Notes',
      'Weather',
      'Menstrual Cycle Day',
      'Photo Reference'
    ],
    description: 'Track IBD symptoms including flares, pain, and bowel movements'
  },
  
  ibd_medications: {
    name: 'IBD Medication Log',
    headers: [
      'Date',
      'Time',
      'Medication Name',
      'Dosage',
      'Administration Route',
      'Reason for Taking',
      'Side Effects',
      'Effectiveness (1-10)',
      'Prescribing Doctor',
      'Next Dose Due',
      'Missed Doses',
      'Notes'
    ],
    description: 'Track IBD medications including biologics, steroids, and maintenance drugs'
  },

  // Chemotherapy tracking
  chemo_symptoms: {
    name: 'Chemotherapy Side Effects',
    headers: [
      'Date',
      'Time',
      'Cycle Number',
      'Days Since Treatment',
      'Symptom Type',
      'Severity (1-10)',
      'Duration (hours)',
      'Management Strategy',
      'Effectiveness of Management',
      'Functional Impact',
      'Mood Rating (1-10)',
      'Appetite Level (1-10)',
      'Energy Level (1-10)',
      'Nausea Level (1-10)',
      'Pain Level (1-10)',
      'Sleep Quality (1-10)',
      'Notes',
      'Doctor Notified'
    ],
    description: 'Track chemotherapy side effects and treatment response'
  },

  chemo_nutrition: {
    name: 'Chemotherapy Nutrition Log',
    headers: [
      'Date',
      'Time',
      'Meal Type',
      'Food Items',
      'Portion Size',
      'Calories Estimated',
      'Protein (g)',
      'Kept Down (Y/N)',
      'Nausea Before Eating (1-10)',
      'Nausea After Eating (1-10)',
      'Taste Changes',
      'Appetite Rating (1-10)',
      'Weight',
      'Supplements Taken',
      'Hydration (ml)',
      'Notes'
    ],
    description: 'Track nutrition intake during chemotherapy treatment'
  },

  // Allergy tracking
  allergy_reactions: {
    name: 'Allergic Reaction Log',
    headers: [
      'Date',
      'Time',
      'Allergen (Suspected)',
      'Exposure Route',
      'Reaction Type',
      'Severity Level',
      'Onset Time (minutes)',
      'Duration (minutes)',
      'Body Parts Affected',
      'Treatment Given',
      'Emergency Services Called',
      'Hospital Visit Required',
      'Epinephrine Used',
      'Recovery Time',
      'Environmental Factors',
      'Photos Taken',
      'Witnesses',
      'Notes'
    ],
    description: 'Track allergic reactions for pattern identification'
  },

  allergy_exposures: {
    name: 'Allergen Exposure Tracking',
    headers: [
      'Date',
      'Time',
      'Location',
      'Suspected Allergen',
      'Exposure Type',
      'Avoidance Successful (Y/N)',
      'Precautions Taken',
      'Reaction Occurred (Y/N)',
      'Severity if Reaction',
      'Lessons Learned',
      'Notes'
    ],
    description: 'Track allergen exposures and avoidance strategies'
  },

  // IBS tracking
  ibs_symptoms: {
    name: 'IBS Symptom Tracker',
    headers: [
      'Date',
      'Time',
      'Bowel Movement Type (Bristol Scale)',
      'Urgency (1-5)',
      'Completeness (1-5)',
      'Pain Level (1-10)',
      'Pain Location',
      'Bloating (1-10)',
      'Gas',
      'Mucus Present',
      'Blood Present',
      'Triggers Suspected',
      'Foods Eaten (Last 24h)',
      'Stress Level (1-10)',
      'Sleep Quality (1-10)',
      'Exercise Today',
      'Hormonal Changes',
      'Weather Changes',
      'Notes'
    ],
    description: 'Comprehensive IBS symptom tracking'
  },

  // Food diary for all conditions
  food_diary: {
    name: 'Medical Food Diary',
    headers: [
      'Date',
      'Time',
      'Meal Type',
      'Food Item',
      'Portion Size',
      'Preparation Method',
      'Ingredients',
      'Brand/Restaurant',
      'Calories (if known)',
      'Macronutrients',
      'Additives/Preservatives',
      'Organic (Y/N)',
      'Mood Before Eating',
      'Hunger Level (1-10)',
      'Satisfaction (1-10)',
      'Symptoms Within 2h',
      'Symptoms Within 4h',
      'Symptoms Within 24h',
      'Trigger Food Suspected',
      'Photo Reference',
      'Notes'
    ],
    description: 'Comprehensive food diary for medical condition management'
  },

  // Medication tracking for all conditions
  medications: {
    name: 'Medication Tracker',
    headers: [
      'Date',
      'Time',
      'Medication Name',
      'Generic Name',
      'Dosage',
      'Route',
      'Reason for Taking',
      'Prescribed By',
      'Batch/Lot Number',
      'Expiration Date',
      'Side Effects',
      'Effectiveness (1-10)',
      'Adherence (Y/N)',
      'Missed Doses',
      'Interactions',
      'Cost',
      'Pharmacy',
      'Insurance Coverage',
      'Notes'
    ],
    description: 'Comprehensive medication tracking for all conditions'
  }
};

// Google Drive folder structure for medical data
export const MEDICAL_DRIVE_STRUCTURE = {
  ROOT_FOLDER: 'Diet Daily Medical Data',
  FOLDERS: {
    PHOTOS: 'Medical Photos',
    REPORTS: 'Medical Reports',
    BACKUP: 'Data Backups',
    DOCUMENTS: 'Medical Documents',
    EMERGENCY: 'Emergency Information'
  },
  SUBFOLDERS: {
    PHOTOS: {
      SYMPTOMS: 'Symptom Photos',
      MEDICATIONS: 'Medication Photos',
      REACTIONS: 'Reaction Photos',
      FOOD: 'Food Photos',
      RASH: 'Skin Reactions'
    },
    REPORTS: {
      WEEKLY: 'Weekly Reports',
      MONTHLY: 'Monthly Reports',
      DOCTOR_VISITS: 'Doctor Visit Reports',
      LAB_RESULTS: 'Lab Results'
    }
  }
};

// Environment validation
if (typeof window !== 'undefined') {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable');
  }
  if (!process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI) {
    console.error('Missing NEXT_PUBLIC_GOOGLE_REDIRECT_URI environment variable');
  }
}

// Security constants
export const SECURITY_CONFIG = {
  TOKEN_STORAGE_KEY: 'diet_daily_google_tokens',
  ENCRYPTION_KEY_STORAGE: 'diet_daily_encryption_key',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_RETRY_ATTEMPTS: 3,
  OFFLINE_QUEUE_LIMIT: 1000
};