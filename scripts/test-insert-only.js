#!/usr/bin/env node

/**
 * 簡化測試：只測試 INSERT 操作
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
// 優先使用 service role key（繞過 RLS，適合測試）
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testAccessToken = process.env.TEST_ACCESS_TOKEN;
const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: (!usingServiceRole && testAccessToken) ? {
      Authorization: `Bearer ${testAccessToken}`
    } : {}
  }
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testInsert() {
  const userId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542';
  
  log('\n🧪 測試 INSERT 操作', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`用戶 ID: ${userId}`, 'blue');
  log(`Supabase URL: ${supabaseUrl}`, 'blue');
  log('');

  // 如果使用 anon key，先設置認證
  if (!usingServiceRole && testAccessToken) {
    log('🔐 設置認證...', 'cyan');
    try {
      const { data, error } = await supabase.auth.getUser(testAccessToken);
      if (error) {
        log('⚠️  Token 驗證失敗: ' + error.message, 'yellow');
      } else if (data?.user) {
        log('✅ Token 驗證成功', 'green');
        log(`   用戶 ID: ${data.user.id}`, 'blue');
      }
    } catch (err) {
      log('⚠️  Token 驗證錯誤: ' + err.message, 'yellow');
    }
    log('');
  }

  // 測試 food_entries INSERT
  log('📋 測試 food_entries INSERT...', 'cyan');
  try {
    const { data, error } = await supabase
      .from('food_entries')
      .insert({
        user_id: userId,
        food_name: `測試食物_${Date.now()}`,
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
      return false;
    } else {
      log(`✅ INSERT 成功！`, 'green');
      log(`   記錄 ID: ${data.id}`, 'blue');
      log(`   食物名稱: ${data.food_name}`, 'blue');
      
      // 清理測試資料
      log('\n🧹 清理測試資料...', 'cyan');
      await supabase.from('food_entries').delete().eq('id', data.id);
      log('✅ 已清理', 'green');
      return true;
    }
  } catch (err) {
    log(`❌ 發生錯誤: ${err.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 開始簡化測試（僅 INSERT）', 'cyan');
  log('='.repeat(60), 'cyan');
  
  if (usingServiceRole) {
    log('ℹ️  使用 Service Role Key（將繞過 RLS）', 'blue');
  } else if (testAccessToken) {
    log('ℹ️  使用 Anon Key + Access Token', 'blue');
  } else {
    log('⚠️  使用 Anon Key（可能無法通過 RLS）', 'yellow');
  }
  log('');
  
  const success = await testInsert();
  
  log('\n' + '='.repeat(60), 'cyan');
  if (success) {
    log('✅ 測試通過！INSERT 操作正常', 'green');
  } else {
    log('❌ 測試失敗', 'red');
    if (!usingServiceRole && !testAccessToken) {
      log('\n💡 建議:', 'cyan');
      log('   1. 設置 SUPABASE_SERVICE_ROLE_KEY 以繞過 RLS', 'blue');
      log('   2. 或設置有效的 TEST_ACCESS_TOKEN', 'blue');
    }
  }
  log('='.repeat(60), 'cyan');
  
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  process.exit(1);
});

