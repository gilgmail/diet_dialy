#!/usr/bin/env node

// Diet Daily - Supabase 資料庫設定腳本
// 此腳本將建立必要的資料表和政策

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 直接設定環境變數
const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  console.error('請確認 .env.local 包含:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY (或 NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('🚀 開始設定 Diet Daily 資料庫...')
  console.log('📍 Supabase URL:', supabaseUrl)

  try {
    // 讀取 schema 檔案
    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('📄 執行資料庫 schema...')

    // 將 SQL 分割成個別語句
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })

        if (error) {
          // 如果 rpc 不可用，嘗試直接執行
          console.log('⚠️  嘗試直接執行 SQL...')
          throw error
        }

        successCount++
        console.log('✅', statement.substring(0, 50) + '...')
      } catch (error) {
        errorCount++
        console.error('❌', statement.substring(0, 50) + '...')
        console.error('   錯誤:', error.message)
      }
    }

    console.log(`\n📊 執行結果:`)
    console.log(`✅ 成功: ${successCount} 個語句`)
    console.log(`❌ 失敗: ${errorCount} 個語句`)

    if (errorCount === 0) {
      console.log('\n🎉 資料庫設定完成！')

      // 測試連接
      console.log('\n🔍 測試資料表連接...')
      const { data, error } = await supabase
        .from('diet_daily_users')
        .select('count')
        .limit(1)

      if (error) {
        console.error('❌ 資料表測試失敗:', error.message)
      } else {
        console.log('✅ 資料表連接正常')
      }
    } else {
      console.log('\n⚠️  部分設定失敗，請檢查錯誤訊息')
    }

  } catch (error) {
    console.error('❌ 設定過程發生錯誤:', error.message)
    process.exit(1)
  }
}

// 執行設定
setupDatabase()