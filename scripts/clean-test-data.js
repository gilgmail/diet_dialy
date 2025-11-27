#!/usr/bin/env node

/**
 * 清理測試數據
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
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function cleanTestData() {
  const entryId = process.argv[2];
  
  if (!entryId) {
    log('❌ 請提供要刪除的記錄 ID', 'red');
    log('使用方式: node scripts/clean-test-data.js <entry_id>', 'cyan');
    process.exit(1);
  }
  
  log(`\n🧹 清理測試數據: ${entryId}`, 'cyan');
  
  try {
    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      log(`❌ 刪除失敗: ${error.message}`, 'red');
      return false;
    }

    log('✅ 已成功刪除測試數據', 'green');
    log('\n💡 如果 iOS app 正在運行，應該會收到 DELETE 事件', 'cyan');
    return true;
  } catch (err) {
    log(`❌ 發生錯誤: ${err.message}`, 'red');
    return false;
  }
}

async function main() {
  const success = await cleanTestData();
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

