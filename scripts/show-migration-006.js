#!/usr/bin/env node

/**
 * Display Migration 006 SQL for execution in Supabase Dashboard
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Migration 006: Add Stool Type Column              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const migrationPath = path.join(__dirname, '../supabase/migrations/006_add_stool_type.sql');

try {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📋 Execute the following SQL in Supabase Dashboard:\n');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('\n📍 Steps to Execute:\n');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project: diet_dialy');
  console.log('3. Click on "SQL Editor" in the left sidebar');
  console.log('4. Click "New Query"');
  console.log('5. Copy the SQL above and paste it');
  console.log('6. Click "Run" to execute\n');
  console.log('✅ After execution, the stool_type column will be added\n');
  console.log('═══════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}