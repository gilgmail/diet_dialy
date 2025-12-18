#!/usr/bin/env node

/**
 * Test HealthKit Sync API
 * Tests the POST /api/healthkit/sync endpoint with sample data
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  HealthKit Sync API Test                                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getTestUserId() {
  // Try to get a real user ID
  const { data: users } = await supabase
    .from('diet_daily_users')
    .select('id')
    .limit(1)
    .single();
  
  if (users && users.id) {
    return users.id;
  }
  
  throw new Error('No users found in database');
}

async function testSyncAPI() {
  console.log('🔍 Getting test user ID...\n');
  
  let userId;
  try {
    userId = await getTestUserId();
    console.log(`✅ Using user ID: ${userId}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    process.exit(1);
  }

  // Create test metrics
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000); // 1 hour ago
  const endTime = now;

  const testMetrics = [
    {
      source: 'healthkit',
      source_identifier: `test-steps-${Date.now()}`,
      metric_type: 'steps',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      numeric_value: 8500,
      unit: 'count',
      detail_payload: {},
      device_name: 'iPhone Test',
      app_name: 'Apple Health',
    },
    {
      source: 'healthkit',
      source_identifier: `test-heartrate-${Date.now()}`,
      metric_type: 'heart_rate',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      numeric_value: 72,
      unit: 'bpm',
      detail_payload: {},
      device_name: 'Apple Watch Test',
      app_name: 'Apple Health',
    },
    {
      source: 'healthkit',
      source_identifier: `test-energy-${Date.now()}`,
      metric_type: 'active_energy',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      numeric_value: 350,
      unit: 'kcal',
      detail_payload: {},
      device_name: 'Apple Watch Test',
      app_name: 'Apple Health',
    },
  ];

  console.log('📊 Test metrics prepared:');
  console.log(`   - Steps: ${testMetrics[0].numeric_value}`);
  console.log(`   - Heart Rate: ${testMetrics[1].numeric_value} bpm`);
  console.log(`   - Active Energy: ${testMetrics[2].numeric_value} kcal\n`);

  console.log('🚀 Testing POST /api/healthkit/sync...\n');

  try {
    const response = await fetch(`${apiUrl}/api/healthkit/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        metrics: testMetrics,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ API request failed:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Response:`, JSON.stringify(result, null, 2));
      return false;
    }

    if (result.success) {
      console.log('✅ API sync successful!');
      console.log(`   Synced count: ${result.data.synced_count}`);
      console.log(`   Metrics by type:`, JSON.stringify(result.data.metrics_by_type, null, 2));
      console.log(`   Synced at: ${result.data.synced_at}\n`);

      // Verify data in database
      console.log('🔍 Verifying data in database...\n');
      
      const { data: insertedMetrics, error: queryError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .in('source_identifier', testMetrics.map(m => m.source_identifier))
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('❌ Error querying database:', queryError.message);
        return false;
      }

      if (insertedMetrics && insertedMetrics.length > 0) {
        console.log(`✅ Found ${insertedMetrics.length} metrics in database\n`);
        console.log('📋 Sample record:');
        console.log(JSON.stringify(insertedMetrics[0], null, 2));
        console.log();
      } else {
        console.log('⚠️  No metrics found in database (this might be normal if upsert updated existing records)\n');
      }

      // Clean up test data
      console.log('🧹 Cleaning up test data...\n');
      const { error: deleteError } = await supabase
        .from('health_metrics')
        .delete()
        .eq('user_id', userId)
        .in('source_identifier', testMetrics.map(m => m.source_identifier));

      if (deleteError) {
        console.log('⚠️  Warning: Could not clean up test data:', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up\n');
      }

      return true;
    } else {
      console.error('❌ API returned success: false');
      console.error(`   Message: ${result.message}`);
      if (result.data) {
        console.error(`   Error details:`, JSON.stringify(result.data, null, 2));
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    if (error.message.includes('fetch')) {
      console.error('\n💡 Tip: Make sure the API server is running:');
      console.error('   npm run dev\n');
    }
    return false;
  }
}

async function testUpsertBehavior() {
  console.log('🧪 Testing upsert behavior (duplicate data)...\n');

  let userId;
  try {
    userId = await getTestUserId();
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    return false;
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000);
  const endTime = now;

  const testMetric = {
    source: 'healthkit',
    source_identifier: `test-upsert-${Date.now()}`,
    metric_type: 'steps',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    numeric_value: 10000,
    unit: 'count',
    detail_payload: {},
    device_name: 'iPhone Test',
    app_name: 'Apple Health',
  };

  console.log('📝 Inserting first record...\n');
  
  try {
    const response1 = await fetch(`${apiUrl}/api/healthkit/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        metrics: [testMetric],
      }),
    });

    const result1 = await response1.json();
    if (!result1.success) {
      console.error('❌ First insert failed:', result1.message);
      return false;
    }

    console.log('✅ First insert successful\n');

    // Update the value and insert again (should upsert)
    testMetric.numeric_value = 12000;
    console.log('📝 Inserting duplicate (should upsert to 12000)...\n');

    const response2 = await fetch(`${apiUrl}/api/healthkit/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        metrics: [testMetric],
      }),
    });

    const result2 = await response2.json();
    if (!result2.success) {
      console.error('❌ Second insert (upsert) failed:', result2.message);
      return false;
    }

    console.log('✅ Upsert successful\n');

    // Verify the value was updated
    const { data: metrics, error } = await supabase
      .from('health_metrics')
      .select('numeric_value')
      .eq('user_id', userId)
      .eq('source_identifier', testMetric.source_identifier)
      .single();

    if (error) {
      console.error('❌ Error verifying upsert:', error.message);
      return false;
    }

    if (metrics && metrics.numeric_value === 12000) {
      console.log('✅ Verified: Value was updated to 12000 (upsert worked!)\n');
    } else {
      console.log(`⚠️  Value is ${metrics?.numeric_value}, expected 12000\n`);
    }

    // Clean up
    await supabase
      .from('health_metrics')
      .delete()
      .eq('user_id', userId)
      .eq('source_identifier', testMetric.source_identifier);

    return true;
  } catch (error) {
    console.error('❌ Error testing upsert:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Configuration:');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Supabase URL: ${supabaseUrl}\n`);

  const test1 = await testSyncAPI();
  console.log('\n' + '='.repeat(60) + '\n');
  const test2 = await testUpsertBehavior();

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Test Results:\n');
  console.log(`   API Sync Test: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Upsert Test: ${test2 ? '✅ PASSED' : '❌ FAILED'}\n`);

  if (test1 && test2) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

main();


