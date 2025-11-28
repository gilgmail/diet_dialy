#!/usr/bin/env node

/**
 * Migration Application Helper
 * Displays migration SQL for manual execution in Supabase Dashboard
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Supabase Migration Helper - Testing Setup             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('⚠️  IMPORTANT: Manual Execution Required\n');
console.log('These migrations must be executed via Supabase Dashboard:\n');

console.log('📍 Steps:');
console.log('1. Visit https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to SQL Editor');
console.log('4. Click "New query"');
console.log('5. Copy and paste the SQL below');
console.log('6. Click "Run"\n');

console.log('═══════════════════════════════════════════════════════════\n');

// Migration 002: Add bowel_movement_count
console.log('📋 MIGRATION 002: Add Bowel Movement Count Field\n');
console.log('Purpose: Add bowel_movement_count column (0-50, nullable)\n');

const migration002Path = path.join(__dirname, '..', 'supabase', 'migrations', '002_add_bowel_movement_count.sql');
try {
  const migration002 = fs.readFileSync(migration002Path, 'utf8');
  console.log('```sql');
  console.log(migration002);
  console.log('```\n');
} catch (error) {
  console.error('❌ Error reading migration 002:', error.message);
}

console.log('═══════════════════════════════════════════════════════════\n');

// Migration 004: Temporary RLS fix
console.log('📋 MIGRATION 004: Temporary RLS Policy (for testing only)\n');
console.log('⚠️  WARNING: This is TEMPORARY for development/testing');
console.log('Purpose: Allow data insertion for testing without auth.uid() issues\n');

const migration004Path = path.join(__dirname, '..', 'supabase', 'migrations', '004_temporary_rls_fix.sql');
try {
  const migration004 = fs.readFileSync(migration004Path, 'utf8');
  console.log('```sql');
  console.log(migration004);
  console.log('```\n');
} catch (error) {
  console.error('❌ Error reading migration 004:', error.message);
}

console.log('═══════════════════════════════════════════════════════════\n');

console.log('✅ After Testing is Complete:\n');
console.log('Execute Migration 005 to restore proper RLS security:');
console.log('File: supabase/migrations/005_restore_proper_rls.sql\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('📊 Verification Steps:\n');
console.log('After executing migrations, verify in Supabase Dashboard:\n');

console.log('-- Check bowel_movement_count column exists:');
console.log('SELECT column_name, data_type, is_nullable');
console.log('FROM information_schema.columns');
console.log("WHERE table_name = 'daily_symptom_entries'");
console.log("AND column_name = 'bowel_movement_count';\n");

console.log('-- Check RLS policies:');
console.log('SELECT tablename, policyname, permissive, roles, cmd');
console.log('FROM pg_policies');
console.log("WHERE tablename = 'daily_symptom_entries';\n");

console.log('═══════════════════════════════════════════════════════════\n');

console.log('🚀 Next Steps:');
console.log('1. Execute Migration 002 (bowel_movement_count)');
console.log('2. Execute Migration 004 (temporary RLS)');
console.log('3. Test symptom recording at http://localhost:3000/symptoms');
console.log('4. After confirming everything works, execute Migration 005');
console.log('5. Implement proper server-side auth for production\n');

console.log('═══════════════════════════════════════════════════════════\n');