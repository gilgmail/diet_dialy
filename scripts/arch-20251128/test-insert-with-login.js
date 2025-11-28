#!/usr/bin/env node

/**
 * 簡化測試：使用登入獲取新 token，然後測試 INSERT 操作
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;
const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testInsert() {
  let userId;
  
  log('\n🧪 測試 INSERT 操作', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Supabase URL: ${supabaseUrl}`, 'blue');
  log('');

  // 如果不是使用 service role，先登入獲取 token
  if (!usingServiceRole) {
    if (!testEmail || !testPassword) {
      log('❌ 需要設置 TEST_USER_EMAIL 和 TEST_USER_PASSWORD', 'red');
      log('   或設置 SUPABASE_SERVICE_ROLE_KEY', 'yellow');
      return false;
    }

    log('🔐 使用測試帳號登入...', 'cyan');
    log(`   Email: ${testEmail}`, 'blue');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (error) {
        log(`❌ 登入失敗: ${error.message}`, 'red');
        return false;
      }

      if (!data?.user) {
        log('❌ 登入失敗：未獲取到用戶資訊', 'red');
        return false;
      }

      userId = data.user.id;
      log('✅ 登入成功！', 'green');
      log(`   用戶 ID: ${userId}`, 'blue');
      log(`   Session: ${data.session ? '有效' : '無效'}`, 'blue');
      log('');
    } catch (err) {
      log(`❌ 登入錯誤: ${err.message}`, 'red');
      return false;
    }
  } else {
    // 使用命令列參數或預設的用戶 ID
    userId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542';
    log(`用戶 ID: ${userId}`, 'blue');
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
      if (error.details) {
        log(`   詳細資訊: ${error.details}`, 'red');
      }
      return false;
    } else {
      log(`✅ INSERT 成功！`, 'green');
      log(`   記錄 ID: ${data.id}`, 'blue');
      log(`   食物名稱: ${data.food_name}`, 'blue');
      log(`   用戶 ID: ${data.user_id}`, 'blue');
      
      // 清理測試資料
      log('\n🧹 清理測試資料...', 'cyan');
      const { error: deleteError } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', data.id);
      
      if (deleteError) {
        log(`⚠️  清理失敗: ${deleteError.message}`, 'yellow');
      } else {
        log('✅ 已清理', 'green');
      }
      
      return true;
    }
  } catch (err) {
    log(`❌ 發生錯誤: ${err.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 開始簡化測試（使用登入 + INSERT）', 'cyan');
  log('='.repeat(60), 'cyan');
  
  if (usingServiceRole) {
    log('ℹ️  使用 Service Role Key（將繞過 RLS）', 'blue');
  } else if (testEmail && testPassword) {
    log('ℹ️  使用測試帳號登入以獲取有效 token', 'blue');
  } else {
    log('⚠️  缺少登入憑證', 'yellow');
  }
  log('');
  
  const success = await testInsert();
  
  log('\n' + '='.repeat(60), 'cyan');
  if (success) {
    log('✅ 測試通過！INSERT 操作正常', 'green');
  } else {
    log('❌ 測試失敗', 'red');
    if (!usingServiceRole) {
      log('\n💡 建議:', 'cyan');
      log('   1. 在 .env.local 中設置:', 'blue');
      log('      TEST_USER_EMAIL=your@email.com', 'blue');
      log('      TEST_USER_PASSWORD=yourpassword', 'blue');
      log('   2. 或設置 SUPABASE_SERVICE_ROLE_KEY 以繞過 RLS', 'blue');
    }
  }
  log('='.repeat(60), 'cyan');
  
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

