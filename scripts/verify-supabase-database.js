#!/usr/bin/env node

/**
 * Supabase Database Verification Script
 * 直接驗證 Supabase 資料庫狀態
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Supabase Database Verification                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function verifyDatabase() {
  console.log('🔍 Step 1: Verify table exists\n');

  // Test 1: Check if daily_symptom_entries table exists
  const { data: tableData, error: tableError } = await supabase
    .from('daily_symptom_entries')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('❌ CRITICAL: Table access failed');
    console.error('Error Code:', tableError.code);
    console.error('Error Message:', tableError.message);
    console.error('Error Details:', tableError.details);
    console.error('Error Hint:', tableError.hint);
    console.log('\n⚠️  This indicates a fundamental schema cache or table issue!\n');
    return false;
  } else {
    console.log('✅ Table "daily_symptom_entries" exists and is accessible');
    console.log(`   Found ${tableData ? tableData.length : 0} sample record(s)\n`);
  }

  // Test 2: Check stool_type column by attempting to select it
  console.log('🔍 Step 2: Verify stool_type column\n');

  const { data: stoolTypeData, error: stoolTypeError } = await supabase
    .from('daily_symptom_entries')
    .select('id, stool_type, bowel_movement_count')
    .limit(1);

  if (stoolTypeError) {
    console.error('❌ CRITICAL: stool_type column NOT found');
    console.error('Error Code:', stoolTypeError.code);
    console.error('Error Message:', stoolTypeError.message);
    console.log('\n⚠️  Migration 006 may not have executed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run: SELECT column_name FROM information_schema.columns');
    console.log('   WHERE table_name = \'daily_symptom_entries\' AND column_name = \'stool_type\';');
    console.log('3. If no results, re-run Migration 006\n');
    return false;
  } else {
    console.log('✅ Column "stool_type" exists and is accessible');
    console.log('✅ Column "bowel_movement_count" exists and is accessible');
    if (stoolTypeData && stoolTypeData.length > 0) {
      console.log('   Sample data:', JSON.stringify(stoolTypeData[0], null, 2));
    }
    console.log('');
  }

  // Test 3: Test INSERT operation
  console.log('🔍 Step 3: Test INSERT operation\n');

  const testEntry = {
    user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
    recorded_date: '2099-12-31', // Far future date to avoid conflicts
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
  };

  const { data: insertData, error: insertError } = await supabase
    .from('daily_symptom_entries')
    .insert(testEntry)
    .select();

  if (insertError) {
    console.error('❌ INSERT operation failed');
    console.error('Error Code:', insertError.code);
    console.error('Error Message:', insertError.message);
    console.error('Error Details:', insertError.details);

    if (insertError.code === '42501') {
      console.log('\n⚠️  Row-Level Security (RLS) Policy Issue!');
      console.log('📋 The RLS policy is blocking the insert.');
      console.log('📋 This is expected for test UUID, but indicates RLS is working.\n');
    } else if (insertError.code === 'PGRST204') {
      console.log('\n⚠️  Schema cache still not updated!');
      console.log('📋 PostgREST cannot see the stool_type column.\n');
    }
  } else {
    console.log('✅ INSERT operation successful');
    console.log('   Created entry ID:', insertData[0].id);

    // Clean up test entry
    await supabase
      .from('daily_symptom_entries')
      .delete()
      .eq('id', insertData[0].id);
    console.log('✅ Test entry cleaned up\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  return true;
}

// Test 5: Direct SQL verification
async function verifyViaSQL() {
  console.log('🔍 Step 5: Direct SQL verification (if possible)\n');
  console.log('📋 Execute this SQL in Supabase Dashboard to verify:\n');
  console.log('─'.repeat(60));
  console.log(`-- Check if stool_type column exists
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'daily_symptom_entries'
  AND column_name IN ('stool_type', 'bowel_movement_count')
ORDER BY column_name;

-- Check PostgREST schema cache
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE tablename = 'daily_symptom_entries';

-- Force reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';`);
  console.log('─'.repeat(60));
  console.log('\n✅ If columns show up in SQL but not via Supabase client:');
  console.log('   → Schema cache issue confirmed');
  console.log('   → Try: Restart your Supabase project from dashboard\n');
  console.log('❌ If columns do NOT show up in SQL:');
  console.log('   → Migration 006 did not execute');
  console.log('   → Re-run the migration SQL\n');
}

// Run verification
(async () => {
  try {
    await verifyDatabase();
    await verifyViaSQL();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Verification Complete                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Unexpected error during verification:');
    console.error(error);
    process.exit(1);
  }
})();
