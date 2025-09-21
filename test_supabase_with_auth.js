#!/usr/bin/env node

// 帶認證的 Supabase 測試程式
// 模擬前端應用程式的實際認證環境

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

const testUserId = '22e990b6-a888-4beb-9ac6-c9a145731542'
const testEmail = 'gilko0725@gmail.com'

// 從瀏覽器中提取的實際 JWT token（需要從前端應用程式獲取）
console.log('🔐 認證測試說明：')
console.log('=' .repeat(50))
console.log('這個測試需要從瀏覽器中提取實際的 JWT token')
console.log('請按照以下步驟：')
console.log('')
console.log('1. 在瀏覽器中打開開發者工具 (F12)')
console.log('2. 進入 Application 或 Storage 標籤')
console.log('3. 查看 Local Storage 中的 Supabase 項目')
console.log('4. 找到 access_token 並複製')
console.log('5. 將 token 設置到環境變數中：')
console.log('   export SUPABASE_TOKEN="your_access_token_here"')
console.log('')
console.log('或者直接修改此檔案中的 userToken 變數')
console.log('')

// 從環境變數讀取 token，或者直接在這裡設置
const userToken = process.env.SUPABASE_TOKEN || null

async function testWithAuth() {
  if (!userToken) {
    console.log('❌ 缺少認證 token')
    console.log('請設置 SUPABASE_TOKEN 環境變數或修改程式碼')

    // 提供另一種方法：檢查 RLS 政策
    await testRLSPolicies()
    return
  }

  console.log('🧪 使用認證 token 測試...')

  try {
    // 設置用戶會話
    const { data: user, error: authError } = await supabase.auth.setSession({
      access_token: userToken,
      refresh_token: '' // 通常也需要 refresh token
    })

    if (authError) {
      console.log('❌ 認證失敗:', authError.message)
      return
    }

    console.log('✅ 認證成功:', user.user?.email)

    // 現在測試資料操作
    await testDataOperations()

  } catch (error) {
    console.log('❌ 測試失敗:', error.message)
  }
}

async function testRLSPolicies() {
  console.log('\n🛡️ 檢查 RLS 政策配置')
  console.log('=' .repeat(50))

  // 檢查政策是否正確設置
  console.log('RLS 政策要求：')
  console.log('1. 用戶必須已認證 (auth.uid() = id)')
  console.log('2. 插入政策允許用戶建立自己的記錄')
  console.log('3. 更新政策允許用戶修改自己的記錄')
  console.log('')

  console.log('建議解決方案：')
  console.log('1. 在前端應用程式中，確保用戶已登入')
  console.log('2. 檢查 Supabase 會話是否正確傳遞')
  console.log('3. 驗證 RLS 政策語法是否正確')

  // 提供 RLS 政策建議
  console.log('\n📋 建議的 RLS 政策：')
  console.log(`
-- 插入政策
CREATE POLICY "Users can insert own profile" ON diet_daily_users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 更新政策
CREATE POLICY "Users can update own profile" ON diet_daily_users
    FOR UPDATE USING (auth.uid() = id);

-- 查看政策
CREATE POLICY "Users can view own profile" ON diet_daily_users
    FOR SELECT USING (auth.uid() = id);
`)
}

async function testDataOperations() {
  console.log('\n📝 測試資料操作')
  console.log('=' .repeat(50))

  try {
    // 測試建立用戶資料
    const { data, error } = await supabase
      .from('diet_daily_users')
      .upsert({
        id: testUserId,
        email: testEmail,
        medical_conditions: ['發炎性腸病 (IBD)'],
        allergies: [],
        dietary_restrictions: [],
        medications: [],
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.log('❌ 資料操作失敗:', error.message)
      console.log('詳細:', error.details)
    } else {
      console.log('✅ 資料操作成功:', data)
    }

  } catch (error) {
    console.log('❌ 操作異常:', error.message)
  }
}

// 提供簡化的測試方法
async function testSimpleConnection() {
  console.log('\n🔍 簡化連接測試')
  console.log('=' .repeat(50))

  try {
    // 測試基本查詢（不涉及 RLS）
    const { data, error } = await supabase
      .from('diet_daily_users')
      .select('count', { count: 'exact' })

    console.log('資料表查詢結果:', { data, error })

    // 檢查 auth 狀態
    const { data: session } = await supabase.auth.getSession()
    console.log('當前會話狀態:', session.session ? '已登入' : '未登入')

  } catch (error) {
    console.log('連接測試失敗:', error.message)
  }
}

// 主函數
async function main() {
  await testSimpleConnection()
  await testWithAuth()
}

if (require.main === module) {
  main().catch(console.error)
}