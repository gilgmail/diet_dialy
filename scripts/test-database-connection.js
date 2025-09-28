#!/usr/bin/env node

/**
 * 測試 Supabase 資料庫連接
 * 檢查表格是否存在並測試基本操作
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 環境變數未設定');
  console.log('請檢查 .env.local 檔案中的：');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 測試 Supabase 連接...\n');

  try {
    // 測試基本連接
    console.log('1️⃣ 測試基本連接...');
    const { data, error } = await supabase.from('diet_daily_foods').select('count', { count: 'exact', head: true });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('⚠️ 資料表 diet_daily_foods 不存在');
        console.log('📋 需要執行 SQL 腳本來創建表格');
        return false;
      } else {
        throw error;
      }
    }

    console.log(`✅ 連接成功! 找到 ${data || 0} 筆食物資料`);

    // 如果有資料，顯示一些範例
    if (data && data > 0) {
      console.log('\n2️⃣ 取得資料範例...');
      const { data: samples } = await supabase
        .from('diet_daily_foods')
        .select('id, name, name_en, category, calories, verification_status')
        .limit(3);

      if (samples && samples.length > 0) {
        console.log('📊 範例資料:');
        samples.forEach((food, index) => {
          console.log(`  ${index + 1}. ${food.name} (${food.name_en || 'N/A'}) - ${food.category}`);
          console.log(`     熱量: ${food.calories || 'N/A'} kcal, 狀態: ${food.verification_status}`);
        });
      }
    } else {
      console.log('📝 資料表存在但沒有資料，需要匯入食物資料庫');
    }

    return true;

  } catch (error) {
    console.error('❌ 連接錯誤:', error.message);
    return false;
  }
}

async function main() {
  const connected = await testConnection();

  if (!connected) {
    console.log('\n🔧 建議步驟:');
    console.log('1. 在 Supabase Dashboard 中執行 sql-scripts/create_food_tables.sql');
    console.log('2. 執行 sql-scripts/taiwan_1000_foods_database.sql 匯入資料');
    console.log('3. 重新執行此腳本驗證');
  } else {
    console.log('\n✅ 資料庫連接正常！');
  }
}

main().catch(console.error);