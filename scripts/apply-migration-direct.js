#!/usr/bin/env node

/**
 * Apply HealthKit constraint migration directly via database connection
 * This script uses psql or direct database connection to execute the migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  HealthKit Constraint Migration (Direct)                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Error: Could not extract project ref from Supabase URL');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251216_fix_health_metrics_unique_constraint.sql');

let migrationSQL;
try {
  migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded\n');
} catch (error) {
  console.error(`❌ Error reading migration file: ${error.message}`);
  process.exit(1);
}

console.log('📋 Migration Instructions:\n');
console.log('Since Supabase client cannot execute DDL directly, please apply this migration');
console.log('via Supabase Dashboard SQL Editor:\n');
console.log('1. Visit: https://supabase.com/dashboard/project/' + projectRef);
console.log('2. Go to SQL Editor');
console.log('3. Click "New query"');
console.log('4. Copy and paste the SQL below:');
console.log('\n' + '='.repeat(60));
console.log(migrationSQL);
console.log('='.repeat(60) + '\n');
console.log('5. Click "Run" to execute\n');

// Check if psql is available and we have database password
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (dbPassword) {
  console.log('💡 Alternative: Using psql (if available)...\n');
  
  // Construct connection string
  // Format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  // We need to determine the region, but for now, try common format
  const dbUrl = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  
  try {
    // Write SQL to temp file
    const tempFile = path.join(__dirname, '..', 'temp_migration.sql');
    fs.writeFileSync(tempFile, migrationSQL);
    
    console.log('📝 Attempting to execute via psql...\n');
    const result = execSync(`psql "${dbUrl}" -f "${tempFile}"`, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    console.log('\n✅ Migration executed successfully via psql!\n');
    process.exit(0);
  } catch (error) {
    console.log('⚠️  psql execution failed or not available');
    console.log('   Please use Supabase Dashboard method above\n');
    // Clean up temp file if it exists
    const tempFile = path.join(__dirname, '..', 'temp_migration.sql');
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
} else {
  console.log('💡 Tip: Set SUPABASE_DB_PASSWORD in .env.local to use psql method\n');
}

console.log('═══════════════════════════════════════════════════════════\n');
console.log('After applying the migration, run:');
console.log('  node scripts/check-healthkit-constraint.js\n');
console.log('═══════════════════════════════════════════════════════════\n');

