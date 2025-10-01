/**
 * Apply Migration 002: Add Bowel Movement Count
 * Adds bowel_movement_count field to daily_symptom_entries table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Applying Migration 002: Add Bowel Movement Count\n');

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_add_bowel_movement_count.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`📁 Reading migration file: ${migrationPath}`);
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  console.log(`📊 Migration size: ${sqlContent.length} characters\n`);

  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('daily_symptom_entries')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking table structure:', checkError);
      throw checkError;
    }

    // Note: We can't directly check column existence via Supabase client
    // So we'll try to execute and handle the error if column exists
    console.log('📝 Executing migration...\n');

    // Execute migration using Supabase Management API or direct SQL
    // Note: Supabase client doesn't support DDL directly
    // User needs to execute this via Supabase Dashboard SQL Editor

    console.log('⚠️  MANUAL EXECUTION REQUIRED\n');
    console.log('Please execute this migration via Supabase Dashboard:\n');
    console.log('1. Visit https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy the content of: supabase/migrations/002_add_bowel_movement_count.sql');
    console.log('5. Paste and click "Run"\n');

    console.log('📋 Migration SQL Preview:');
    console.log('─'.repeat(60));
    console.log(sqlContent);
    console.log('─'.repeat(60));

    console.log('\n✅ After executing, verify with:');
    console.log('   SELECT column_name, data_type');
    console.log('   FROM information_schema.columns');
    console.log('   WHERE table_name = \'daily_symptom_entries\'');
    console.log('   AND column_name = \'bowel_movement_count\';\n');

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

applyMigration();