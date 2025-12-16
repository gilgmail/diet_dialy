#!/usr/bin/env node

/**
 * Check HealthKit constraint status
 * Verifies if the correct UNIQUE constraint exists on health_metrics table
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  HealthKit Constraint Status Check                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraintStatus() {
  console.log('🔍 Checking health_metrics table constraints...\n');

  try {
    // Query to check all UNIQUE constraints on health_metrics table
    const query = `
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'health_metrics'
        AND constraint_type = 'UNIQUE'
      ORDER BY constraint_name;
    `;

    // Use RPC or direct query if available
    // Since we can't directly query information_schema via Supabase client,
    // we'll try to detect the constraint by testing upsert behavior
    
    console.log('📋 Attempting to check constraints...\n');
    
    // First, try to get a real user ID from existing data
    let testUserId = null;
    
    // Try to get user ID from existing health_metrics
    const { data: existingMetrics } = await supabase
      .from('health_metrics')
      .select('user_id')
      .limit(1)
      .single();
    
    if (existingMetrics && existingMetrics.user_id) {
      testUserId = existingMetrics.user_id;
      console.log(`✅ Found existing user ID: ${testUserId}\n`);
    } else {
      // Try to get any user from diet_daily_users
      const { data: users } = await supabase
        .from('diet_daily_users')
        .select('id')
        .limit(1)
        .single();
      
      if (users && users.id) {
        testUserId = users.id;
        console.log(`✅ Found user ID from users table: ${testUserId}\n`);
      } else {
        console.log('⚠️  No users found in database. Cannot test constraint.\n');
        console.log('📝 Please ensure:');
        console.log('   1. Database has at least one user');
        console.log('   2. Or manually check constraint via Supabase Dashboard\n');
        return false;
      }
    }
    
    // Test 1: Try to get constraint info via raw SQL (if possible)
    // Note: Supabase client doesn't support direct information_schema queries
    // So we'll test by attempting an upsert operation
    
    const testMetric = {
      user_id: testUserId,
      source: 'healthkit',
      source_identifier: 'test-check-constraint-' + Date.now(),
      metric_type: 'steps',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      recorded_date: new Date().toISOString().split('T')[0],
      numeric_value: 0,
      unit: 'count',
      detail_payload: {},
      sync_status: 'synced',
      synced_at: new Date().toISOString(),
    };

    console.log('🧪 Testing upsert with onConflict: user_id,source,source_identifier,start_time');
    
    const { data, error } = await supabase
      .from('health_metrics')
      .upsert([testMetric], {
        onConflict: 'user_id,source,source_identifier,start_time',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Upsert test failed:');
      console.error(`   Code: ${error.code}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Details: ${error.details || 'N/A'}`);
      console.error(`   Hint: ${error.hint || 'N/A'}\n`);

      // Check if error is related to constraint mismatch
      if (error.code === '42P10' || error.message.includes('no unique or exclusion constraint matching the ON CONFLICT') || 
          error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
        console.log('⚠️  Constraint mismatch detected!');
        console.log('   The onConflict columns do not match the database constraint.');
        console.log('   Current constraint likely: (source, source_identifier, start_time)');
        console.log('   Required constraint: (user_id, source, source_identifier, start_time)\n');
        console.log('📝 Action required:');
        console.log('   1. Execute migration: supabase/migrations/20251216_fix_health_metrics_unique_constraint.sql');
        console.log('   2. Or run: node scripts/apply-healthkit-constraint-fix.js\n');
      } else {
        console.log('⚠️  Unknown error. Please check the error details above.\n');
      }

      // Clean up test data
      if (testUserId) {
        await supabase
          .from('health_metrics')
          .delete()
          .eq('user_id', testUserId)
          .like('source_identifier', 'test-check-constraint%');
      }

      return false;
    } else {
      console.log('✅ Upsert test successful!');
      console.log('   The constraint appears to be correctly configured.\n');

      // Clean up test data
      if (testUserId) {
        await supabase
          .from('health_metrics')
          .delete()
          .eq('user_id', testUserId)
          .like('source_identifier', 'test-check-constraint%');
      }

      // Try to verify constraint exists by checking if we can query it
      // Note: We can't directly query information_schema, but we can infer
      // that if upsert works, the constraint likely exists
      
      console.log('✅ Constraint check passed!');
      console.log('   The health_metrics table has the correct UNIQUE constraint.\n');
      
      return true;
    }
  } catch (err) {
    console.error('❌ Error during constraint check:', err.message);
    console.error('\n📝 Please check:');
    console.error('   1. Database connection is working');
    console.error('   2. health_metrics table exists');
    console.error('   3. Environment variables are set correctly\n');
    return false;
  }
}

async function main() {
  const result = await checkConstraintStatus();
  
  console.log('═══════════════════════════════════════════════════════════\n');
  if (result) {
    console.log('✅ Status: Constraint is correctly configured\n');
    console.log('📱 Next steps:');
    console.log('   1. Test HealthKit sync API');
    console.log('   2. Test mobile app integration\n');
  } else {
    console.log('❌ Status: Constraint needs to be fixed\n');
    console.log('📝 Next steps:');
    console.log('   1. Execute migration via Supabase Dashboard');
    console.log('   2. Or run: node scripts/apply-healthkit-constraint-fix.js');
    console.log('   3. Re-run this check script\n');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(result ? 0 : 1);
}

main();

