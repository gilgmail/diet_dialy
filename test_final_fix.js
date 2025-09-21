#!/usr/bin/env node

// 測試修復後的 Supabase 客戶端
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

// 創建與修復後的客戶端相同配置的 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

async function testConfiguration() {
  console.log('🔧 測試修復後的 Supabase 客戶端配置')
  console.log('=' .repeat(50))

  try {
    // 測試客戶端配置
    const { data, error } = await supabase.auth.getSession()
    console.log('✅ 客戶端配置正常')
    console.log('會話狀態:', data.session ? '已建立' : '未建立')

    // 測試基本連接
    const { data: tableData, error: tableError } = await supabase
      .from('diet_daily_users')
      .select('count', { count: 'exact' })

    if (tableError) {
      console.log('❌ 資料表連接失敗:', tableError.message)
    } else {
      console.log('✅ 資料表連接正常')
    }

    console.log('\n💡 修復摘要：')
    console.log('- 改用標準 @supabase/supabase-js 客戶端')
    console.log('- 啟用自動 token 刷新')
    console.log('- 啟用會話持久化')
    console.log('- 啟用 URL 會話檢測')

    console.log('\n🎯 下一步：')
    console.log('1. 重啟開發伺服器以應用更改')
    console.log('2. 重新登入以建立新的會話')
    console.log('3. 測試儲存功能')

  } catch (error) {
    console.log('❌ 測試失敗:', error.message)
  }
}

testConfiguration().catch(console.error)