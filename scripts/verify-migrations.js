#!/usr/bin/env node

/**
 * Verify Migrations Execution
 * Checks if migrations were successfully applied
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Migration Verification Tool                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function checkTableExists() {
  console.log('1️⃣ Checking if daily_symptom_entries table exists...\n');

  try {
    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        console.log('❌ Table does NOT exist');
        console.log('   Error:', error.message);
        console.log('\n   → You need to execute Migration 001 first!');
        console.log('   → File: supabase/migrations/001_daily_symptom_tracking.sql\n');
        return false;
      }
      console.log('⚠️  Error checking table:', error.message);
      return false;
    }

    console.log('✅ Table exists!\n');
    return true;
  } catch (err) {
    console.log('❌ Error:', err.message, '\n');
    return false;
  }
}

async function checkBowelMovementColumn() {
  console.log('2️⃣ Checking if bowel_movement_count column exists...\n');

  try {
    // Try to select the column
    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .select('bowel_movement_count')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Column does NOT exist');
        console.log('   Error:', error.message);
        console.log('\n   → You need to execute Migration 002!');
        console.log('   → Run: node scripts/apply-migrations.js\n');
        return false;
      }
      console.log('⚠️  Unexpected error:', error.message);
      return false;
    }

    console.log('✅ Column exists!\n');
    return true;
  } catch (err) {
    console.log('❌ Error:', err.message, '\n');
    return false;
  }
}

async function checkRLSPolicies() {
  console.log('3️⃣ Checking RLS policies...\n');

  try {
    // Use raw SQL to check policies
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, cmd, permissive, qual, with_check
        FROM pg_policies
        WHERE tablename = 'daily_symptom_entries'
        ORDER BY policyname;
      `
    });

    if (error) {
      // Fallback: try to insert a test record to check if RLS allows it
      console.log('⚠️  Cannot query policies directly (need service role key)');
      console.log('   Testing RLS by attempting insert...\n');

      const testUserId = '00000000-0000-0000-0000-000000000000';
      const { error: insertError } = await supabase
        .from('daily_symptom_entries')
        .insert({
          user_id: testUserId,
          recorded_date: '2025-01-01',
          overall_health: 3,
          abdominal_pain: 0,
          diarrhea: 0,
          bloody_stool: 0,
          bloating: 0
        });

      if (insertError) {
        if (insertError.code === '42501') {
          console.log('❌ RLS policy is BLOCKING inserts (old policy active)');
          console.log('   Error:', insertError.message);
          console.log('\n   → You need to execute Migration 004!');
          console.log('   → Run: node scripts/apply-migrations.js\n');
          return false;
        }
      } else {
        console.log('✅ RLS allows inserts (temporary policy active)');
        // Clean up test record
        await supabase
          .from('daily_symptom_entries')
          .delete()
          .eq('user_id', testUserId)
          .eq('recorded_date', '2025-01-01');
        console.log('   (Test record cleaned up)\n');
        return true;
      }
    }

    console.log('✅ Found', data?.length || 0, 'RLS policies\n');
    if (data && data.length > 0) {
      data.forEach(policy => {
        console.log('   -', policy.policyname, `(${policy.cmd})`);
      });
      console.log();
    }
    return true;
  } catch (err) {
    console.log('⚠️  Error checking policies:', err.message, '\n');
    return false;
  }
}

async function testDataInsertion() {
  console.log('4️⃣ Testing data insertion...\n');

  const testUserId = 'test-' + Date.now();

  try {
    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .insert({
        user_id: testUserId,
        recorded_date: '2025-01-01',
        overall_health: 3,
        abdominal_pain: 0,
        diarrhea: 0,
        bloody_stool: 0,
        bloating: 0,
        bowel_movement_count: 2
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Insert FAILED');
      console.log('   Error code:', error.code);
      console.log('   Error:', error.message);

      if (error.code === '42501') {
        console.log('\n   → RLS policy is blocking! Execute Migration 004\n');
      } else if (error.message.includes('bowel_movement_count')) {
        console.log('\n   → bowel_movement_count column missing! Execute Migration 002\n');
      }
      return false;
    }

    console.log('✅ Insert SUCCESS!');
    console.log('   Record ID:', data.id);
    console.log('   bowel_movement_count:', data.bowel_movement_count);

    // Clean up
    await supabase
      .from('daily_symptom_entries')
      .delete()
      .eq('id', data.id);

    console.log('   (Test record cleaned up)\n');
    return true;
  } catch (err) {
    console.log('❌ Error:', err.message, '\n');
    return false;
  }
}

async function main() {
  const results = {
    tableExists: false,
    columnExists: false,
    rlsCorrect: false,
    insertWorks: false
  };

  results.tableExists = await checkTableExists();

  if (results.tableExists) {
    results.columnExists = await checkBowelMovementColumn();
    results.rlsCorrect = await checkRLSPolicies();

    if (results.tableExists && results.columnExists && results.rlsCorrect) {
      results.insertWorks = await testDataInsertion();
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 SUMMARY:\n');
  console.log('   Table exists:', results.tableExists ? '✅' : '❌');
  console.log('   Column exists:', results.columnExists ? '✅' : '❌');
  console.log('   RLS correct:', results.rlsCorrect ? '✅' : '❌');
  console.log('   Insert works:', results.insertWorks ? '✅' : '❌');
  console.log();

  if (results.tableExists && results.columnExists && results.rlsCorrect && results.insertWorks) {
    console.log('🎉 ALL CHECKS PASSED! System is ready for testing.\n');
    console.log('   → Visit http://localhost:3000/symptoms to test\n');
  } else {
    console.log('⚠️  SOME CHECKS FAILED\n');
    console.log('📋 Action Items:\n');

    if (!results.tableExists) {
      console.log('   1. Execute Migration 001 (create tables)');
    }
    if (!results.columnExists) {
      console.log('   2. Execute Migration 002 (add bowel_movement_count)');
    }
    if (!results.rlsCorrect) {
      console.log('   3. Execute Migration 004 (temporary RLS fix)');
    }
    console.log('\n   Run: node scripts/apply-migrations.js');
    console.log('   Then execute the SQL in Supabase Dashboard\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);