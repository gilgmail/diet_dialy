#!/usr/bin/env node

/**
 * Detailed constraint check - queries database directly
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraints() {
  console.log('🔍 Checking health_metrics constraints in detail...\n');

  // Try to query constraint information
  // Note: Supabase client doesn't support direct information_schema queries
  // So we'll test by attempting different onConflict combinations

  const testUserId = '3382719a-98c9-4dca-8dbf-08f0eb2b78b4';
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000);

  // Test 1: Try with user_id in onConflict
  console.log('Test 1: onConflict with user_id,source,source_identifier,start_time');
  const test1 = {
    user_id: testUserId,
    source: 'healthkit',
    source_identifier: 'test-constraint-check-1',
    metric_type: 'steps',
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    recorded_date: now.toISOString().split('T')[0],
    numeric_value: 1000,
    unit: 'count',
    detail_payload: {},
    sync_status: 'synced',
    synced_at: now.toISOString(),
  };

  const { error: error1 } = await supabase
    .from('health_metrics')
    .upsert([test1], {
      onConflict: 'user_id,source,source_identifier,start_time',
      ignoreDuplicates: false
    });

  if (error1) {
    console.log(`   ❌ Failed: ${error1.code} - ${error1.message}\n`);
  } else {
    console.log('   ✅ Success!\n');
    // Clean up
    await supabase
      .from('health_metrics')
      .delete()
      .eq('user_id', testUserId)
      .eq('source_identifier', 'test-constraint-check-1');
  }

  // Test 2: Try with old constraint (without user_id)
  console.log('Test 2: onConflict with source,source_identifier,start_time (old constraint)');
  const test2 = {
    user_id: testUserId,
    source: 'healthkit',
    source_identifier: 'test-constraint-check-2',
    metric_type: 'steps',
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    recorded_date: now.toISOString().split('T')[0],
    numeric_value: 2000,
    unit: 'count',
    detail_payload: {},
    sync_status: 'synced',
    synced_at: now.toISOString(),
  };

  const { error: error2 } = await supabase
    .from('health_metrics')
    .upsert([test2], {
      onConflict: 'source,source_identifier,start_time',
      ignoreDuplicates: false
    });

  if (error2) {
    console.log(`   ❌ Failed: ${error2.code} - ${error2.message}\n`);
  } else {
    console.log('   ✅ Success! (Old constraint still exists)\n');
    // Clean up
    await supabase
      .from('health_metrics')
      .delete()
      .eq('user_id', testUserId)
      .eq('source_identifier', 'test-constraint-check-2');
  }

  // Test 3: Check if we can insert without conflict
  console.log('Test 3: Direct insert (no upsert)');
  const test3 = {
    user_id: testUserId,
    source: 'healthkit',
    source_identifier: 'test-constraint-check-3',
    metric_type: 'steps',
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    recorded_date: now.toISOString().split('T')[0],
    numeric_value: 3000,
    unit: 'count',
    detail_payload: {},
    sync_status: 'synced',
    synced_at: now.toISOString(),
  };

  const { error: error3 } = await supabase
    .from('health_metrics')
    .insert([test3]);

  if (error3) {
    console.log(`   ❌ Failed: ${error3.code} - ${error3.message}\n`);
  } else {
    console.log('   ✅ Success!\n');
    // Clean up
    await supabase
      .from('health_metrics')
      .delete()
      .eq('user_id', testUserId)
      .eq('source_identifier', 'test-constraint-check-3');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Summary:\n');
  
  if (!error1) {
    console.log('✅ New constraint (with user_id) is working!');
    console.log('   Migration was successful.\n');
  } else if (!error2) {
    console.log('⚠️  Old constraint (without user_id) still exists');
    console.log('   Migration may not have executed correctly.\n');
  } else {
    console.log('❌ Both constraints failed. Please check:');
    console.log('   1. Migration was executed');
    console.log('   2. health_metrics table exists');
    console.log('   3. User ID is valid\n');
  }
}

checkConstraints().catch(console.error);


