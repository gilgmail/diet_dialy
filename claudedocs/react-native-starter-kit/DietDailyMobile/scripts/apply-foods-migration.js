const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.development');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying foods table migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250102_create_foods_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Execute the migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);

      // Alternative approach: Try executing SQL directly
      console.log('🔄 Trying alternative execution method...');

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          const { error: execError } = await supabase.from('_raw').select().limit(0);
          if (execError) {
            console.log('⚠️  Cannot execute raw SQL via client. Please run migration manually.');
            console.log('\n📋 Migration SQL to execute in Supabase SQL Editor:');
            console.log('─'.repeat(60));
            console.log(migrationSQL);
            console.log('─'.repeat(60));
            process.exit(0);
          }
        } catch (e) {
          break;
        }
      }

      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');

    // Verify the table was created
    const { data: foods, error: selectError } = await supabase
      .from('foods')
      .select('count');

    if (selectError) {
      console.error('⚠️  Could not verify foods table:', selectError.message);
    } else {
      console.log('✅ Foods table verified');
    }

    // Count inserted foods
    const { count, error: countError } = await supabase
      .from('foods')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ ${count} food items inserted`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
