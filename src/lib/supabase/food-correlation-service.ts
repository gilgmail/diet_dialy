/**
 * Food Correlation Service
 * Handles integration between food tracking and correlation analysis
 */

import { supabase } from './client';
import type { DailySymptomEntry } from '@/types/medical';

export interface FoodConsumption {
  id: string;
  food_id: string;
  food_name: string;
  food_category: string;
  consumed_at: Date;
  portion_size: string;
  meal_type?: string;
  notes?: string;
}

export interface CorrelationDataSummary {
  totalFoodEntries: number;
  totalSymptomEntries: number;
  uniqueFoods: number;
  analysisReadiness: 'insufficient' | 'minimal' | 'adequate' | 'good' | 'excellent';
  recommendations: string[];
  lastAnalysisDate?: Date;
}

export class FoodCorrelationService {
  /**
   * Get food consumption data for correlation analysis
   */
  static async getFoodConsumptionsForUser(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FoodConsumption[]> {
    try {
      const { data, error } = await supabase
        .from('food_history_entries')
        .select(`
          id,
          food_id,
          consumed_at,
          portion_size,
          meal_type,
          notes,
          diet_daily_foods!inner (
            id,
            name,
            category
          )
        `)
        .eq('user_id', userId)
        .gte('consumed_at', startDate.toISOString())
        .lte('consumed_at', endDate.toISOString())
        .order('consumed_at', { ascending: false });

      if (error) {
        console.error('Error fetching food consumptions:', error);
        throw error;
      }

      return (data || []).map(entry => ({
        id: entry.id,
        food_id: entry.diet_daily_foods.id,
        food_name: entry.diet_daily_foods.name,
        food_category: entry.diet_daily_foods.category || 'Unknown',
        consumed_at: new Date(entry.consumed_at),
        portion_size: entry.portion_size || 'medium',
        meal_type: entry.meal_type,
        notes: entry.notes
      }));

    } catch (error) {
      console.error('Error in getFoodConsumptionsForUser:', error);
      throw error;
    }
  }

  /**
   * Link food entries to symptom entries based on consumption timing
   */
  static async linkFoodEntriesToSymptoms(
    userId: string,
    symptomEntries: DailySymptomEntry[],
    maxLagHours: number = 72
  ): Promise<DailySymptomEntry[]> {
    try {
      // Get food consumptions for the relevant period
      const earliestSymptomDate = new Date(Math.min(
        ...symptomEntries.map(entry => new Date(entry.recorded_date).getTime())
      ));

      // Extend start date to account for lag time
      const startDate = new Date(earliestSymptomDate);
      startDate.setHours(startDate.getHours() - maxLagHours);

      const latestSymptomDate = new Date(Math.max(
        ...symptomEntries.map(entry => new Date(entry.recorded_date).getTime())
      ));

      const foodConsumptions = await this.getFoodConsumptionsForUser(
        userId,
        startDate,
        latestSymptomDate
      );

      // Link foods to symptom entries based on timing
      const linkedEntries = symptomEntries.map(symptomEntry => {
        const symptomDate = new Date(symptomEntry.recorded_date);

        // Find foods consumed within the lag window before this symptom entry
        const relatedFoods = foodConsumptions.filter(food => {
          const timeDiff = symptomDate.getTime() - food.consumed_at.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          return hoursDiff >= 0 && hoursDiff <= maxLagHours;
        });

        // Update the related_food_entries array
        return {
          ...symptomEntry,
          related_food_entries: relatedFoods.map(food => food.food_id)
        };
      });

      // Update the symptom entries in the database
      for (const entry of linkedEntries) {
        if (entry.related_food_entries.length > 0) {
          await this.updateSymptomEntryFoodLinks(entry.id, entry.related_food_entries);
        }
      }

      return linkedEntries;

    } catch (error) {
      console.error('Error linking food entries to symptoms:', error);
      throw error;
    }
  }

  /**
   * Update symptom entry with linked food IDs
   */
  private static async updateSymptomEntryFoodLinks(
    symptomEntryId: string,
    foodIds: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('daily_symptom_entries')
        .update({
          related_food_entries: foodIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', symptomEntryId);

      if (error) {
        console.error('Error updating symptom entry food links:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateSymptomEntryFoodLinks:', error);
      throw error;
    }
  }

  /**
   * Assess data readiness for correlation analysis
   */
  static async assessCorrelationDataReadiness(userId: string): Promise<CorrelationDataSummary> {
    try {
      // Get data counts for the last 3 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      // Count symptom entries
      const { count: symptomCount, error: symptomError } = await supabase
        .from('daily_symptom_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('recorded_date', startDate.toISOString().split('T')[0]);

      if (symptomError) {
        throw symptomError;
      }

      // Count food entries
      const { count: foodCount, error: foodError } = await supabase
        .from('food_history_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('consumed_at', startDate.toISOString());

      if (foodError) {
        throw foodError;
      }

      // Count unique foods
      const { data: uniqueFoodsData, error: uniqueFoodsError } = await supabase
        .from('food_history_entries')
        .select('food_id')
        .eq('user_id', userId)
        .gte('consumed_at', startDate.toISOString());

      if (uniqueFoodsError) {
        throw uniqueFoodsError;
      }

      const uniqueFoods = new Set(uniqueFoodsData?.map(item => item.food_id) || []).size;

      // Check for recent analysis
      const { data: recentAnalysis, error: analysisError } = await supabase
        .from('enhanced_correlation_results')
        .select('analysis_date')
        .eq('user_id', userId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      // Determine analysis readiness
      let analysisReadiness: CorrelationDataSummary['analysisReadiness'];
      const recommendations: string[] = [];

      const totalEntries = (symptomCount || 0) + (foodCount || 0);

      if (totalEntries >= 200 && (symptomCount || 0) >= 60 && uniqueFoods >= 20) {
        analysisReadiness = 'excellent';
        recommendations.push('數據充足，可進行全面的關聯分析');
      } else if (totalEntries >= 100 && (symptomCount || 0) >= 30 && uniqueFoods >= 15) {
        analysisReadiness = 'good';
        recommendations.push('數據良好，分析結果具有參考價值');
      } else if (totalEntries >= 50 && (symptomCount || 0) >= 20 && uniqueFoods >= 10) {
        analysisReadiness = 'adequate';
        recommendations.push('數據足夠進行基本分析');
        if ((symptomCount || 0) < 30) {
          recommendations.push('建議持續記錄症狀以提高分析準確性');
        }
      } else if (totalEntries >= 20 && (symptomCount || 0) >= 10 && uniqueFoods >= 5) {
        analysisReadiness = 'minimal';
        recommendations.push('數據量較少，分析結果僅供初步參考');
        recommendations.push('建議繼續記錄至少2-4週的數據');
      } else {
        analysisReadiness = 'insufficient';
        recommendations.push('數據不足，無法進行可靠的關聯分析');
        if ((symptomCount || 0) < 10) {
          recommendations.push('請持續記錄每日症狀');
        }
        if ((foodCount || 0) < 20) {
          recommendations.push('請記錄更多的飲食消費');
        }
        if (uniqueFoods < 5) {
          recommendations.push('請嘗試記錄更多種類的食物');
        }
      }

      return {
        totalFoodEntries: foodCount || 0,
        totalSymptomEntries: symptomCount || 0,
        uniqueFoods,
        analysisReadiness,
        recommendations,
        lastAnalysisDate: recentAnalysis && !analysisError ? new Date(recentAnalysis.analysis_date) : undefined
      };

    } catch (error) {
      console.error('Error assessing correlation data readiness:', error);
      throw error;
    }
  }

  /**
   * Get food entry statistics for a user
   */
  static async getFoodEntryStatistics(
    userId: string,
    days: number = 30
  ): Promise<{
    totalEntries: number;
    uniqueFoods: number;
    averageEntriesPerDay: number;
    topFoods: Array<{ name: string; count: number; category: string }>;
    mealTypeDistribution: Record<string, number>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('food_history_entries')
        .select(`
          id,
          food_id,
          meal_type,
          consumed_at,
          diet_daily_foods!inner (
            name,
            category
          )
        `)
        .eq('user_id', userId)
        .gte('consumed_at', startDate.toISOString())
        .lte('consumed_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      const entries = data || [];
      const uniqueFoods = new Set(entries.map(entry => entry.food_id)).size;
      const averageEntriesPerDay = entries.length / days;

      // Calculate top foods
      const foodCounts = entries.reduce((acc, entry) => {
        const foodName = entry.diet_daily_foods.name;
        const category = entry.diet_daily_foods.category || 'Unknown';

        if (!acc[foodName]) {
          acc[foodName] = { count: 0, category };
        }
        acc[foodName].count++;
        return acc;
      }, {} as Record<string, { count: number; category: string }>);

      const topFoods = Object.entries(foodCounts)
        .map(([name, data]) => ({ name, count: data.count, category: data.category }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate meal type distribution
      const mealTypeDistribution = entries.reduce((acc, entry) => {
        const mealType = entry.meal_type || 'other';
        acc[mealType] = (acc[mealType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalEntries: entries.length,
        uniqueFoods,
        averageEntriesPerDay: Math.round(averageEntriesPerDay * 10) / 10,
        topFoods,
        mealTypeDistribution
      };

    } catch (error) {
      console.error('Error getting food entry statistics:', error);
      throw error;
    }
  }

  /**
   * Create or update user correlation analysis settings
   */
  static async updateCorrelationSettings(
    userId: string,
    settings: {
      defaultAnalysisWindowMonths?: number;
      minSampleSize?: number;
      confidenceLevel?: number;
      includeWeakCorrelations?: boolean;
      autoAnalysisEnabled?: boolean;
      analysisFrequencyDays?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('correlation_analysis_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating correlation settings:', error);
      throw error;
    }
  }

  /**
   * Get user correlation analysis settings
   */
  static async getCorrelationSettings(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('correlation_analysis_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Return default settings if none exist
      if (!data) {
        return {
          defaultAnalysisWindowMonths: 3,
          minSampleSize: 10,
          confidenceLevel: 0.95,
          includeWeakCorrelations: false,
          autoAnalysisEnabled: true,
          analysisFrequencyDays: 7
        };
      }

      return data;
    } catch (error) {
      console.error('Error getting correlation settings:', error);
      throw error;
    }
  }
}