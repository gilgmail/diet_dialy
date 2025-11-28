#!/usr/bin/env node

/**
 * 檢查 .env.local 配置是否正確設置用於 Realtime 測試
 */

require('dotenv').config({ path: '.env.local' });

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

log('\n🔍 檢查 .env.local 配置', 'cyan');
log('='.repeat(60), 'cyan');

const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasAnonKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const hasAccessToken = !!process.env.TEST_ACCESS_TOKEN;
const hasUrl = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL);

log('\n📋 配置狀態:', 'cyan');

if (hasUrl) {
  log('✅ NEXT_PUBLIC_SUPABASE_URL: 已設置', 'green');
} else {
  log('❌ NEXT_PUBLIC_SUPABASE_URL: 未設置', 'red');
}

if (hasAnonKey) {
  log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: 已設置', 'green');
} else {
  log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: 未設置', 'red');
}

if (hasServiceRole) {
  log('⚠️  SUPABASE_SERVICE_ROLE_KEY: 已設置（會優先使用，不適合 Realtime 測試）', 'yellow');
} else {
  log('✅ SUPABASE_SERVICE_ROLE_KEY: 未設置（將使用 anon key，適合 Realtime 測試）', 'green');
}

if (hasAccessToken) {
  log('✅ TEST_ACCESS_TOKEN: 已設置', 'green');
} else {
  log('⚠️  TEST_ACCESS_TOKEN: 未設置（可能無法通過 RLS 政策）', 'yellow');
}

log('\n💡 建議配置（用於 Realtime 測試）:', 'cyan');
log('='.repeat(60), 'cyan');

if (hasServiceRole) {
  log('\n❌ 問題: SUPABASE_SERVICE_ROLE_KEY 已設置', 'red');
  log('   解決方法: 在 .env.local 中註釋掉這一行（在行首加 #）', 'yellow');
  log('   例如: # SUPABASE_SERVICE_ROLE_KEY=...', 'blue');
}

if (!hasAnonKey) {
  log('\n❌ 問題: NEXT_PUBLIC_SUPABASE_ANON_KEY 未設置', 'red');
  log('   解決方法: 在 .env.local 中添加', 'yellow');
  log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key', 'blue');
}

if (!hasAccessToken) {
  log('\n⚠️  建議: 設置 TEST_ACCESS_TOKEN 以通過 RLS 政策', 'yellow');
  log('   方法: 運行 node scripts/get-access-token.js 查看獲取方法', 'blue');
}

if (!hasServiceRole && hasAnonKey) {
  log('\n✅ 配置正確！可以使用 anon key 測試 Realtime', 'green');
  if (hasAccessToken) {
    log('✅ 已設置 Access Token，應該可以通過 RLS 政策', 'green');
  } else {
    log('⚠️  未設置 Access Token，可能無法通過 RLS 政策', 'yellow');
    log('   但可以先測試看看', 'blue');
  }
}

log('\n' + '='.repeat(60), 'cyan');

