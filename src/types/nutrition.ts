// Nutrition and food tracking types for medical dietary management

export type MacroNutrient = 'protein' | 'carbohydrate' | 'fat' | 'fiber';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage' | 'medication';
export type FoodCategory =
  | 'grains'
  | 'vegetables'
  | 'fruits'
  | 'proteins'
  | 'dairy'
  | 'fats_oils'
  | 'beverages'
  | 'processed'
  | 'supplements'
  | 'other';

export interface NutrientInfo {
  calories?: number;
  protein?: number;      // grams
  carbohydrates?: number; // grams
  fat?: number;          // grams
  fiber?: number;        // grams
  sodium?: number;       // milligrams
  sugar?: number;        // grams
  calcium?: number;      // milligrams
  iron?: number;         // milligrams
  vitaminC?: number;     // milligrams
  vitaminD?: number;     // micrograms
}

export interface Food {
  id: string;
  name: string;
  nameZh?: string;       // Chinese name for Taiwan/HK
  category: FoodCategory;
  nutrients: NutrientInfo;
  commonTriggers: boolean; // if commonly triggers IBD/IBS symptoms
  riskLevel: 'low' | 'medium' | 'high'; // for medical conditions
  description?: string;
  alternativeNames?: string[];
  servingSize?: string;
  servingSizeGrams?: number;
}

export interface FoodEntry {
  id: string;
  foodId: string;
  food: Food;
  quantity: number;
  unit: string;
  mealType: MealType;
  timestamp: Date;
  notes?: string;
  symptoms?: string[]; // symptom IDs that occurred after eating
  enjoymentRating?: number; // 1-5 scale
  digestibilityRating?: number; // 1-5 scale (1 = very difficult, 5 = very easy)
}

export interface MealEntry {
  id: string;
  date: Date;
  mealType: MealType;
  foods: FoodEntry[];
  totalNutrients: NutrientInfo;
  notes?: string;
  location?: string;
  moodBefore?: number; // 1-10 scale
  moodAfter?: number;  // 1-10 scale
  energyLevel?: number; // 1-10 scale
  symptoms?: string[]; // symptom IDs
}

export interface DailyNutrition {
  date: Date;
  meals: MealEntry[];
  totalNutrients: NutrientInfo;
  waterIntake?: number; // milliliters
  symptoms: string[]; // symptom IDs
  overallWellness?: number; // 1-10 scale
  notes?: string;
  medicationsTaken?: string[]; // medication IDs
}

export interface NutritionalGoals {
  id: string;
  userId: string;
  dailyCalories?: number;
  dailyProtein?: number;
  dailyCarbs?: number;
  dailyFat?: number;
  dailyFiber?: number;
  dailyWater?: number;
  avoidFoods?: string[]; // food IDs to avoid
  recommendedFoods?: string[]; // food IDs recommended by healthcare provider
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodTriggerAnalysis {
  foodId: string;
  food: Food;
  triggerScore: number; // 0-100, higher means more likely to trigger symptoms
  totalConsumptions: number;
  symptomsAfterConsumption: number;
  commonSymptoms: string[]; // symptom types
  timeToSymptoms?: number; // average minutes to symptom onset
  confidence: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}