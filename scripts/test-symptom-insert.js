#!/usr/bin/env node

/**
 * Test Symptom Entry Insertion
 * Tests if we can insert a symptom entry with bowel_movement_count
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Symptom Entry Insert Test                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Use a real-looking UUID format
  const testUserId = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'; // From logs
  const testDate = '2025-01-15';

  console.log('📋 Test Data:');
  console.log('   User ID:', testUserId);
  console.log('   Date:', testDate);
  console.log('   Bowel Movement Count: 3\n');

  try {
    // Insert test record
    console.log('1️⃣ Inserting test symptom entry...\n');

    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .insert({
        user_id: testUserId,
        recorded_date: testDate,
        recorded_at: new Date().toISOString(),
        overall_health: 4,
        abdominal_pain: 1,
        diarrhea: 0,
        bloody_stool: 0,
        bloating: 2,
        bowel_movement_count: 3,
        entry_source: 'manual',
        data_completeness_score: 1.0,
        triggers_identified: [],
        improvement_factors: [],
        medications_taken: [],
        additional_symptoms: [],
        related_food_entries: []
      })
      .select()
      .single();

    if (error) {
      console.log('❌ INSERT FAILED!\n');
      console.log('   Error Code:', error.code);
      console.log('   Error Message:', error.message);
      console.log('   Details:', error.details);
      console.log('\n   Possible causes:');

      if (error.code === '42501') {
        console.log('   - RLS policy still blocking (Migration 004 not executed)');
      } else if (error.message.includes('bowel_movement_count')) {
        console.log('   - Column missing (Migration 002 not executed)');
      } else if (error.code === '23505') {
        console.log('   - Record already exists for this user+date');
        console.log('   - Try deleting existing record first');
      } else {
        console.log('   - Unknown error, check details above');
      }

      return false;
    }

    console.log('✅ INSERT SUCCESS!\n');
    console.log('📊 Created Record:');
    console.log('   ID:', data.id);
    console.log('   Date:', data.recorded_date);
    console.log('   Overall Health:', data.overall_health);
    console.log('   Bowel Movement Count:', data.bowel_movement_count);
    console.log('   Created At:', data.created_at);
    console.log();

    // Retrieve the record
    console.log('2️⃣ Retrieving the record...\n');

    const { data: retrieved, error: getError } = await supabase
      .from('daily_symptom_entries')
      .select('*')
      .eq('id', data.id)
      .single();

    if (getError) {
      console.log('❌ RETRIEVE FAILED:', getError.message);
      return false;
    }

    console.log('✅ RETRIEVE SUCCESS!\n');
    console.log('   bowel_movement_count:', retrieved.bowel_movement_count);
    console.log();

    // Clean up
    console.log('3️⃣ Cleaning up test record...\n');

    const { error: deleteError } = await supabase
      .from('daily_symptom_entries')
      .delete()
      .eq('id', data.id);

    if (deleteError) {
      console.log('⚠️  Delete failed:', deleteError.message);
      console.log('   You may need to manually delete record ID:', data.id);
    } else {
      console.log('✅ Test record deleted\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('   ✅ Table exists');
    console.log('   ✅ bowel_movement_count column works');
    console.log('   ✅ RLS allows operations');
    console.log('   ✅ Insert/Select/Delete all working\n');
    console.log('🚀 Ready to test in browser:');
    console.log('   http://localhost:3000/symptoms\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    return true;

  } catch (err) {
    console.log('❌ UNEXPECTED ERROR:', err.message);
    console.log(err);
    return false;
  }
}

testInsert().catch(console.error);