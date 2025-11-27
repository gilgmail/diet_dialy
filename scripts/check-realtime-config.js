#!/usr/bin/env node

/**
 * 檢查 Supabase Realtime 配置
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testAccessToken = process.env.TEST_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: testAccessToken ? {
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

async function checkRealtimeConfig() {
  log('\n🔍 檢查 Supabase Realtime 配置', 'cyan');
  log('='.repeat(60), 'cyan');

  // 1. 檢查連接
  log('\n1️⃣ 測試 Supabase 連接...', 'cyan');
  try {
    const { data, error } = await supabase.from('food_entries').select('count', { count: 'exact', head: true });
    if (error) {
      log(`❌ 連接失敗: ${error.message}`, 'red');
      return;
    }
    log('✅ Supabase 連接成功', 'green');
  } catch (err) {
    log(`❌ 連接錯誤: ${err.message}`, 'red');
    return;
  }

  // 2. 檢查認證
  if (testAccessToken) {
    log('\n2️⃣ 檢查認證狀態...', 'cyan');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(testAccessToken);
      if (userError) {
        log(`⚠️  認證失敗: ${userError.message}`, 'yellow');
      } else if (userData?.user) {
        log('✅ 認證成功', 'green');
        log(`   用戶 ID: ${userData.user.id}`, 'blue');
        log(`   用戶 Email: ${userData.user.email}`, 'blue');
      }
    } catch (err) {
      log(`⚠️  認證檢查錯誤: ${err.message}`, 'yellow');
    }
  } else {
    log('\n2️⃣ 認證狀態: 未設置 Access Token', 'yellow');
  }

  // 3. 測試 Realtime Subscription
  log('\n3️⃣ 測試 Realtime Subscription...', 'cyan');
  return new Promise((resolve) => {
    let eventReceived = false;
    const channel = supabase
      .channel('test_realtime_check')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
        },
        (payload) => {
          log(`\n📨 收到 Realtime 事件: ${payload.eventType}`, 'green');
          eventReceived = true;
        }
      )
      .subscribe((status, err) => {
        log(`\n   Subscription 狀態: ${status}`, status === 'SUBSCRIBED' ? 'green' : 'yellow');
        if (err) {
          log(`   錯誤: ${err.message || JSON.stringify(err)}`, 'red');
        }

        if (status === 'SUBSCRIBED') {
          log('   ✅ Realtime Subscription 已連接', 'green');
          log('\n4️⃣ 測試插入資料以觸發事件...', 'cyan');
          
          // 等待一下然後插入測試資料
          setTimeout(async () => {
            const testUserId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542';
            log(`   插入測試資料（用戶: ${testUserId}）...`, 'blue');
            
            const { data, error } = await supabase
              .from('food_entries')
              .insert({
                user_id: testUserId,
                food_name: `Realtime測試_${Date.now()}`,
                meal_type: 'breakfast',
                amount: 1,
                unit: '份',
                consumed_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) {
              log(`   ❌ 插入失敗: ${error.message}`, 'red');
            } else {
              log(`   ✅ 插入成功: ${data.id}`, 'green');
              log('   等待 Realtime 事件（5 秒）...', 'blue');
              
              // 等待事件
              setTimeout(() => {
                if (eventReceived) {
                  log('\n✅ Realtime 功能正常運作！', 'green');
                } else {
                  log('\n⚠️  未收到 Realtime 事件', 'yellow');
                  log('   可能的原因:', 'yellow');
                  log('   1. Supabase Realtime 未啟用（檢查 Dashboard > Database > Realtime）', 'blue');
                  log('   2. food_entries 表的 Realtime 未啟用', 'blue');
                  log('   3. 網路延遲（事件可能需要更長時間）', 'blue');
                  log('   4. RLS 政策可能影響 Realtime 事件傳遞', 'blue');
                }
                
                // 清理測試資料
                if (data?.id) {
                  supabase.from('food_entries').delete().eq('id', data.id).then(() => {
                    log('   已清理測試資料', 'blue');
                  });
                }
                
                channel.unsubscribe();
                resolve();
              }, 5000);
            }
          }, 2000);
        } else {
          log('   ❌ Realtime Subscription 連接失敗', 'red');
          log('   請檢查 Supabase Dashboard > Database > Realtime', 'yellow');
          resolve();
        }
      });

    // 超時
    setTimeout(() => {
      if (!eventReceived) {
        log('\n⏱️  測試超時', 'yellow');
        channel.unsubscribe();
        resolve();
      }
    }, 15000);
  });
}

checkRealtimeConfig().catch(console.error);

