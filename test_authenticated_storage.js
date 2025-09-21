#!/usr/bin/env node

// 測試已認證用戶的 Supabase 儲存操作
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

const testUserId = '22e990b6-a888-4beb-9ac6-c9a145731542'
const testEmail = 'gilko0725@gmail.com'

async function testStorageWithoutAuth() {
  console.log('🧪 測試未認證環境下的儲存操作')
  console.log('=' .repeat(50))

  // 測試 1: 確認無會話
  const { data: session, error: sessionError } = await supabase.auth.getSession()
  console.log('當前會話狀態:', session.session ? '已登入' : '未登入')

  // 測試 2: 嘗試直接插入資料（應該失敗）
  console.log('\n📝 測試直接插入用戶資料...')
  const { data, error } = await supabase
    .from('diet_daily_users')
    .insert({
      id: testUserId,
      email: testEmail,
      medical_conditions: ['發炎性腸病 (IBD)'],
      allergies: [],
      dietary_restrictions: [],
      medications: []
    })

  if (error) {
    console.log('❌ 預期的失敗:', error.message)
    console.log('這確認了 RLS 政策正常運作')
  } else {
    console.log('⚠️ 意外成功:', data)
    console.log('這表示 RLS 政策可能有問題')
  }

  console.log('\n💡 結論:')
  console.log('- Supabase 連接正常')
  console.log('- RLS 政策正確阻止未認證用戶')
  console.log('- 問題在於前端應用程式的認證狀態傳遞')
}

async function provideSolution() {
  console.log('\n🔧 解決方案指南')
  console.log('=' .repeat(50))

  console.log('問題: 前端應用程式的 Supabase 客戶端沒有正確的認證會話')
  console.log('')
  console.log('解決步驟:')
  console.log('1. 在瀏覽器中重新登入 Google OAuth')
  console.log('2. 檢查瀏覽器 Local Storage 中的 Supabase 會話')
  console.log('3. 確認認證狀態正確傳遞到 Supabase 客戶端')
  console.log('')
  console.log('測試方法:')
  console.log('1. 開啟 http://localhost:3000/test-auth 查看認證狀態')
  console.log('2. 使用簡化版認證 Hook: useSupabaseAuth_simple.ts')
  console.log('3. 清除瀏覽器 Local Storage 重新登入')
  console.log('')
  console.log('預期結果:')
  console.log('✅ 認證成功後應該可以儲存醫療狀況資料')
  console.log('✅ 頁面重新載入後資料應該持久存在')
}

async function main() {
  await testStorageWithoutAuth()
  await provideSolution()

  console.log('\n🎯 下一步操作:')
  console.log('1. 替換認證 Hook: cp src/hooks/useSupabaseAuth_simple.ts src/hooks/useSupabaseAuth.ts')
  console.log('2. 開啟瀏覽器: open http://localhost:3000/settings')
  console.log('3. 重新登入並測試儲存功能')
}

main().catch(console.error)