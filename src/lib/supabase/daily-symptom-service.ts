/**
 * Daily Symptom Service
 * Handles CRUD operations for daily symptom tracking entries
 */

import { createClient, createAdminClient } from './server';
import type {
  DailySymptomEntry,
  CoreSymptomScores,
  ContextualScores,
  AdditionalSymptom,
  UserSymptomSummary,
  RecentSymptomTrend
} from '@/types/medical';

export class DailySymptomService {
  /**
   * Get symptom entry by specific date
   */
  static async getEntryByDate(userId: string, date: string): Promise<DailySymptomEntry | null> {
    try {
      // Use admin client to bypass RLS for read operations
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('recorded_date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching symptom entry by date:', error);
        throw error;
      }

      return this.transformDatabaseEntry(data);
    } catch (error) {
      console.error('Error in getEntryByDate:', error);
      throw error;
    }
  }

  /**
   * Get symptom entries within date range
   */
  static async getEntriesByRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailySymptomEntry[]> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startDate)
        .lte('recorded_date', endDate)
        .order('recorded_date', { ascending: false });

      if (error) {
        console.error('Error fetching symptom entries by range:', error);
        throw error;
      }

      return (data || []).map(entry => this.transformDatabaseEntry(entry));
    } catch (error) {
      console.error('Error in getEntriesByRange:', error);
      throw error;
    }
  }

  /**
   * Get recent symptom entries
   */
  static async getRecentEntries(userId: string, limit: number = 30): Promise<DailySymptomEntry[]> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent symptom entries:', error);
        throw error;
      }

      return (data || []).map(entry => this.transformDatabaseEntry(entry));
    } catch (error) {
      console.error('Error in getRecentEntries:', error);
      throw error;
    }
  }

  /**
   * Get all dates that have recorded entries for a user
   * Returns array of date strings in YYYY-MM-DD format
   */
  static async getRecordedDates(userId: string, startDate?: string, endDate?: string): Promise<string[]> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      let query = supabase
        .from('daily_symptom_entries')
        .select('recorded_date')
        .eq('user_id', userId)
        .order('recorded_date', { ascending: false });

      if (startDate) {
        query = query.gte('recorded_date', startDate);
      }
      if (endDate) {
        query = query.lte('recorded_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recorded dates:', error);
        throw error;
      }

      return (data || []).map(entry => entry.recorded_date);
    } catch (error) {
      console.error('Error in getRecordedDates:', error);
      throw error;
    }
  }

  /**
   * Create new symptom entry
   * Uses admin client to bypass RLS (server-side only)
   */
  static async createEntry(
    entryData: Omit<DailySymptomEntry, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DailySymptomEntry> {
    try {
      // Use admin client to bypass RLS for insert operations
      // This is safe because the API route validates userId matches authenticated user
      const supabase = createAdminClient();

      // Transform data for database storage
      const dbData = this.transformEntryForDatabase(entryData);

      const { data, error} = await supabase
        .from('daily_symptom_entries')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating symptom entry:', error);
        throw error;
      }

      return this.transformDatabaseEntry(data);
    } catch (error) {
      console.error('Error in createEntry:', error);
      throw error;
    }
  }

  /**
   * Update existing symptom entry by ID
   */
  static async updateEntry(
    entryId: string,
    userId: string,
    updates: Partial<DailySymptomEntry>
  ): Promise<DailySymptomEntry | null> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      // Transform updates for database
      const dbUpdates = this.transformEntryForDatabase(updates);
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .update(dbUpdates)
        .eq('id', entryId)
        .eq('user_id', userId) // Security: ensure user owns the entry
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Entry not found
        }
        console.error('Error updating symptom entry:', error);
        throw error;
      }

      return this.transformDatabaseEntry(data);
    } catch (error) {
      console.error('Error in updateEntry:', error);
      throw error;
    }
  }

  /**
   * Update entry by date (upsert pattern)
   */
  static async updateEntryByDate(
    userId: string,
    date: string,
    updates: Partial<DailySymptomEntry>
  ): Promise<DailySymptomEntry | null> {
    try {
      // First try to find existing entry
      const existingEntry = await this.getEntryByDate(userId, date);

      if (existingEntry) {
        // Update existing
        return this.updateEntry(existingEntry.id, userId, updates);
      } else {
        // Create new entry with updates
        const newEntryData = {
          user_id: userId,
          recorded_date: date,
          recorded_at: new Date(),

          // Default core symptom scores
          overall_health: 3 as const,
          abdominal_pain: 0 as const,
          diarrhea: 0 as const,
          bloody_stool: 0 as const,
          bloating: 0 as const,

          // Default additional data
          additional_symptoms: [],
          medications_taken: [],
          triggers_identified: [],
          improvement_factors: [],
          related_food_entries: [],
          entry_source: 'manual' as const,
          data_completeness_score: 0.8,

          // Apply updates
          ...updates
        } as Omit<DailySymptomEntry, 'id' | 'created_at' | 'updated_at'>;

        return this.createEntry(newEntryData);
      }
    } catch (error) {
      console.error('Error in updateEntryByDate:', error);
      throw error;
    }
  }

  /**
   * Delete symptom entry by ID
   */
  static async deleteEntry(entryId: string, userId: string): Promise<boolean> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting symptom entry:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEntry:', error);
      return false;
    }
  }

  /**
   * Delete entry by date
   */
  static async deleteEntryByDate(userId: string, date: string): Promise<boolean> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('user_id', userId)
        .eq('recorded_date', date);

      if (error) {
        console.error('Error deleting symptom entry by date:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEntryByDate:', error);
      return false;
    }
  }

  /**
   * Get user symptom summary
   */
  static async getUserSummary(userId: string): Promise<UserSymptomSummary | null> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('user_symptom_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching user symptom summary:', error);
        throw error;
      }

      return {
        user_id: data.user_id,
        total_entries: data.total_entries,
        avg_health_score: data.avg_health_score,
        avg_abdominal_pain: data.avg_abdominal_pain,
        avg_diarrhea: data.avg_diarrhea,
        avg_bloody_stool: data.avg_bloody_stool,
        avg_bloating: data.avg_bloating,
        last_entry_date: new Date(data.last_entry_date),
        first_entry_date: new Date(data.first_entry_date),
        tracking_streak: await this.calculateTrackingStreak(userId)
      };
    } catch (error) {
      console.error('Error in getUserSummary:', error);
      throw error;
    }
  }

  /**
   * Get recent symptom trends (with change indicators)
   */
  static async getRecentTrends(userId: string, days: number = 30): Promise<RecentSymptomTrend[]> {
    try {
      // Use admin client to bypass RLS
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('recent_symptom_trends')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('recorded_date', { ascending: false });

      if (error) {
        console.error('Error fetching recent symptom trends:', error);
        throw error;
      }

      return (data || []).map(trend => ({
        user_id: trend.user_id,
        recorded_date: new Date(trend.recorded_date),
        overall_health: trend.overall_health,
        total_symptom_score: trend.total_symptom_score,
        health_change: trend.prev_health ? trend.overall_health - trend.prev_health : 0,
        symptom_change: trend.prev_symptoms ? trend.total_symptom_score - trend.prev_symptoms : 0,
        is_improving: trend.prev_health ? trend.overall_health > trend.prev_health : false,
        is_deteriorating: trend.prev_symptoms ? trend.total_symptom_score > trend.prev_symptoms : false
      }));
    } catch (error) {
      console.error('Error in getRecentTrends:', error);
      throw error;
    }
  }

  /**
   * Calculate current tracking streak (consecutive days with entries)
   */
  static async calculateTrackingStreak(userId: string): Promise<number> {
    try {
      // Get recent entries ordered by date descending
      const entries = await this.getRecentEntries(userId, 100);

      if (entries.length === 0) return 0;

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset to start of day

      for (const entry of entries) {
        const entryDate = new Date(entry.recorded_date);
        entryDate.setHours(0, 0, 0, 0);

        // Check if this entry is for the expected date
        if (entryDate.getTime() === currentDate.getTime()) {
          streak++;
          // Move to previous day for next iteration
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          // Gap found, break the streak
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating tracking streak:', error);
      return 0;
    }
  }

  /**
   * Transform database entry to application format
   */
  private static transformDatabaseEntry(dbEntry: any): DailySymptomEntry {
    return {
      id: dbEntry.id,
      user_id: dbEntry.user_id,
      recorded_date: dbEntry.recorded_date,
      recorded_at: new Date(dbEntry.recorded_at),

      // Core symptoms
      overall_health: dbEntry.overall_health,
      abdominal_pain: dbEntry.abdominal_pain,
      diarrhea: dbEntry.diarrhea,
      bloody_stool: dbEntry.bloody_stool,
      bloating: dbEntry.bloating,

      // Bowel movement tracking
      bowel_movement_count: dbEntry.bowel_movement_count,
      stool_type: dbEntry.stool_type,

      // Contextual scores
      mood_score: dbEntry.mood_score,
      energy_level: dbEntry.energy_level,
      sleep_quality: dbEntry.sleep_quality,
      stress_level: dbEntry.stress_level,

      // Additional data
      additional_symptoms: dbEntry.additional_symptoms || [],
      medications_taken: dbEntry.medications_taken || [],
      medication_adherence: dbEntry.medication_adherence,

      // Environmental
      weather_conditions: dbEntry.weather_conditions,
      activity_level: dbEntry.activity_level,

      // Observations
      notes: dbEntry.notes,
      triggers_identified: dbEntry.triggers_identified || [],
      improvement_factors: dbEntry.improvement_factors || [],

      // Correlations
      related_food_entries: dbEntry.related_food_entries || [],

      // Metadata
      entry_source: dbEntry.entry_source,
      data_completeness_score: dbEntry.data_completeness_score,

      // Timestamps
      created_at: new Date(dbEntry.created_at),
      updated_at: new Date(dbEntry.updated_at)
    };
  }

  /**
   * Transform application entry to database format
   */
  private static transformEntryForDatabase(entry: any): any {
    const dbEntry: any = { ...entry };

    // Convert Date objects to ISO strings
    if (entry.recorded_at instanceof Date) {
      dbEntry.recorded_at = entry.recorded_at.toISOString();
    }

    // Ensure arrays are properly formatted
    dbEntry.additional_symptoms = entry.additional_symptoms || [];
    dbEntry.medications_taken = entry.medications_taken || [];
    dbEntry.triggers_identified = entry.triggers_identified || [];
    dbEntry.improvement_factors = entry.improvement_factors || [];
    dbEntry.related_food_entries = entry.related_food_entries || [];

    // Remove fields that shouldn't be in database
    delete dbEntry.id;
    delete dbEntry.created_at;
    delete dbEntry.updated_at;

    return dbEntry;
  }
}