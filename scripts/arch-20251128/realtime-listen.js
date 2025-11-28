#!/usr/bin/env node

/**
 * Realtime 事件監聽器 - 測試 Supabase Realtime 是否正常工作
 * 使用方式: node scripts/realtime-listen.js [USER_ID]
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString('zh-TW');
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logEvent(eventType, data) {
  const timestamp = new Date().toLocaleTimeString('zh-TW');
  console.log(`${colors.bold}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.green}🎉 收到實時事件！${colors.reset}`);
  console.log(`${colors.cyan}時間: ${timestamp}${colors.reset}`);
  console.log(`${colors.cyan}事件類型: ${eventType}${colors.reset}`);
  
  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    const record = data.new || data.record;
    console.log(`${colors.blue}記錄 ID: ${record.id}${colors.reset}`);
    console.log(`${colors.blue}食物名稱: ${record.food_name}${colors.reset}`);
    console.log(`${colors.blue}餐別: ${record.meal_type}${colors.reset}`);
    console.log(`${colors.blue}用戶 ID: ${record.user_id}${colors.reset}`);
  } else if (eventType === 'DELETE') {
    const record = data.old || data.record;
    console.log(`${colors.yellow}已刪除記錄 ID: ${record.id}${colors.reset}`);
    console.log(`${colors.yellow}食物名稱: ${record.food_name}${colors.reset}`);
  }
  
  console.log(`${colors.bold}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

async function startListening() {
  const userId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542';
  
  console.log('\n');
  log('🎧 啟動 Realtime 監聽器', 'cyan');
  log('═'.repeat(60), 'cyan');
  log(`Supabase URL: ${supabaseUrl}`, 'blue');
  log(`用戶 ID: ${userId}`, 'blue');
  log('監聽表: food_entries', 'blue');
  log('', 'reset');
  
  log('📡 正在建立連接...', 'yellow');
  
  const channel = supabase
    .channel(`realtime_test_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'food_entries',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        logEvent(payload.eventType, payload);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        log('✅ 已成功訂閱！開始監聽事件...', 'green');
        log('', 'reset');
        log('💡 測試步驟:', 'cyan');
        log('   1. 在另一個終端運行:', 'yellow');
        log(`      node scripts/test-realtime-insert.js ${userId}`, 'blue');
        log('   2. 或在 iOS/Web app 中新增食物記錄', 'yellow');
        log('   3. 觀察此終端是否收到實時事件', 'yellow');
        log('', 'reset');
        log('⏳ 等待事件中... (按 Ctrl+C 退出)', 'yellow');
        log('', 'reset');
      } else if (status === 'CHANNEL_ERROR') {
        log('❌ 訂閱失敗！', 'red');
        if (err) {
          log(`錯誤: ${err.message}`, 'red');
        }
        process.exit(1);
      } else if (status === 'TIMED_OUT') {
        log('⏱️  連接超時', 'yellow');
      } else if (status === 'CLOSED') {
        log('🔌 連接已關閉', 'yellow');
      } else {
        log(`狀態更新: ${status}`, 'yellow');
      }
    });

  // 處理優雅退出
  process.on('SIGINT', () => {
    log('\n📴 正在關閉監聽器...', 'yellow');
    channel.unsubscribe();
    log('👋 再見！', 'green');
    process.exit(0);
  });

  // 每 30 秒顯示一次狀態
  let eventCount = 0;
  const statusInterval = setInterval(() => {
    if (eventCount === 0) {
      log('⏳ 仍在等待事件... (已收到 0 個事件)', 'cyan');
    }
  }, 30000);

  // 追蹤事件數量
  const originalOn = channel.on.bind(channel);
  channel.on = function(...args) {
    if (args[0] === 'postgres_changes') {
      const originalCallback = args[2];
      args[2] = function(payload) {
        eventCount++;
        return originalCallback(payload);
      };
    }
    return originalOn(...args);
  };
}

// 啟動監聽器
startListening().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
