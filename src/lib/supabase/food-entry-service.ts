/**
 * Food Entry Service
 * Handles CRUD operations for food_entries table in Supabase
 */

import { createAdminClient } from './server';
import type { FoodHistoryEntry } from '@/types/history';

export class FoodEntryService {
  /**
   * Get food entries by date range for a user
   */
  static async getEntriesByRange(
    userId: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<FoodHistoryEntry[]> {
    try {
      const supabase = createAdminClient();

      // 為了包含結束日期的所有記錄，將結束日期設為當天的23:59:59
      // 或者加上一天然後使用 < 運算子
      const endDateTime = `${endDate}T23:59:59.999Z`;

      console.log('📊 FoodEntryService - Query range:', {
        userId,
        startDate,
        endDate,
        endDateTime,
        limit
      });

      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('consumed_at', startDate)
        .lte('consumed_at', endDateTime)
        .order('consumed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching food entries:', error);
        throw error;
      }

      console.log('📊 FoodEntryService - Entries found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📅 Sample entries:', data.slice(0, 3).map(e => ({
          food_name: e.food_name,
          consumed_at: e.consumed_at
        })));
      }

      return (data || []).map(entry => this.transformDatabaseEntry(entry));
    } catch (error) {
      console.error('Error in getEntriesByRange:', error);
      throw error;
    }
  }

  /**
   * Get food entries for a specific date
   */
  static async getEntriesByDate(
    userId: string,
    date: string
  ): Promise<FoodHistoryEntry[]> {
    try {
      const supabase = createAdminClient();

      // Get entries for the entire day (local timezone)
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('consumed_at', startOfDay)
        .lte('consumed_at', endOfDay)
        .order('consumed_at', { ascending: false });

      if (error) {
        console.error('Error fetching food entries by date:', error);
        throw error;
      }

      return (data || []).map(entry => this.transformDatabaseEntry(entry));
    } catch (error) {
      console.error('Error in getEntriesByDate:', error);
      throw error;
    }
  }

  /**
   * Get recent food entries for a user
   */
  static async getRecentEntries(
    userId: string,
    limit: number = 50
  ): Promise<FoodHistoryEntry[]> {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('consumed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent food entries:', error);
        throw error;
      }

      return (data || []).map(entry => this.transformDatabaseEntry(entry));
    } catch (error) {
      console.error('Error in getRecentEntries:', error);
      throw error;
    }
  }

  /**
   * Create new food entry
   */
  static async createEntry(
    userId: string,
    entryData: Partial<FoodHistoryEntry>
  ): Promise<FoodHistoryEntry> {
    try {
      const supabase = createAdminClient();

      const dbData = {
        user_id: userId,
        food_id: entryData.foodId,
        food_name: entryData.foodName,
        food_category: entryData.category,
        amount: entryData.amount || 100,
        unit: entryData.unit || 'g',
        calories: entryData.calories,
        nutrition_data: entryData.nutritionData || {},
        medical_score: entryData.medicalScore,
        medical_analysis: entryData.medicalAnalysis || {},
        consumed_at: entryData.consumedAt,
        meal_type: entryData.mealType,
        symptoms_before: entryData.symptomsBefore || [],
        symptoms_after: entryData.symptomsAfter || [],
        symptom_severity: entryData.symptomSeverity,
        notes: entryData.notes,
        photo_url: entryData.photoUrl,
        location: entryData.location,
        sync_status: 'synced'
      };

      const { data, error } = await supabase
        .from('food_entries')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating food entry:', error);
        throw error;
      }

      return this.transformDatabaseEntry(data);
    } catch (error) {
      console.error('Error in createEntry:', error);
      throw error;
    }
  }

  /**
   * Update food entry
   */
  static async updateEntry(
    entryId: string,
    userId: string,
    updates: Partial<FoodHistoryEntry>
  ): Promise<FoodHistoryEntry | null> {
    try {
      const supabase = createAdminClient();

      const dbUpdates: any = {};
      if (updates.foodName) dbUpdates.food_name = updates.foodName;
      if (updates.amount) dbUpdates.amount = updates.amount;
      if (updates.unit) dbUpdates.unit = updates.unit;
      if (updates.calories) dbUpdates.calories = updates.calories;
      if (updates.nutritionData) dbUpdates.nutrition_data = updates.nutritionData;
      if (updates.medicalScore) dbUpdates.medical_score = updates.medicalScore;
      if (updates.medicalAnalysis) dbUpdates.medical_analysis = updates.medicalAnalysis;
      if (updates.consumedAt) dbUpdates.consumed_at = updates.consumedAt;
      if (updates.mealType) dbUpdates.meal_type = updates.mealType;
      if (updates.notes) dbUpdates.notes = updates.notes;
      if (updates.photoUrl) dbUpdates.photo_url = updates.photoUrl;

      const { data, error } = await supabase
        .from('food_entries')
        .update(dbUpdates)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Entry not found
        }
        console.error('Error updating food entry:', error);
        throw error;
      }

      return this.transformDatabaseEntry(data);
    } catch (error) {
      console.error('Error in updateEntry:', error);
      throw error;
    }
  }

  /**
   * Delete food entry
   */
  static async deleteEntry(entryId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting food entry:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEntry:', error);
      return false;
    }
  }

  /**
   * Transform database entry to application format
   */
  private static transformDatabaseEntry(dbEntry: any): FoodHistoryEntry {
    // 建立虛擬的 foodData 物件以符合 FoodHistoryEntry 類型定義
    const foodData: any = {
      id: dbEntry.food_id || '',
      name_zh: dbEntry.food_name,
      name_en: dbEntry.food_name,
      category: dbEntry.food_category || 'other',
      medical_scores: dbEntry.medical_analysis || {
        ibd_score: 2,
        ibd_risk_factors: [],
        chemo_safety: 'safe',
        major_allergens: [],
        fodmap_level: 'low'
      },
      availability: {
        taiwan: true,
        hong_kong: true
      },
      cooking_methods: [],
      alternatives: [],
      created: dbEntry.created_at,
      medical_validated: true
    };

    // 建立 portion 物件
    const portion = {
      amount: dbEntry.amount || 100,
      unit: 'custom' as const,
      customUnit: dbEntry.unit || 'g',
      customAmount: dbEntry.amount || 100
    };

    // 建立 medicalScore 物件
    const medicalScore: any = {
      overall: dbEntry.medical_score || 0,
      breakdown: dbEntry.medical_analysis || {},
      warnings: [],
      recommendations: []
    };

    // 建立 symptoms 物件（如果有）
    const symptoms = (dbEntry.symptoms_before || dbEntry.symptoms_after) ? {
      before: dbEntry.symptoms_before || [],
      after: dbEntry.symptoms_after || [],
      severity: (dbEntry.symptom_severity || 1) as 1 | 2 | 3 | 4 | 5,
      timeAfter: undefined
    } : undefined;

    return {
      id: dbEntry.id,
      userId: dbEntry.user_id,
      foodId: dbEntry.food_id || '',
      foodData,
      consumedAt: dbEntry.consumed_at,
      portion,
      medicalScore,
      notes: dbEntry.notes,
      photoUrl: dbEntry.photo_url,
      location: dbEntry.location,
      symptoms,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at
    };
  }
}

export const foodEntryService = FoodEntryService;
