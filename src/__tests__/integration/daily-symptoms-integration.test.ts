/**
 * Integration Tests for Daily Symptom Tracking
 * Tests with real database connections and UUID generation
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Daily Symptom Tracking - Integration Tests', () => {
  let testUserId: string;
  let testEntryId: string;
  const testDate = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    // Generate real UUID for test user
    testUserId = randomUUID();

    // Create temporary test user in database
    const { error: userError } = await supabase
      .from('diet_daily_users')
      .upsert({
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (userError) {
      console.error('Failed to create test user:', userError);
      throw userError;
    }
  });

  afterAll(async () => {
    // Clean up: Delete test symptom entries
    if (testUserId) {
      await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('user_id', testUserId);
    }

    // Clean up: Delete test user
    if (testUserId) {
      await supabase
        .from('diet_daily_users')
        .delete()
        .eq('id', testUserId);
    }
  });

  afterEach(async () => {
    // Clean up test entries after each test
    if (testUserId) {
      await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('user_id', testUserId);
    }
  });

  describe('CREATE - Daily Symptom Entry', () => {
    it('should create a new symptom entry with bowel movement data', async () => {
      const symptomData = {
        user_id: testUserId,
        recorded_date: testDate,
        recorded_at: new Date().toISOString(),
        overall_health: 3,
        abdominal_pain: 1,
        diarrhea: 1,
        bloody_stool: 1,
        bloating: 1,
        bowel_movement_count: 1,  // Default value
        stool_type: 3,  // Default value (正常)
        additional_symptoms: [],
        medications_taken: [],
        triggers_identified: [],
        improvement_factors: [],
        related_food_entries: [],
        entry_source: 'manual',
        data_completeness_score: 1.0,
      };

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .insert(symptomData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.user_id).toBe(testUserId);
      expect(data?.bowel_movement_count).toBe(1);
      expect(data?.stool_type).toBe(3);

      testEntryId = data?.id;
    });

    it('should create entry with custom stool type values', async () => {
      const symptomData = {
        user_id: testUserId,
        recorded_date: testDate,
        recorded_at: new Date().toISOString(),
        overall_health: 3,
        abdominal_pain: 2,
        diarrhea: 3,
        bloody_stool: 1,
        bloating: 2,
        bowel_movement_count: 5,
        stool_type: 5,  // 水狀/腹瀉
        additional_symptoms: [],
        medications_taken: [],
        triggers_identified: [],
        improvement_factors: [],
        related_food_entries: [],
        entry_source: 'manual',
        data_completeness_score: 1.0,
      };

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .insert(symptomData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.bowel_movement_count).toBe(5);
      expect(data?.stool_type).toBe(5);
    });

    it('should reject invalid stool_type values', async () => {
      const symptomData = {
        user_id: testUserId,
        recorded_date: testDate,
        recorded_at: new Date().toISOString(),
        overall_health: 3,
        abdominal_pain: 1,
        diarrhea: 1,
        bloody_stool: 1,
        bloating: 1,
        bowel_movement_count: 1,
        stool_type: 10,  // Invalid: should be 1-5
        additional_symptoms: [],
        medications_taken: [],
        triggers_identified: [],
        improvement_factors: [],
        related_food_entries: [],
        entry_source: 'manual',
        data_completeness_score: 1.0,
      };

      const { error } = await supabase
        .from('daily_symptom_entries')
        .insert(symptomData);

      expect(error).toBeDefined();
      expect(error?.message).toContain('check constraint');
    });

    it('should reject invalid bowel_movement_count values', async () => {
      const symptomData = {
        user_id: testUserId,
        recorded_date: testDate,
        recorded_at: new Date().toISOString(),
        overall_health: 3,
        abdominal_pain: 1,
        diarrhea: 1,
        bloody_stool: 1,
        bloating: 1,
        bowel_movement_count: -1,  // Invalid: should be 0-50
        stool_type: 3,
        additional_symptoms: [],
        medications_taken: [],
        triggers_identified: [],
        improvement_factors: [],
        related_food_entries: [],
        entry_source: 'manual',
        data_completeness_score: 1.0,
      };

      const { error } = await supabase
        .from('daily_symptom_entries')
        .insert(symptomData);

      expect(error).toBeDefined();
      expect(error?.message).toContain('check constraint');
    });
  });

  describe('READ - Daily Symptom Entry', () => {
    beforeEach(async () => {
      // Create a test entry
      const { data } = await supabase
        .from('daily_symptom_entries')
        .insert({
          user_id: testUserId,
          recorded_date: testDate,
          recorded_at: new Date().toISOString(),
          overall_health: 3,
          abdominal_pain: 1,
          diarrhea: 1,
          bloody_stool: 1,
          bloating: 1,
          bowel_movement_count: 2,
          stool_type: 4,
          additional_symptoms: [],
          medications_taken: [],
          triggers_identified: [],
          improvement_factors: [],
          related_food_entries: [],
          entry_source: 'manual',
          data_completeness_score: 1.0,
        })
        .select()
        .single();

      testEntryId = data?.id;
    });

    it('should retrieve entry with bowel movement data', async () => {
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', testUserId)
        .eq('recorded_date', testDate)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.bowel_movement_count).toBe(2);
      expect(data?.stool_type).toBe(4);
    });
  });

  describe('UPDATE - Daily Symptom Entry', () => {
    beforeEach(async () => {
      // Create a test entry
      const { data } = await supabase
        .from('daily_symptom_entries')
        .insert({
          user_id: testUserId,
          recorded_date: testDate,
          recorded_at: new Date().toISOString(),
          overall_health: 3,
          abdominal_pain: 1,
          diarrhea: 1,
          bloody_stool: 1,
          bloating: 1,
          bowel_movement_count: 1,
          stool_type: 3,
          additional_symptoms: [],
          medications_taken: [],
          triggers_identified: [],
          improvement_factors: [],
          related_food_entries: [],
          entry_source: 'manual',
          data_completeness_score: 1.0,
        })
        .select()
        .single();

      testEntryId = data?.id;
    });

    it('should update bowel movement count', async () => {
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .update({
          bowel_movement_count: 5,
        })
        .eq('id', testEntryId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bowel_movement_count).toBe(5);
    });

    it('should update stool type', async () => {
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .update({
          stool_type: 5,
        })
        .eq('id', testEntryId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.stool_type).toBe(5);
    });

    it('should update both bowel movement fields', async () => {
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .update({
          bowel_movement_count: 3,
          stool_type: 2,
        })
        .eq('id', testEntryId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bowel_movement_count).toBe(3);
      expect(data?.stool_type).toBe(2);
    });
  });

  describe('DELETE - Daily Symptom Entry', () => {
    beforeEach(async () => {
      // Create a test entry
      const { data } = await supabase
        .from('daily_symptom_entries')
        .insert({
          user_id: testUserId,
          recorded_date: testDate,
          recorded_at: new Date().toISOString(),
          overall_health: 3,
          abdominal_pain: 1,
          diarrhea: 1,
          bloody_stool: 1,
          bloating: 1,
          bowel_movement_count: 1,
          stool_type: 3,
          additional_symptoms: [],
          medications_taken: [],
          triggers_identified: [],
          improvement_factors: [],
          related_food_entries: [],
          entry_source: 'manual',
          data_completeness_score: 1.0,
        })
        .select()
        .single();

      testEntryId = data?.id;
    });

    it('should delete symptom entry', async () => {
      const { error } = await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('id', testEntryId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('id', testEntryId)
        .single();

      expect(data).toBeNull();
    });
  });

  describe('Data Persistence - Switching Records', () => {
    it('should maintain bowel movement data when switching between dates', async () => {
      const date1 = testDate;
      const date2 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create entry for date 1
      await supabase
        .from('daily_symptom_entries')
        .insert({
          user_id: testUserId,
          recorded_date: date1,
          recorded_at: new Date().toISOString(),
          overall_health: 3,
          abdominal_pain: 1,
          diarrhea: 1,
          bloody_stool: 1,
          bloating: 1,
          bowel_movement_count: 2,
          stool_type: 3,
          additional_symptoms: [],
          medications_taken: [],
          triggers_identified: [],
          improvement_factors: [],
          related_food_entries: [],
          entry_source: 'manual',
          data_completeness_score: 1.0,
        });

      // Create entry for date 2
      await supabase
        .from('daily_symptom_entries')
        .insert({
          user_id: testUserId,
          recorded_date: date2,
          recorded_at: new Date().toISOString(),
          overall_health: 4,
          abdominal_pain: 2,
          diarrhea: 2,
          bloody_stool: 1,
          bloating: 2,
          bowel_movement_count: 4,
          stool_type: 4,
          additional_symptoms: [],
          medications_taken: [],
          triggers_identified: [],
          improvement_factors: [],
          related_food_entries: [],
          entry_source: 'manual',
          data_completeness_score: 1.0,
        });

      // Retrieve date 1 entry
      const { data: entry1 } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', testUserId)
        .eq('recorded_date', date1)
        .single();

      expect(entry1?.bowel_movement_count).toBe(2);
      expect(entry1?.stool_type).toBe(3);

      // Retrieve date 2 entry
      const { data: entry2 } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', testUserId)
        .eq('recorded_date', date2)
        .single();

      expect(entry2?.bowel_movement_count).toBe(4);
      expect(entry2?.stool_type).toBe(4);
    });
  });
});
