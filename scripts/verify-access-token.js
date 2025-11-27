#!/usr/bin/env node

/**
 * 驗證 Access Token 格式
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testAccessToken = process.env.TEST_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

if (!testAccessToken) {
  console.error('❌ TEST_ACCESS_TOKEN 未設置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 驗證 Access Token...\n');
console.log('Token 長度:', testAccessToken.length);
console.log('Token 前 50 字符:', testAccessToken.substring(0, 50));
console.log('Token 後 50 字符:', testAccessToken.substring(testAccessToken.length - 50));

// 檢查是否是 JWT 格式（應該有三段，用 . 分隔）
const parts = testAccessToken.split('.');
console.log('\nJWT 格式檢查:');
console.log('  段數:', parts.length);
if (parts.length === 3) {
  console.log('  ✅ 看起來是 JWT 格式');
} else {
  console.log('  ❌ 不是標準 JWT 格式（應該是三段，用 . 分隔）');
}

// 嘗試設置 session
console.log('\n嘗試設置 session...');
supabase.auth.setSession({
  access_token: testAccessToken,
  refresh_token: '',
}).then(({ data, error }) => {
  if (error) {
    console.log('❌ 設置 session 失敗:', error.message);
    console.log('\n💡 可能的原因:');
    console.log('  1. Token 已過期');
    console.log('  2. Token 格式不正確');
    console.log('  3. Token 不是有效的 access_token');
    console.log('\n📝 如何獲取正確的 access_token:');
    console.log('  1. 打開 Web App 並登入');
    console.log('  2. 打開 DevTools > Application > Cookies');
    console.log('  3. 找到 supabase auth token cookie');
    console.log('  4. 複製 cookie 值（JSON 格式）');
    console.log('  5. 從 JSON 中提取 access_token 的值');
    console.log('  6. 只複製 access_token 部分（應該是 JWT 格式，三段用 . 分隔）');
  } else if (data?.user) {
    console.log('✅ Session 設置成功！');
    console.log('  用戶 ID:', data.user.id);
    console.log('  用戶 Email:', data.user.email);
    console.log('\n✅ Token 有效，可以使用！');
  } else {
    console.log('⚠️  Session 設置成功但無法獲取用戶資訊');
  }
}).catch(err => {
  console.log('❌ 發生錯誤:', err.message);
});

