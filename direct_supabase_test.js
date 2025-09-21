#!/usr/bin/env node

// 完全獨立的 Supabase 測試，不依賴任何前端代碼

console.log('🧪 直接 Supabase 測試')

// 檢查環境變數
const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey.substring(0, 20) + '...')

try {
  const { createClient } = require('@supabase/supabase-js')

  console.log('✅ @supabase/supabase-js 載入成功')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })

  console.log('✅ Supabase 客戶端創建成功')

  // 測試基本連接
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('會話狀態:', error ? `錯誤: ${error.message}` : `正常 (有會話: ${!!data.session})`)

    // 測試資料表查詢
    return supabase
      .from('diet_daily_users')
      .select('count', { count: 'exact' })
  }).then(({ data, error }) => {
    console.log('資料表查詢:', error ? `錯誤: ${error.message}` : `成功 (計數: ${data?.[0]?.count})`)

    console.log('\n💡 如果以上都成功，問題在於前端代碼整合')
    console.log('💡 如果有錯誤，問題在於 Supabase 配置')

  }).catch(err => {
    console.error('❌ 測試失敗:', err.message)
  })

} catch (error) {
  console.error('❌ 依賴載入失敗:', error.message)
  console.log('\n可能的問題:')
  console.log('1. @supabase/supabase-js 未正確安裝')
  console.log('2. Node.js 模組路徑問題')
  console.log('3. 專案依賴衝突')
}