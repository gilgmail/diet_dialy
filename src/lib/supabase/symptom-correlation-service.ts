/**
 * Symptom Correlation Service
 * Handles correlation analysis between symptoms and foods
 */

import { supabase } from './client';
import { DailySymptomService } from './daily-symptom-service';
import type {
  SymptomFoodCorrelation,
  DailySymptomEntry,
  CoreSymptomScores
} from '@/types/medical';

export interface CorrelationFilters {
  correlationType?: 'positive' | 'negative' | 'neutral';
  minStrength?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface CorrelationAnalysisOptions {
  analysisMethod?: 'statistical' | 'ai_enhanced' | 'hybrid';
  minSampleSize?: number;
  confidenceThreshold?: number;
  timeRangeMonths?: number;
  includeWeakCorrelations?: boolean;
  maxTimeLagHours?: number;
}

export class SymptomCorrelationService {
  /**
   * Get correlation for specific food
   */
  static async getFoodCorrelation(
    userId: string,
    foodId: string
  ): Promise<SymptomFoodCorrelation | null> {
    try {
      const { data, error } = await supabase
        .from('symptom_food_correlations')
        .select('*')
        .eq('user_id', userId)
        .eq('food_id', foodId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No correlation found
        }
        console.error('Error fetching food correlation:', error);
        throw error;
      }

      return this.transformDatabaseCorrelation(data);
    } catch (error) {
      console.error('Error in getFoodCorrelation:', error);
      throw error;
    }
  }

  /**
   * Get correlations by filters
   */
  static async getCorrelationsByFilters(
    userId: string,
    filters: CorrelationFilters
  ): Promise<SymptomFoodCorrelation[]> {
    try {
      let query = supabase
        .from('symptom_food_correlations')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (filters.correlationType) {
        query = query.eq('correlation_type', filters.correlationType);
      }

      if (filters.minStrength !== undefined) {
        if (filters.correlationType === 'negative') {
          query = query.lte('correlation_strength', -filters.minStrength);
        } else {
          query = query.gte('correlation_strength', filters.minStrength);
        }
      }

      if (filters.startDate) {
        query = query.gte('analysis_start_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('analysis_end_date', filters.endDate);
      }

      // Order by correlation strength (absolute value)
      query = query.order('correlation_strength', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching correlations by filters:', error);
        throw error;
      }

      return (data || []).map(correlation => this.transformDatabaseCorrelation(correlation));
    } catch (error) {
      console.error('Error in getCorrelationsByFilters:', error);
      throw error;
    }
  }

  /**
   * Compute all correlations for user
   */
  static async computeAllCorrelations(
    userId: string,
    options: CorrelationAnalysisOptions = {}
  ): Promise<SymptomFoodCorrelation[]> {
    try {
      console.log('🔬 Computing symptom-food correlations for user:', userId);

      // Set default options
      const analysisOptions = {
        analysisMethod: 'statistical' as const,
        minSampleSize: 5,
        confidenceThreshold: 0.6,
        timeRangeMonths: 3,
        includeWeakCorrelations: false,
        maxTimeLagHours: 48,
        ...options
      };

      // Get date range for analysis
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - analysisOptions.timeRangeMonths);

      // Get symptom entries and food entries for the period
      const symptomEntries = await DailySymptomService.getEntriesByRange(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      console.log(`📊 Analyzing ${symptomEntries.length} symptom entries`);

      if (symptomEntries.length < analysisOptions.minSampleSize) {
        console.log('⚠️ Insufficient data for correlation analysis');
        return [];
      }

      // Get unique foods from related_food_entries
      const uniqueFoodIds = new Set<string>();
      for (const entry of symptomEntries) {
        for (const foodId of entry.related_food_entries) {
          uniqueFoodIds.add(foodId);
        }
      }

      console.log(`🍽️ Analyzing correlations for ${uniqueFoodIds.size} unique foods`);

      const correlations: SymptomFoodCorrelation[] = [];

      // Compute correlation for each food
      for (const foodId of uniqueFoodIds) {
        const correlation = await this.computeFoodCorrelation(
          userId,
          foodId,
          symptomEntries,
          startDate,
          endDate,
          analysisOptions
        );

        if (correlation) {
          correlations.push(correlation);
        }
      }

      // Save correlations to database
      for (const correlation of correlations) {
        await this.saveCorrelation(correlation);
      }

      console.log(`✅ Computed ${correlations.length} correlations`);
      return correlations;

    } catch (error) {
      console.error('Error in computeAllCorrelations:', error);
      throw error;
    }
  }

  /**
   * Update correlation (user confirmation)
   */
  static async updateCorrelation(
    correlationId: string,
    userId: string,
    updates: Partial<SymptomFoodCorrelation>
  ): Promise<SymptomFoodCorrelation | null> {
    try {
      const dbUpdates = this.transformCorrelationForDatabase(updates);
      dbUpdates.last_updated = new Date().toISOString();

      const { data, error } = await supabase
        .from('symptom_food_correlations')
        .update(dbUpdates)
        .eq('id', correlationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error updating correlation:', error);
        throw error;
      }

      return this.transformDatabaseCorrelation(data);
    } catch (error) {
      console.error('Error in updateCorrelation:', error);
      throw error;
    }
  }

  /**
   * Delete correlation
   */
  static async deleteCorrelation(correlationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('symptom_food_correlations')
        .delete()
        .eq('id', correlationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting correlation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCorrelation:', error);
      return false;
    }
  }

  /**
   * Delete all correlations for a specific food
   */
  static async deleteCorrelationsByFood(userId: string, foodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('symptom_food_correlations')
        .delete()
        .eq('user_id', userId)
        .eq('food_id', foodId);

      if (error) {
        console.error('Error deleting correlations by food:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCorrelationsByFood:', error);
      return false;
    }
  }

  /**
   * Private methods for correlation computation
   */

  private static async computeFoodCorrelation(
    userId: string,
    foodId: string,
    symptomEntries: DailySymptomEntry[],
    startDate: Date,
    endDate: Date,
    options: CorrelationAnalysisOptions
  ): Promise<SymptomFoodCorrelation | null> {
    try {
      // Get food details
      const foodDetails = await this.getFoodDetails(foodId);
      if (!foodDetails) {
        console.log(`⚠️ Food details not found for ID: ${foodId}`);
        return null;
      }

      // Filter entries that include this food
      const foodEntries = symptomEntries.filter(entry =>
        entry.related_food_entries.includes(foodId)
      );

      if (foodEntries.length < options.minSampleSize!) {
        console.log(`⚠️ Insufficient data for food ${foodId}: ${foodEntries.length} entries`);
        return null;
      }

      // Compute correlations for each core symptom
      const symptomImpacts: Record<keyof CoreSymptomScores, number> = {
        overall_health: 0,
        abdominal_pain: 0,
        diarrhea: 0,
        bloody_stool: 0,
        bloating: 0
      };

      const symptoms: (keyof CoreSymptomScores)[] = [
        'overall_health', 'abdominal_pain', 'diarrhea', 'bloody_stool', 'bloating'
      ];

      let totalAbsCorrelation = 0;
      let validCorrelations = 0;

      for (const symptom of symptoms) {
        const correlation = this.computeSymptomFoodCorrelation(
          symptomEntries,
          foodEntries,
          symptom
        );

        if (!isNaN(correlation) && isFinite(correlation)) {
          symptomImpacts[symptom] = correlation;
          totalAbsCorrelation += Math.abs(correlation);
          validCorrelations++;
        }
      }

      if (validCorrelations === 0) {
        console.log(`⚠️ No valid correlations computed for food ${foodId}`);
        return null;
      }

      // Calculate overall correlation strength
      const avgAbsCorrelation = totalAbsCorrelation / validCorrelations;

      // Determine correlation type and strength
      const overallCorrelation = this.computeOverallCorrelation(symptomImpacts);
      const correlationType = this.determineCorrelationType(overallCorrelation);

      // Calculate confidence level
      const confidenceLevel = this.calculateConfidenceLevel(
        foodEntries.length,
        avgAbsCorrelation,
        validCorrelations
      );

      if (confidenceLevel < options.confidenceThreshold!) {
        console.log(`⚠️ Low confidence correlation for food ${foodId}: ${confidenceLevel}`);
        if (!options.includeWeakCorrelations) {
          return null;
        }
      }

      // Create correlation object
      const correlation: Omit<SymptomFoodCorrelation, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        food_id: foodId,
        correlation_type: correlationType,
        correlation_strength: overallCorrelation,
        confidence_level: confidenceLevel,
        symptom_impacts: symptomImpacts,
        sample_size: foodEntries.length,
        time_lag_hours: this.calculateAverageTimeLag(foodEntries),
        analysis_start_date: startDate,
        analysis_end_date: endDate,
        food_name: foodDetails.name,
        food_category: foodDetails.category,
        analysis_method: options.analysisMethod!,
        last_updated: new Date()
      };

      return correlation as SymptomFoodCorrelation;

    } catch (error) {
      console.error(`Error computing correlation for food ${foodId}:`, error);
      return null;
    }
  }

  private static computeSymptomFoodCorrelation(
    allEntries: DailySymptomEntry[],
    foodEntries: DailySymptomEntry[],
    symptom: keyof CoreSymptomScores
  ): number {
    // Create binary array: 1 if food consumed, 0 if not
    const foodConsumption: number[] = [];
    const symptomValues: number[] = [];

    for (const entry of allEntries) {
      const hasFoodEntry = foodEntries.some(fe => fe.recorded_date === entry.recorded_date);
      foodConsumption.push(hasFoodEntry ? 1 : 0);
      symptomValues.push(entry[symptom]);
    }

    return this.calculatePearsonCorrelation(foodConsumption, symptomValues);
  }

  private static calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static computeOverallCorrelation(
    symptomImpacts: Record<keyof CoreSymptomScores, number>
  ): number {
    // Weight symptoms differently (negative symptoms are more important)
    const weights = {
      overall_health: -0.3, // Negative because correlation with health should be inverted
      abdominal_pain: 0.25,
      diarrhea: 0.25,
      bloody_stool: 0.3, // Higher weight for severe symptom
      bloating: 0.2
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [symptom, correlation] of Object.entries(symptomImpacts)) {
      const weight = weights[symptom as keyof CoreSymptomScores];
      weightedSum += correlation * weight;
      totalWeight += Math.abs(weight);
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private static determineCorrelationType(
    correlation: number
  ): 'positive' | 'negative' | 'neutral' {
    if (correlation > 0.1) return 'positive';
    if (correlation < -0.1) return 'negative';
    return 'neutral';
  }

  private static calculateConfidenceLevel(
    sampleSize: number,
    avgCorrelation: number,
    validCorrelations: number
  ): number {
    // Base confidence on sample size
    let confidence = Math.min(1, sampleSize / 20); // Ideal: 20+ samples

    // Adjust for correlation strength
    confidence *= (1 + avgCorrelation); // Stronger correlations = higher confidence

    // Adjust for data completeness
    confidence *= (validCorrelations / 5); // All 5 symptoms analyzed = max confidence

    return Math.max(0, Math.min(1, confidence));
  }

  private static calculateAverageTimeLag(foodEntries: DailySymptomEntry[]): number {
    // For daily tracking, assume average 12-hour lag
    // This could be enhanced with meal timing data
    return 12;
  }

  private static async getFoodDetails(foodId: string): Promise<{ name: string; category?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('diet_daily_foods')
        .select('name, category')
        .eq('id', foodId)
        .single();

      if (error) {
        console.error('Error fetching food details:', error);
        return null;
      }

      return {
        name: data.name,
        category: data.category
      };
    } catch (error) {
      console.error('Error in getFoodDetails:', error);
      return null;
    }
  }

  private static async saveCorrelation(
    correlation: Omit<SymptomFoodCorrelation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SymptomFoodCorrelation> {
    try {
      const dbData = this.transformCorrelationForDatabase(correlation);

      // Use upsert to handle duplicates
      const { data, error } = await supabase
        .from('symptom_food_correlations')
        .upsert(dbData, {
          onConflict: 'user_id,food_id,analysis_start_date,analysis_end_date'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving correlation:', error);
        throw error;
      }

      return this.transformDatabaseCorrelation(data);
    } catch (error) {
      console.error('Error in saveCorrelation:', error);
      throw error;
    }
  }

  private static transformCorrelationForDatabase(correlation: any): any {
    const dbCorrelation = { ...correlation };

    // Convert Date objects to ISO strings
    if (correlation.analysis_start_date instanceof Date) {
      dbCorrelation.analysis_start_date = correlation.analysis_start_date.toISOString().split('T')[0];
    }
    if (correlation.analysis_end_date instanceof Date) {
      dbCorrelation.analysis_end_date = correlation.analysis_end_date.toISOString().split('T')[0];
    }
    if (correlation.last_updated instanceof Date) {
      dbCorrelation.last_updated = correlation.last_updated.toISOString();
    }

    // Remove fields that shouldn't be in database
    delete dbCorrelation.id;
    delete dbCorrelation.created_at;
    delete dbCorrelation.updated_at;

    return dbCorrelation;
  }

  private static transformDatabaseCorrelation(dbCorrelation: any): SymptomFoodCorrelation {
    return {
      id: dbCorrelation.id,
      user_id: dbCorrelation.user_id,
      food_id: dbCorrelation.food_id,
      correlation_type: dbCorrelation.correlation_type,
      correlation_strength: dbCorrelation.correlation_strength,
      confidence_level: dbCorrelation.confidence_level,
      symptom_impacts: dbCorrelation.symptom_impacts,
      sample_size: dbCorrelation.sample_size,
      time_lag_hours: dbCorrelation.time_lag_hours,
      analysis_start_date: new Date(dbCorrelation.analysis_start_date),
      analysis_end_date: new Date(dbCorrelation.analysis_end_date),
      food_name: dbCorrelation.food_name,
      food_category: dbCorrelation.food_category,
      user_confirmed: dbCorrelation.user_confirmed,
      user_notes: dbCorrelation.user_notes,
      analysis_method: dbCorrelation.analysis_method,
      last_updated: new Date(dbCorrelation.last_updated),
      created_at: new Date(dbCorrelation.created_at),
      updated_at: new Date(dbCorrelation.updated_at)
    };
  }
}