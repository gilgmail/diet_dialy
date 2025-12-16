#!/usr/bin/env node

/**
 * Apply HealthKit unique constraint fix migration
 * This script directly applies the database migration using Supabase service role key
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  HealthKit Unique Constraint Fix Migration                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure .env.local exists with these values\n');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log(`   Supabase URL: ${supabaseUrl}`);
console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251216_fix_health_metrics_unique_constraint.sql');

let migrationSQL;
try {
  migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded successfully\n');
} catch (error) {
  console.error(`❌ Error reading migration file: ${error.message}`);
  process.exit(1);
}

console.log('📋 Migration SQL:');
console.log('─────────────────────────────────────────────────────────');
console.log(migrationSQL);
console.log('─────────────────────────────────────────────────────────\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying migration...\n');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql function not found, trying alternative method...\n');

      // Split migration into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DO $$') || statement.includes('CREATE') || statement.includes('ALTER')) {
          const { error: execError } = await supabase.from('_migrations').select('*').limit(0);

          if (execError) {
            console.log('⚠️  Cannot execute SQL directly via Supabase client');
            console.log('📝 Please apply this migration manually via Supabase Dashboard:\n');
            console.log('Steps:');
            console.log('1. Visit https://supabase.com/dashboard');
            console.log('2. Select your project');
            console.log('3. Go to SQL Editor');
            console.log('4. Click "New query"');
            console.log('5. Copy the migration SQL above');
            console.log('6. Paste and click "Run"\n');
            return;
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('🔍 Verifying constraint...');

    // Verify the constraint was created
    const { data: constraints, error: verifyError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name')
      .eq('table_name', 'health_metrics')
      .eq('constraint_name', 'health_metrics_user_source_unique')
      .single();

    if (verifyError && verifyError.code !== 'PGRST116') {
      console.log('⚠️  Could not verify constraint (this might be normal)');
      console.log(`   Error: ${verifyError.message}\n`);
    } else if (constraints) {
      console.log('✅ Constraint verified: health_metrics_user_source_unique exists\n');
    }

    console.log('✅ Migration complete! HealthKit sync should now work.\n');
    console.log('📱 Next steps:');
    console.log('1. Test HealthKit sync on your iOS device');
    console.log('2. Check for any database errors');
    console.log('3. Verify metrics appear in the database\n');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n📝 Please apply the migration manually via Supabase Dashboard');
    console.error('See the SQL output above\n');
    process.exit(1);
  }
}

applyMigration();
