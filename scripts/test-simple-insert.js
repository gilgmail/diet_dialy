#!/usr/bin/env node

/**
 * Simple insert test to check if table structure is correct
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

async function testInsert() {
  console.log('🧪 Testing simple insert...\n');

  // Get a real user ID
  const { data: users } = await supabase
    .from('diet_daily_users')
    .select('id')
    .limit(1)
    .single();

  if (!users || !users.id) {
    console.error('❌ No users found');
    process.exit(1);
  }

  const userId = users.id;
  console.log(`✅ Using user ID: ${userId}\n`);

  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000);

  const testData = {
    user_id: userId,
    source: 'healthkit',
    source_identifier: `test-simple-${Date.now()}`,
    metric_type: 'steps',
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    recorded_date: now.toISOString().split('T')[0],
    numeric_value: 5000,
    unit: 'count',
    detail_payload: {},
    device_name: 'iPhone Test',
    app_name: 'Apple Health',
    sync_status: 'synced',
    synced_at: now.toISOString(),
  };

  console.log('📝 Attempting insert...\n');
  console.log('Data:', JSON.stringify(testData, null, 2));
  console.log();

  const { data, error } = await supabase
    .from('health_metrics')
    .insert([testData])
    .select();

  if (error) {
    console.error('❌ Insert failed:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Details: ${error.details || 'N/A'}`);
    console.error(`   Hint: ${error.hint || 'N/A'}\n`);
    
    // Check if it's a constraint issue
    if (error.code === '23505') {
      console.log('💡 This is a unique constraint violation.');
      console.log('   This means a constraint exists, but the data violates it.\n');
    } else if (error.code === '42P10') {
      console.log('💡 This error suggests constraint configuration issue.');
      console.log('   The constraint might not be properly set up.\n');
    }
    
    return false;
  } else {
    console.log('✅ Insert successful!');
    console.log('Inserted record:', JSON.stringify(data[0], null, 2));
    console.log();

    // Clean up
    await supabase
      .from('health_metrics')
      .delete()
      .eq('id', data[0].id);

    console.log('🧹 Test data cleaned up\n');
    return true;
  }
}

testInsert().catch(console.error);


