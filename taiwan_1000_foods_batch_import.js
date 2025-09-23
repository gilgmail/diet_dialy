#!/usr/bin/env node

/**
 * Taiwan 1000 Foods Batch Import Script
 * 台灣1000種食物批量匯入腳本
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

async function batchImportTaiwanFoods() {
  console.log('🇹🇼 台灣1000種食物批量匯入開始...')
  console.log('=' .repeat(50))

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 讀取JSON資料
    const jsonData = JSON.parse(fs.readFileSync('./taiwan_1000_foods_nutrition_database.json', 'utf8'))
    console.log(`📊 準備匯入 ${jsonData.length} 種台灣食物`)

    // 檢查現有台灣食物數量
    const { data: existing, error: checkError } = await supabase
      .from('diet_daily_foods')
      .select('name')
      .eq('taiwan_origin', true)

    if (checkError) {
      console.error('❌ 檢查現有資料失敗:', checkError.message)
      return
    }

    console.log(`📋 資料庫中現有台灣食物: ${existing?.length || 0} 種`)

    // 批量匯入 (每批100個)
    const batchSize = 100
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize)

      console.log(`\n📦 匯入第 ${Math.floor(i/batchSize) + 1} 批 (${batch.length} 個食物)...`)

      try {
        const { error } = await supabase
          .from('diet_daily_foods')
          .insert(batch)

        if (error) {
          console.error(`❌ 第 ${Math.floor(i/batchSize) + 1} 批匯入失敗:`, error.message)
          errorCount += batch.length
        } else {
          console.log(`✅ 第 ${Math.floor(i/batchSize) + 1} 批匯入成功`)
          successCount += batch.length
        }
      } catch (err) {
        console.error(`❌ 第 ${Math.floor(i/batchSize) + 1} 批發生錯誤:`, err.message)
        errorCount += batch.length
      }

      // 避免過快請求
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 最終統計
    console.log('\n🎉 批量匯入完成!')
    console.log(`✅ 成功匯入: ${successCount} 種食物`)
    console.log(`❌ 匯入失敗: ${errorCount} 種食物`)

    // 驗證最終結果
    const { data: finalResult } = await supabase
      .from('diet_daily_foods')
      .select('category, count(*)')
      .eq('taiwan_origin', true)
      .eq('verification_status', 'admin_approved')

    console.log('\n📊 最終資料庫統計:')
    if (finalResult && finalResult.length > 0) {
      finalResult.forEach(row => {
        console.log(`   ${row.category}: ${row.count} 種`)
      })
    }

  } catch (error) {
    console.error('❌ 批量匯入過程發生錯誤:', error.message)
  }
}

batchImportTaiwanFoods().catch(console.error)
