#!/usr/bin/env node

/**
 * Check actual database structure for diet_daily_users table
 * This script checks if the is_admin column exists
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabaseStructure() {
  console.log('🔍 Checking Database Structure');
  console.log('==============================\n');

  try {
    // Step 1: Try to query diet_daily_users with is_admin column
    console.log('1️⃣ Checking diet_daily_users table structure...');

    const { data: users, error: usersError } = await supabase
      .from('diet_daily_users')
      .select('id, email, name, is_admin, admin_permissions, created_at')
      .limit(3);

    if (usersError) {
      if (usersError.message.includes('column "is_admin" does not exist')) {
        console.log('   ❌ is_admin column does NOT exist in diet_daily_users table');
        console.log('   🛠️  Need to add is_admin column to the database');
        return { hasAdminColumn: false, error: usersError.message };
      } else {
        console.log('   ❌ Error querying users table:', usersError.message);
        return { hasAdminColumn: false, error: usersError.message };
      }
    }

    console.log('   ✅ diet_daily_users table structure is correct');
    console.log(`   📊 Found ${users?.length || 0} users in the table`);

    if (users && users.length > 0) {
      console.log('   👥 Sample users:');
      users.forEach(user => {
        console.log(`      - ${user.email || 'No email'}: admin=${user.is_admin}, name=${user.name || 'No name'}`);
      });
    }

    // Step 2: Check if we can create a user with is_admin
    console.log('\n2️⃣ Checking if we can query admin status...');

    const { data: adminUsers, error: adminError } = await supabase
      .from('diet_daily_users')
      .select('id, email, is_admin')
      .eq('is_admin', true);

    if (adminError) {
      console.log('   ❌ Error querying admin users:', adminError.message);
      return { hasAdminColumn: false, error: adminError.message };
    }

    console.log(`   ✅ Found ${adminUsers?.length || 0} admin users`);
    if (adminUsers && adminUsers.length > 0) {
      adminUsers.forEach(admin => {
        console.log(`      - Admin: ${admin.email}`);
      });
    }

    return { hasAdminColumn: true, adminCount: adminUsers?.length || 0 };

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    return { hasAdminColumn: false, error: error.message };
  }
}

async function suggestFix() {
  console.log('\n🔧 Suggested Fix if Column is Missing:');
  console.log('=====================================');
  console.log('If is_admin column does not exist, run this SQL in Supabase:');
  console.log('');
  console.log('ALTER TABLE diet_daily_users');
  console.log('ADD COLUMN is_admin BOOLEAN DEFAULT false;');
  console.log('');
  console.log('ALTER TABLE diet_daily_users');
  console.log('ADD COLUMN admin_permissions JSONB DEFAULT \'{}\';');
  console.log('');
  console.log('-- Then set admin user');
  console.log('UPDATE diet_daily_users');
  console.log('SET is_admin = true');
  console.log('WHERE email = \'gilko0725@gmail.com\';');
}

async function main() {
  const result = await checkDatabaseStructure();

  if (!result.hasAdminColumn) {
    await suggestFix();

    console.log('\n⚠️  ACTION REQUIRED');
    console.log('==================');
    console.log('1. Add missing columns to diet_daily_users table');
    console.log('2. Set admin user status');
    console.log('3. Apply DELETE policies');
    console.log('4. Test deletion again');
  } else {
    console.log('\n✅ DATABASE STRUCTURE IS CORRECT');
    console.log('=================================');
    console.log('The is_admin column exists. The issue might be:');
    console.log('1. User not set as admin yet');
    console.log('2. DELETE policies not applied yet');
    console.log('3. User not authenticated properly');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkDatabaseStructure, suggestFix };