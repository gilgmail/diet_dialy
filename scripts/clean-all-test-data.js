#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAll() {
  console.log('\n🧹 清理所有測試數據...\n');
  
  const { data, error } = await supabase
    .from('food_entries')
    .delete()
    .like('food_name', '🧪%')
    .select();
  
  if (error) {
    console.error('❌ 清理失敗:', error.message);
    return;
  }
  
  console.log(`✅ 已刪除 ${data.length} 筆測試數據\n`);
  data.forEach(entry => {
    console.log(`   - ${entry.food_name} (ID: ${entry.id})`);
  });
  console.log('');
}

cleanAll();
