#!/usr/bin/env node

/**
 * 檢查 Supabase Realtime 是否已啟用
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkRealtimeStatus() {
  log('\n🔍 檢查 Supabase Realtime 狀態', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  log('1️⃣ 測試 Realtime 連接...', 'cyan');
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log('⏱️  連接超時（可能 Realtime 未啟用）', 'yellow');
      channel.unsubscribe();
      resolve(false);
    }, 10000);

    const channel = supabase
      .channel('test_channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        log('✅ Broadcast 功能正常', 'green');
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          log('✅ Realtime 連接成功！', 'green');
          log(`   狀態: ${status}`, 'blue');
          channel.unsubscribe();
          resolve(true);
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          log('❌ Realtime 連接失敗', 'red');
          log(`   錯誤: ${err?.message || '未知錯誤'}`, 'red');
          channel.unsubscribe();
          resolve(false);
        } else {
          log(`   狀態: ${status}`, 'yellow');
        }
      });
  });
}

async function checkTableReplication() {
  log('\n2️⃣ 檢查 food_entries 表的 Realtime 複製...', 'cyan');
  
  try {
    const { data, error } = await supabase
      .from('food_entries')
      .select('id')
      .limit(1);

    if (error) {
      log(`❌ 無法查詢表: ${error.message}`, 'red');
      return false;
    }

    log('✅ food_entries 表可訪問', 'green');
    return true;
  } catch (err) {
    log(`❌ 查詢錯誤: ${err.message}`, 'red');
    return false;
  }
}

async function testRealtimeSubscription() {
  log('\n3️⃣ 測試 food_entries Realtime 訂閱...', 'cyan');
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log('⏱️  訂閱超時', 'yellow');
      log('💡 這可能表示表的 Realtime 複製未啟用', 'yellow');
      channel.unsubscribe();
      resolve(false);
    }, 5000);

    const channel = supabase
      .channel('food_entries_test')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
        },
        (payload) => {
          log('✅ 收到資料庫變更事件！', 'green');
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          log('✅ food_entries 訂閱成功！', 'green');
          log('   Realtime 複製已啟用', 'green');
          channel.unsubscribe();
          resolve(true);
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          log('❌ 訂閱失敗', 'red');
          log(`   錯誤: ${err?.message || '未知錯誤'}`, 'red');
          channel.unsubscribe();
          resolve(false);
        } else {
          log(`   狀態: ${status}`, 'yellow');
        }
      });
  });
}

async function main() {
  log('🚀 Supabase Realtime 診斷工具', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Supabase URL: ${supabaseUrl}`, 'blue');
  log('');

  const realtimeOk = await checkRealtimeStatus();
  const tableOk = await checkTableReplication();
  const subscriptionOk = await testRealtimeSubscription();

  log('\n' + '='.repeat(60), 'cyan');
  log('📊 診斷結果', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Realtime 基礎連接: ${realtimeOk ? '✅' : '❌'}`, realtimeOk ? 'green' : 'red');
  log(`food_entries 表訪問: ${tableOk ? '✅' : '❌'}`, tableOk ? 'green' : 'red');
  log(`food_entries Realtime 訂閱: ${subscriptionOk ? '✅' : '❌'}`, subscriptionOk ? 'green' : 'red');
  log('');

  if (realtimeOk && tableOk && subscriptionOk) {
    log('🎉 所有檢查通過！Realtime 功能正常', 'green');
  } else {
    log('⚠️  發現問題，需要修復:', 'yellow');
    if (!realtimeOk) {
      log('   1. 檢查 Supabase Dashboard → Settings → API → Realtime', 'yellow');
    }
    if (!subscriptionOk) {
      log('   2. 檢查 Supabase Dashboard → Database → Replication', 'yellow');
      log('      確保 food_entries 表已啟用 Realtime', 'yellow');
    }
  }
  log('='.repeat(60), 'cyan');

  process.exit(0);
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

