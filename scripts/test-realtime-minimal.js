#!/usr/bin/env node

/**
 * 最小化 Realtime 測試
 * 僅測試 subscription 連接，不進行資料庫操作
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542';

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

async function testRealtimeConnection() {
  log('\n🧪 測試 Realtime 連接（不進行資料庫操作）', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`用戶 ID: ${userId}`, 'blue');
  log('');

  return new Promise((resolve) => {
    let timeout;
    let resolved = false;

    const channel = supabase
      .channel('minimal_test', {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          log(`\n📨 收到事件: ${payload.eventType}`, 'green');
          log(`   資料 ID: ${payload.new?.id || payload.old?.id}`, 'blue');
        }
      )
      .subscribe((status, err) => {
        log(`\n🔌 Subscription 狀態: ${status}`, status === 'SUBSCRIBED' ? 'green' : 'yellow');
        if (err) {
          log(`   錯誤: ${err.message || JSON.stringify(err)}`, 'red');
        }

        if (status === 'SUBSCRIBED') {
          log('✅ Subscription 成功連接！', 'green');
          log('', 'reset');
          log('💡 提示:', 'cyan');
          log('   - Realtime 連接正常', 'blue');
          log('   - 現在可以手動在 Supabase Dashboard 測試插入資料', 'blue');
          log('   - 或者使用 anon key + 有效的 user token 進行程式化測試', 'blue');
          log('', 'reset');
          log('⏱️  將監聽 30 秒，請在 Dashboard 手動插入資料測試...', 'yellow');

          // 30 秒後結束
          timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              log('\n⏱️  測試結束（30秒）', 'yellow');
              channel.unsubscribe();
              resolve(true);
            }
          }, 30000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!resolved) {
            resolved = true;
            log(`\n❌ Subscription 連接失敗: ${status}`, 'red');
            if (err) {
              log(`   錯誤詳情: ${err.message || JSON.stringify(err)}`, 'red');
            }
            if (timeout) clearTimeout(timeout);
            resolve(false);
          }
        }
      });

    // 總體超時（35 秒）
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        log('\n⏱️  測試超時', 'yellow');
        channel.unsubscribe();
        resolve(false);
      }
    }, 35000);
  });
}

async function main() {
  log('🚀 最小化 Realtime 連接測試', 'cyan');
  log('='.repeat(60), 'cyan');
  log('ℹ️  使用 Anon Key（不繞過 RLS）', 'blue');
  log('');

  const success = await testRealtimeConnection();

  log('\n' + '='.repeat(60), 'cyan');
  if (success) {
    log('✅ Realtime 連接測試成功', 'green');
    log('', 'reset');
    log('下一步:', 'cyan');
    log('  1. 如果收到事件 → Realtime 完全正常', 'blue');
    log('  2. 如果未收到事件 → 檢查 Supabase Dashboard Realtime 設定', 'blue');
  } else {
    log('❌ Realtime 連接測試失敗', 'red');
    log('', 'reset');
    log('可能原因:', 'cyan');
    log('  1. Supabase Realtime 未啟用', 'red');
    log('  2. 網路連線問題', 'red');
    log('  3. Supabase 配置錯誤', 'red');
  }
  log('='.repeat(60), 'cyan');

  process.exit(success ? 0 : 1);
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
