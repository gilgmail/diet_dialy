#!/usr/bin/env node

/**
 * Check food_entries table in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFoodEntries() {
  try {
    console.log('\n🔍 Checking food_entries table...\n');

    // Get total count
    const { count, error: countError } = await supabase
      .from('food_entries')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting entries:', countError);
      return;
    }

    console.log(`📊 Total food entries: ${count || 0}`);

    // Get recent entries
    const { data, error } = await supabase
      .from('food_entries')
      .select('id, user_id, food_name, consumed_at, created_at')
      .order('consumed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching entries:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('\n⚠️  No food entries found in database');
      console.log('💡 You may need to:');
      console.log('   1. Add food entries through the app');
      console.log('   2. Import existing data from JSON files');
      console.log('   3. Create sample data for testing\n');
      return;
    }

    console.log(`\n📅 Recent ${data.length} entries:\n`);
    data.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.food_name}`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   User: ${entry.user_id}`);
      console.log(`   Consumed: ${entry.consumed_at}`);
      console.log(`   Created: ${entry.created_at}`);
      console.log('');
    });

    // Check entries by user
    const { data: users } = await supabase
      .from('food_entries')
      .select('user_id')
      .limit(1000);

    if (users) {
      const uniqueUsers = [...new Set(users.map(u => u.user_id))];
      console.log(`👥 Unique users with food entries: ${uniqueUsers.length}`);
      uniqueUsers.forEach((userId, i) => {
        console.log(`   ${i + 1}. ${userId}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkFoodEntries().then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
});
