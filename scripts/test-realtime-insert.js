#!/usr/bin/env node

/**
 * 實時同步測試：插入數據但不刪除，便於觀察 iOS app 的實時更新
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function insertTestData() {
  const userId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542';
  
  log('\n🧪 實時同步測試 - 插入測試數據', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`用戶 ID: ${userId}`, 'blue');
  log(`時間: ${new Date().toLocaleString('zh-TW')}`, 'blue');
  log('');

  const testFoodName = `🧪 測試食物_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
  
  log('📝 插入 food_entry...', 'cyan');
  log(`   食物名稱: ${testFoodName}`, 'yellow');
  
  try {
    const { data, error } = await supabase
      .from('food_entries')
      .insert({
        user_id: userId,
        food_name: testFoodName,
        meal_type: 'breakfast',
        amount: 1,
        unit: '份',
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      log(`❌ INSERT 失敗: ${error.message}`, 'red');
      log(`   錯誤代碼: ${error.code || 'N/A'}`, 'red');
      return null;
    }

    log(`✅ INSERT 成功！`, 'green');
    log(`   記錄 ID: ${data.id}`, 'blue');
    log(`   食物名稱: ${data.food_name}`, 'blue');
    log(`   餐別: ${data.meal_type}`, 'blue');
    log('');
    
    log('💡 測試說明:', 'magenta');
    log('   1. 確保 iOS app 已打開 Food Diary (飲食日記) 頁面', 'yellow');
    log('   2. 查看 app 是否自動顯示新的食物記錄', 'yellow');
    log('   3. 查看終端是否有 [useFoodDiary] Realtime event 日誌', 'yellow');
    log('');
    
    log('🗑️  清理指令:', 'magenta');
    log(`   node scripts/clean-test-data.js ${data.id}`, 'yellow');
    log('');
    
    return data;
  } catch (err) {
    log(`❌ 發生錯誤: ${err.message}`, 'red');
    return null;
  }
}

async function main() {
  log('🚀 開始實時同步測試', 'cyan');
  log('='.repeat(70), 'cyan');
  log('');
  
  const data = await insertTestData();
  
  if (data) {
    log('='.repeat(70), 'cyan');
    log('✅ 測試數據已插入！請檢查 iOS app 是否收到更新', 'green');
    log('='.repeat(70), 'cyan');
  } else {
    log('='.repeat(70), 'cyan');
    log('❌ 測試失敗', 'red');
    log('='.repeat(70), 'cyan');
    process.exit(1);
  }
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

