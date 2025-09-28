#!/usr/bin/env node

/**
 * Test script to verify the deletion fix works
 * Run this after applying the DELETE policy SQL fix
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDeletionFix() {
  console.log('🧪 Testing deletion fix after applying RLS policies...\n');

  const targetId = '3f090bfe-b8e2-47bb-bc50-f5693d5c42f0';

  try {
    // Step 1: Confirm record exists
    console.log('1️⃣ Checking if record exists...');
    const { data: beforeDelete } = await supabase
      .from('diet_daily_foods')
      .select('id, name, verification_status')
      .eq('id', targetId);

    console.log(`   Records found: ${beforeDelete?.length || 0}`);

    if (beforeDelete && beforeDelete.length > 0) {
      console.log(`   Record: ${beforeDelete[0].name} (${beforeDelete[0].verification_status})`);

      // Step 2: Attempt deletion
      console.log('\n2️⃣ Attempting deletion...');
      const { data: deleteResult, error: deleteError } = await supabase
        .from('diet_daily_foods')
        .delete()
        .eq('id', targetId)
        .select();

      if (deleteError) {
        console.log('❌ Delete failed with error:', deleteError.message);
        return false;
      }

      console.log(`   Records deleted: ${deleteResult?.length || 0}`);

      if (deleteResult && deleteResult.length > 0) {
        console.log('✅ DELETE SUCCESS! Record was successfully deleted.');
        console.log(`   Deleted record: ${deleteResult[0].name}`);

        // Step 3: Verify deletion
        console.log('\n3️⃣ Verifying deletion...');
        const { data: afterDelete } = await supabase
          .from('diet_daily_foods')
          .select('id, name')
          .eq('id', targetId);

        if (!afterDelete || afterDelete.length === 0) {
          console.log('✅ VERIFICATION SUCCESS! Record is permanently deleted.');
          return true;
        } else {
          console.log('❌ VERIFICATION FAILED! Record still exists after deletion.');
          return false;
        }
      } else {
        console.log('❌ DELETE FAILED! No records were affected (RLS policy still blocking).');
        return false;
      }

    } else {
      console.log('ℹ️  Record not found - it may have been deleted already.');
      return true;
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

async function checkPolicyStatus() {
  console.log('\n📋 Checking current DELETE policies...');

  try {
    // This might not work with standard client, but worth trying
    const { data, error } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'diet_daily_foods')
      .eq('cmd', 'DELETE');

    if (!error && data) {
      console.log(`   Found ${data.length} DELETE policies:`);
      data.forEach(policy => {
        console.log(`   - ${policy.policyname}`);
      });
    } else {
      console.log('   Could not check policies (limited access)');
    }
  } catch (error) {
    console.log('   Could not check policies (limited access)');
  }
}

async function main() {
  console.log('🔧 Diet Daily - Deletion Fix Test');
  console.log('=====================================\n');

  await checkPolicyStatus();
  const success = await testDeletionFix();

  console.log('\n📊 Test Results:');
  console.log('================');

  if (success) {
    console.log('✅ DELETION FIX SUCCESSFUL!');
    console.log('   The RLS policy fix has resolved the deletion issue.');
    console.log('   Food records can now be deleted by admins.');
  } else {
    console.log('❌ DELETION FIX INCOMPLETE');
    console.log('   The RLS DELETE policies still need to be applied.');
    console.log('   Please run the SQL fix in Supabase dashboard:');
    console.log(`
CREATE POLICY "Admins can delete foods" ON diet_daily_foods
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);`);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Apply the SQL fix if not done already');
  console.log('2. Test deletion in the admin interface');
  console.log('3. Verify the fix works consistently');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDeletionFix, checkPolicyStatus };