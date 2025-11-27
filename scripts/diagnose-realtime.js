#!/usr/bin/env node

/**
 * 深度診斷 Realtime 配置
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

async function checkReplicaIdentity() {
  log('\n1️⃣ 檢查 REPLICA IDENTITY 設置', 'cyan');
  log('-'.repeat(60), 'cyan');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          CASE relreplident
            WHEN 'd' THEN 'default'
            WHEN 'n' THEN 'nothing'
            WHEN 'f' THEN 'full'
            WHEN 'i' THEN 'index'
          END as replica_identity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_tables t ON t.schemaname = n.nspname AND t.tablename = c.relname
        WHERE t.tablename IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries')
          AND n.nspname = 'public';
      `
    });

    if (error) {
      log('⚠️  無法查詢（需要手動檢查）', 'yellow');
      log(`   錯誤: ${error.message}`, 'yellow');
    } else if (data) {
      data.forEach(row => {
        const status = row.replica_identity === 'full' ? '✅' : '❌';
        log(`${status} ${row.tablename}: ${row.replica_identity}`, 
            row.replica_identity === 'full' ? 'green' : 'red');
      });
      
      const allFull = data.every(row => row.replica_identity === 'full');
      if (!allFull) {
        log('\n⚠️  問題發現！', 'red');
        log('   某些表的 REPLICA IDENTITY 不是 "full"', 'red');
        log('   這會導致 Realtime 無法傳送完整的資料', 'red');
      }
    }
  } catch (err) {
    log(`⚠️  檢查失敗: ${err.message}`, 'yellow');
  }
}

async function checkPublication() {
  log('\n2️⃣ 檢查 Publication 配置', 'cyan');
  log('-'.repeat(60), 'cyan');
  
  try {
    // 嘗試查詢 publication
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tablename,
          schemaname
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries')
        ORDER BY tablename;
      `
    });

    if (error) {
      log('⚠️  無法查詢 publication（需要手動檢查）', 'yellow');
      log(`   錯誤: ${error.message}`, 'yellow');
      log('\n💡 請在 Supabase SQL Editor 運行:', 'cyan');
      log(`   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`, 'blue');
    } else {
      const tables = ['food_entries', 'daily_symptom_entries', 'bowel_movement_entries'];
      const foundTables = data.map(row => row.tablename);
      
      tables.forEach(table => {
        const found = foundTables.includes(table);
        log(`${found ? '✅' : '❌'} ${table}`, found ? 'green' : 'red');
      });
      
      if (foundTables.length < tables.length) {
        log('\n⚠️  問題發現！', 'red');
        log('   某些表未加入 supabase_realtime publication', 'red');
      }
    }
  } catch (err) {
    log(`⚠️  檢查失敗: ${err.message}`, 'yellow');
  }
}

async function checkRLS() {
  log('\n3️⃣ 檢查 RLS 設置', 'cyan');
  log('-'.repeat(60), 'cyan');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE tablename IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries')
          AND schemaname = 'public';
      `
    });

    if (error) {
      log('⚠️  無法查詢 RLS 狀態', 'yellow');
    } else if (data) {
      data.forEach(row => {
        log(`${row.rls_enabled ? '✅' : '⚠️'} ${row.tablename}: RLS ${row.rls_enabled ? 'enabled' : 'disabled'}`, 
            row.rls_enabled ? 'green' : 'yellow');
      });
    }
  } catch (err) {
    log(`⚠️  檢查失敗: ${err.message}`, 'yellow');
  }
}

async function testDirectQuery() {
  log('\n4️⃣ 測試直接資料庫查詢', 'cyan');
  log('-'.repeat(60), 'cyan');
  
  try {
    const { data, error, count } = await supabase
      .from('food_entries')
      .select('*', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      log(`❌ 查詢失敗: ${error.message}`, 'red');
    } else {
      log(`✅ 成功查詢 (共 ${count} 筆記錄)`, 'green');
    }
  } catch (err) {
    log(`❌ 查詢錯誤: ${err.message}`, 'red');
  }
}

async function suggestFixes() {
  log('\n📋 修復建議', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log('\n如果 REPLICA IDENTITY 不是 "full":', 'yellow');
  log('  在 Supabase SQL Editor 運行:', 'blue');
  log('  ALTER TABLE public.food_entries REPLICA IDENTITY FULL;', 'cyan');
  log('  ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;', 'cyan');
  log('  ALTER TABLE public.bowel_movement_entries REPLICA IDENTITY FULL;', 'cyan');
  
  log('\n如果表未加入 Publication:', 'yellow');
  log('  方法 1: 在 Supabase Dashboard', 'blue');
  log('    Database → Replication → supabase_realtime → 啟用表', 'cyan');
  
  log('\n  方法 2: 在 SQL Editor 運行', 'blue');
  log('    ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;', 'cyan');
  log('    ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;', 'cyan');
  log('    ALTER PUBLICATION supabase_realtime ADD TABLE bowel_movement_entries;', 'cyan');
}

async function main() {
  log('\n🔬 Supabase Realtime 深度診斷', 'cyan');
  log('='.repeat(60), 'cyan');
  
  await checkReplicaIdentity();
  await checkPublication();
  await checkRLS();
  await testDirectQuery();
  await suggestFixes();
  
  log('\n='.repeat(60), 'cyan');
  log('診斷完成！', 'green');
  log('='.repeat(60), 'cyan');
}

main().catch(err => {
  log(`\n❌ 診斷失敗: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

