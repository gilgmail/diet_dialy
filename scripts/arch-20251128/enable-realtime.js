#!/usr/bin/env node

/**
 * 啟用 Supabase Realtime Publication
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function enableRealtime() {
  log('\n🔧 啟用 Supabase Realtime Publication', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  const tables = ['food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users'];

  log('📋 準備為以下表啟用 Realtime:', 'cyan');
  tables.forEach(table => log(`   - ${table}`, 'blue'));
  log('');

  // 檢查當前 publication 狀態
  log('1️⃣ 檢查當前 publication 狀態...', 'cyan');
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT tablename 
          FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime'
          ORDER BY tablename;
        `
      });

    if (error) {
      // rpc 可能不存在，嘗試直接查詢
      log('⚠️  無法使用 RPC 查詢（正常情況）', 'yellow');
      log('   請在 Supabase Dashboard 中手動啟用 Realtime', 'yellow');
      log('', '');
      log('📝 手動操作步驟:', 'cyan');
      log('   1. 前往 Supabase Dashboard', 'yellow');
      log('   2. 選擇你的專案', 'yellow');
      log('   3. 進入 Database → Replication', 'yellow');
      log('   4. 在 "supabase_realtime" publication 中啟用以下表:', 'yellow');
      tables.forEach(table => log(`      ✓ ${table}`, 'blue'));
      log('', '');
      log('🔗 直接連結:', 'cyan');
      const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectId) {
        log(`   https://supabase.com/dashboard/project/${projectId}/database/replication`, 'blue');
      }
      return false;
    }

    if (data) {
      log('✅ 當前已啟用 Realtime 的表:', 'green');
      data.forEach(row => log(`   - ${row.tablename}`, 'blue'));
    }
  } catch (err) {
    log(`⚠️  查詢錯誤: ${err.message}`, 'yellow');
  }

  log('');
  log('='.repeat(60), 'cyan');
  log('💡 建議:', 'cyan');
  log('   請確保在 Supabase Dashboard 中為所有表啟用 Realtime', 'yellow');
  log('='.repeat(60), 'cyan');
}

async function main() {
  await enableRealtime();
}

main().catch(err => {
  log(`❌ 未預期的錯誤: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

