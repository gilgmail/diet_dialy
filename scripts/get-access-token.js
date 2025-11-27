#!/usr/bin/env node

/**
 * 獲取 Access Token 輔助腳本
 * 幫助從瀏覽器或生成測試 token
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  console.log('請在 .env.local 中設置：');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

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

async function generateTestToken(userId) {
  if (!supabaseServiceKey) {
    log('❌ 需要 SUPABASE_SERVICE_ROLE_KEY 來生成測試 token', 'red');
    log('   請在 .env.local 中設置 SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    return null;
  }

  log('\n🔑 使用 Service Role Key 生成測試 Access Token', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 使用 admin client 為指定用戶生成 token
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: `test-${userId}@example.com`, // 臨時 email，不會實際發送
    });

    if (error) {
      // 如果用戶不存在，嘗試直接生成 JWT
      log('⚠️  無法生成 magic link，嘗試其他方法...', 'yellow');
      
      // 方法 2: 使用 Supabase REST API 生成 token
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_in: 3600, // 1 小時
        }),
      });

      if (response.ok) {
        const tokenData = await response.json();
        if (tokenData.access_token) {
          log('✅ 成功生成 Access Token', 'green');
          log('\n📋 請將以下 token 添加到 .env.local:', 'cyan');
          log('='.repeat(60), 'cyan');
          log(`TEST_ACCESS_TOKEN=${tokenData.access_token}`, 'green');
          log('='.repeat(60), 'cyan');
          return tokenData.access_token;
        }
      }
      
      log('❌ 無法生成 token', 'red');
      log('   錯誤:', error.message, 'red');
      return null;
    }

    if (data?.properties?.hashed_token) {
      log('✅ 成功生成 Access Token', 'green');
      return data.properties.hashed_token;
    }

    return null;
  } catch (error) {
    log(`❌ 生成 token 時發生錯誤: ${error.message}`, 'red');
    return null;
  }
}

async function showInstructions() {
  log('\n📖 如何獲取 Access Token', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log('\n方法 1: 從瀏覽器獲取（推薦）', 'yellow');
  log('1. 打開你的 Web App (http://localhost:3000)', 'blue');
  log('2. 登入你的帳號', 'blue');
  log('3. 打開瀏覽器 DevTools (F12)', 'blue');
  log('4. 前往 Application > Cookies', 'blue');
  log('5. 找到你的域名下的 cookies', 'blue');
  log('6. 尋找包含 "auth-token" 或 "supabase" 的 cookie', 'blue');
  log('7. 複製其中的 access_token 值（JSON 格式）', 'blue');
  log('   例如: {"access_token":"eyJ...","refresh_token":"..."}', 'blue');
  log('8. 提取 access_token 的值', 'blue');
  
  log('\n方法 2: 從 Mobile App 獲取', 'yellow');
  log('1. 在 Mobile App 中登入', 'blue');
  log('2. 使用 React Native Debugger', 'blue');
  log('3. 檢查 AsyncStorage', 'blue');
  log('4. 找到 supabase.auth.token', 'blue');
  log('5. 提取 access_token', 'blue');
  
  log('\n方法 3: 使用此腳本生成（需要 Service Role Key）', 'yellow');
  log('運行: node scripts/get-access-token.js <user_id>', 'blue');
  
  log('\n方法 4: 使用 Supabase Dashboard', 'yellow');
  log('1. 前往 Supabase Dashboard > Authentication > Users', 'blue');
  log('2. 找到你的用戶', 'blue');
  log('3. 點擊用戶詳情', 'blue');
  log('4. 查看 Access Token（如果可用）', 'blue');
  
  log('\n💡 提示:', 'cyan');
  log('- Access Token 通常有 1 小時的有效期', 'blue');
  log('- 過期後需要重新獲取', 'blue');
  log('- 如果使用 Service Role Key 測試，可能不需要 Access Token', 'blue');
  log('  但 Realtime 事件可能不會觸發', 'blue');
  
  log('\n📝 設置到 .env.local:', 'cyan');
  log('TEST_ACCESS_TOKEN=your-access-token-here', 'green');
}

async function main() {
  const userId = process.argv[2];
  
  if (userId) {
    log('🔍 嘗試為用戶生成 Access Token...', 'cyan');
    const token = await generateTestToken(userId);
    if (!token) {
      log('\n⚠️  無法自動生成 token，請使用手動方法', 'yellow');
      await showInstructions();
    }
  } else {
    await showInstructions();
  }
}

main().catch(console.error);

