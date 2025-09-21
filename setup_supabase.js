#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// 從 .env.local 讀取配置
const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('🚀 開始設定 Supabase 資料庫...')

  try {
    // 讀取 SQL 檔案
    const sql = fs.readFileSync('./create_user_table.sql', 'utf8')

    console.log('📄 執行用戶資料表 SQL...')

    // 由於 anon key 權限限制，我們需要手動在 Dashboard 執行
    console.log(`
📋 請手動執行以下步驟：

1. 前往 Supabase Dashboard: https://app.supabase.com
2. 選擇專案 (URL 包含: lbjeyvvierxcnrytuvto)
3. 點擊左側 "SQL Editor"
4. 點擊 "New query"
5. 複製以下 SQL 並執行：

${sql}

6. 點擊 "Run" 執行

完成後，資料表將會建立，認證功能將完全正常運作。
`)

    // 測試連接
    console.log('\n🔍 測試基本連接...')
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.log('❌ 連接測試失敗:', error.message)
    } else {
      console.log('✅ Supabase 連接正常')
    }

  } catch (error) {
    console.error('❌ 設定過程發生錯誤:', error.message)
  }
}

setupDatabase()