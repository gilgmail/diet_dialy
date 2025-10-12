// Food Diary Types

export interface FoodEntry {
  id: string
  user_id: string
  food_name: string
  meal_type: MealType
  portion_size?: string
  calories?: number
  notes?: string
  consumed_at: string
  created_at: string
  updated_at: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface CreateFoodEntryInput {
  food_name: string
  meal_type: MealType
  amount?: number // Quantity, defaults to 1
  portion_size?: string
  calories?: number
  notes?: string
  consumed_at?: string // ISO date string
}

export interface UpdateFoodEntryInput {
  food_name?: string
  meal_type?: MealType
  portion_size?: string
  calories?: number
  notes?: string
  consumed_at?: string
}

// Food Database Item from Supabase (diet_daily_foods table)
// Note: Nutrition values are per 100g
export interface Food {
  id: string
  name: string
  name_en?: string
  category: string
  brand?: string
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number
  verification_status?: 'pending' | 'approved' | 'rejected'
  is_custom?: boolean
  taiwan_origin?: boolean
  created_at: string
  updated_at: string
}

export interface FoodSearchResult {
  id: string
  name: string
  name_en?: string
  brand?: string
  calories?: number
  category?: string
  protein?: number
  carbohydrates?: number
  fat?: number
  verification_status?: string
}

export const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: '早餐', icon: '🌅' },
  { value: 'lunch', label: '午餐', icon: '☀️' },
  { value: 'dinner', label: '晚餐', icon: '🌙' },
  { value: 'snack', label: '點心', icon: '🍪' },
]
