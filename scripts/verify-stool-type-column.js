#!/usr/bin/env node

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Verify stool_type Column in Database                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Step 1: Verify the column exists in database\n');
console.log('Execute this SQL in Supabase Dashboard > SQL Editor:\n');
console.log('─'.repeat(60));
console.log(`SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_symptom_entries'
  AND column_name = 'stool_type';`);
console.log('─'.repeat(60));
console.log('\n✅ Expected result: One row showing stool_type column details\n');
console.log('❌ If no rows returned: Migration 006 did NOT execute successfully\n');

console.log('\n📋 Step 2: Force schema cache refresh (multiple methods)\n');
console.log('Execute ALL of these commands in Supabase Dashboard > SQL Editor:\n');
console.log('─'.repeat(60));
console.log(`-- Method 1: Standard reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Method 2: Force PostgREST restart
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name = 'PostgREST';

-- Method 3: Verify cache after reload (wait 30 seconds, then run)
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'daily_symptom_entries';`);
console.log('─'.repeat(60));

console.log('\n📋 Step 3: Alternative if still failing\n');
console.log('If errors persist after 5 minutes:\n');
console.log('1. Go to Supabase Dashboard');
console.log('2. Click on your project settings (gear icon)');
console.log('3. Click "Restart project" button');
console.log('4. Wait 2-3 minutes for full restart\n');

console.log('═══════════════════════════════════════════════════════════\n');
