#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTestData() {
  const { data, error } = await supabase
    .from('food_entries')
    .select('id, food_name, created_at')
    .eq('user_id', '22e990b6-a888-4beb-9ac6-c9a145731542')
    .like('food_name', '🧪%')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('錯誤:', error.message);
    return;
  }
  
  console.log('\n📋 測試數據列表:');
  console.log('='.repeat(80));
  data.forEach(entry => {
    console.log(`ID: ${entry.id}`);
    console.log(`名稱: ${entry.food_name}`);
    console.log(`時間: ${new Date(entry.created_at).toLocaleString('zh-TW')}`);
    console.log('-'.repeat(80));
  });
  console.log(`\n總共 ${data.length} 筆測試數據\n`);
}

listTestData();
