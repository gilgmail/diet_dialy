#!/usr/bin/env node

/**
 * Add admin user to Supabase
 * This script adds gilko0725@gmail.com as an admin user
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addAdminUser() {
  console.log('👑 Adding Admin User to Supabase');
  console.log('==================================\n');

  const adminEmail = 'gilko0725@gmail.com';

  try {
    // Step 1: Check if user already exists in diet_daily_users table
    console.log('1️⃣ Checking if user exists in diet_daily_users...');
    const { data: existingUsers, error: checkError } = await supabase
      .from('diet_daily_users')
      .select('id, email, is_admin, name')
      .eq('email', adminEmail);

    if (checkError) {
      console.error('❌ Error checking existing users:', checkError.message);
      return false;
    }

    if (existingUsers && existingUsers.length > 0) {
      const user = existingUsers[0];
      console.log(`   ✅ User found: ${user.name || 'Unknown'} (${user.email})`);
      console.log(`   Current admin status: ${user.is_admin ? '👑 Admin' : '👤 Regular User'}`);

      if (user.is_admin) {
        console.log('   ℹ️  User is already an admin!');
        return true;
      } else {
        // Step 2: Update existing user to admin
        console.log('\n2️⃣ Updating user to admin status...');
        const { error: updateError } = await supabase
          .from('diet_daily_users')
          .update({
            is_admin: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Error updating user to admin:', updateError.message);
          return false;
        }

        console.log('   ✅ User successfully updated to admin status!');
        return true;
      }
    } else {
      console.log('   ❌ User not found in diet_daily_users table');
      console.log('   📝 Note: User needs to sign up first, then can be promoted to admin');

      // Step 3: Provide SQL solution for manual admin creation
      console.log('\n2️⃣ Manual Admin Setup Required...');
      console.log('   📋 The user must first exist in auth.users before being added to diet_daily_users');
      console.log('   🔧 Here are the steps to add gilko0725@gmail.com as admin:');
      console.log('');
      console.log('   Option 1 - If user hasn\'t signed up yet:');
      console.log('   1. Have gilko0725@gmail.com sign up through the app first');
      console.log('   2. Then run this SQL in Supabase dashboard:');
      console.log('');
      console.log('      UPDATE diet_daily_users');
      console.log('      SET is_admin = true');
      console.log('      WHERE email = \'gilko0725@gmail.com\';');
      console.log('');
      console.log('   Option 2 - Create user manually (Supabase dashboard):');
      console.log('   1. Go to Authentication > Users in Supabase dashboard');
      console.log('   2. Click "Invite User" and invite gilko0725@gmail.com');
      console.log('   3. After user accepts and completes signup, run this SQL:');
      console.log('');
      console.log('      UPDATE diet_daily_users');
      console.log('      SET is_admin = true');
      console.log('      WHERE email = \'gilko0725@gmail.com\';');
      console.log('');
      console.log('   ⚠️  Note: diet_daily_users.id must reference auth.users(id)');
      console.log('   💡 Tip: Users are automatically added to diet_daily_users on first app login');

      return false;
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    return false;
  }
}

async function verifyAdminAccess() {
  console.log('\n3️⃣ Verifying admin access...');

  const adminEmail = 'gilko0725@gmail.com';

  try {
    const { data: adminUsers, error } = await supabase
      .from('diet_daily_users')
      .select('id, email, is_admin, name, created_at')
      .eq('email', adminEmail)
      .eq('is_admin', true);

    if (error) {
      console.error('   ❌ Error verifying admin access:', error.message);
      return false;
    }

    if (adminUsers && adminUsers.length > 0) {
      const admin = adminUsers[0];
      console.log('   ✅ Admin verification successful!');
      console.log(`   👑 Admin: ${admin.name || 'Unknown'} (${admin.email})`);
      console.log(`   🆔 User ID: ${admin.id}`);
      console.log(`   📅 Created: ${admin.created_at}`);
      return true;
    } else {
      console.log('   ❌ Admin user not found or not properly set');
      return false;
    }

  } catch (error) {
    console.error('   ❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  const success = await addAdminUser();

  if (success) {
    await verifyAdminAccess();

    console.log('\n🎉 SUCCESS!');
    console.log('=============');
    console.log('✅ gilko0725@gmail.com has been added as an admin user');
    console.log('🔧 This should now allow food deletion to work');
    console.log('🧪 Run: node scripts/test-deletion-fix.js to test deletion');

  } else {
    console.log('\n⚠️  MANUAL STEPS REQUIRED');
    console.log('========================');
    console.log('1. Have gilko0725@gmail.com sign up through the app first');
    console.log('2. Or manually run this SQL in Supabase dashboard:');
    console.log(`
UPDATE diet_daily_users
SET is_admin = true
WHERE email = 'gilko0725@gmail.com';`);
    console.log('3. Then test deletion functionality');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addAdminUser, verifyAdminAccess };