#!/usr/bin/env node

// 檢查表格並在可能的情況下設置食物資料
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndSetup() {
  console.log('🔍 檢查 Supabase 表格狀態...')
  console.log('=' .repeat(50))

  try {
    // 檢查各個表格
    const tables = [
      'diet_daily_users',
      'diet_daily_foods',
      'food_entries',
      'medical_reports',
      'symptom_tracking'
    ]

    const tableStatus = {}

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (error) {
          if (error.code === '42P01') {
            tableStatus[table] = '❌ 不存在'
          } else {
            tableStatus[table] = `⚠️ 錯誤: ${error.message}`
          }
        } else {
          tableStatus[table] = '✅ 存在'
        }
      } catch (err) {
        tableStatus[table] = `❌ 檢查失敗: ${err.message}`
      }
    }

    console.log('📊 表格狀態檢查結果:')
    for (const [table, status] of Object.entries(tableStatus)) {
      console.log(`   ${table}: ${status}`)
    }

    // 檢查是否有任何表格存在
    const existingTables = Object.entries(tableStatus)
      .filter(([table, status]) => status === '✅ 存在')
      .map(([table]) => table)

    if (existingTables.length === 0) {
      console.log('\n❌ 沒有找到任何必要的表格')
      console.log('需要先在 Supabase Dashboard 執行 schema.sql')
      console.log('')
      console.log('🔧 設置步驟:')
      console.log('1. 登入 Supabase Dashboard: https://app.supabase.com')
      console.log('2. 選擇專案: lbjeyvvierxcnrytuvto')
      console.log('3. 進入 SQL Editor')
      console.log('4. 建立新查詢')
      console.log('5. 複製 supabase/schema.sql 的完整內容')
      console.log('6. 貼上並執行')
      console.log('7. 執行完成後重新運行此腳本')
      return
    }

    console.log(`\n✅ 找到 ${existingTables.length} 個表格存在`)

    // 如果用戶表格存在，檢查是否有測試用戶
    if (tableStatus['diet_daily_users'] === '✅ 存在') {
      console.log('\n👤 檢查測試用戶...')
      const testUserId = '22e990b6-a888-4beb-9ac6-c9a145731542'

      const { data: user, error: userError } = await supabase
        .from('diet_daily_users')
        .select('*')
        .eq('id', testUserId)
        .single()

      if (userError) {
        console.log('⚠️ 測試用戶不存在，需要先登入 Google 並保存用戶資料')
        console.log('   請先到 http://localhost:3000/settings 登入')
      } else {
        console.log('✅ 測試用戶存在:', user.email)
      }
    }

    // 如果食物表格存在，檢查並添加樣本資料
    if (tableStatus['diet_daily_foods'] === '✅ 存在') {
      console.log('\n🍎 檢查食物資料...')

      const { data: foods, error: foodsError } = await supabase
        .from('diet_daily_foods')
        .select('id, name')
        .eq('verification_status', 'approved')

      if (foodsError) {
        console.log('❌ 查詢食物資料失敗:', foodsError.message)
      } else {
        console.log(`✅ 找到 ${foods.length} 個已驗證的食物`)

        if (foods.length === 0) {
          console.log('\n➕ 添加樣本食物資料...')
          await addSampleFoods()
        } else {
          console.log('   現有食物:')
          foods.slice(0, 5).forEach(food => {
            console.log(`   - ${food.name}`)
          })
          if (foods.length > 5) {
            console.log(`   ... 還有 ${foods.length - 5} 個`)
          }
        }
      }
    }

    // 如果食物記錄表格存在，檢查測試記錄
    if (tableStatus['food_entries'] === '✅ 存在') {
      console.log('\n📝 檢查食物記錄...')

      const today = new Date().toISOString().split('T')[0]

      const { data: entries, error: entriesError } = await supabase
        .from('food_entries')
        .select('id, food_name, meal_type')
        .gte('consumed_at', `${today}T00:00:00.000Z`)
        .lte('consumed_at', `${today}T23:59:59.999Z`)

      if (entriesError) {
        console.log('❌ 查詢食物記錄失敗:', entriesError.message)
      } else {
        console.log(`✅ 找到 ${entries.length} 筆今日記錄`)
        if (entries.length > 0) {
          console.log('   今日記錄:')
          entries.forEach(entry => {
            console.log(`   - ${entry.food_name} (${entry.meal_type})`)
          })
        }
      }
    }

    // 提供下一步建議
    console.log('\n🚀 下一步建議:')

    const missingTables = Object.entries(tableStatus)
      .filter(([table, status]) => status.includes('❌') || status.includes('⚠️'))
      .map(([table]) => table)

    if (missingTables.length > 0) {
      console.log('1. 📊 需要建立表格:')
      missingTables.forEach(table => {
        console.log(`   - ${table}`)
      })
      console.log('   請在 Supabase Dashboard 執行 schema.sql')
    } else {
      console.log('1. ✅ 所有表格都已建立')
    }

    console.log('2. 🌐 測試前端功能:')
    console.log('   - 開啟 http://localhost:3000/food-diary')
    console.log('   - 登入 Google 帳戶')
    console.log('   - 搜尋並添加食物記錄')

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error)
  }
}

async function addSampleFoods() {
  const sampleFoods = [
    {
      name: '白米飯',
      category: '穀類',
      calories: 130,
      protein: 2.7,
      carbohydrates: 28,
      fat: 0.3,
      fiber: 0.4,
      verification_status: 'approved'
    },
    {
      name: '香蕉',
      category: '水果',
      calories: 89,
      protein: 1.1,
      carbohydrates: 23,
      fat: 0.3,
      fiber: 2.6,
      verification_status: 'approved'
    },
    {
      name: '蒸蛋',
      category: '蛋類',
      calories: 155,
      protein: 13,
      carbohydrates: 1.1,
      fat: 11,
      fiber: 0,
      verification_status: 'approved'
    }
  ]

  let added = 0
  for (const food of sampleFoods) {
    try {
      const { error } = await supabase
        .from('diet_daily_foods')
        .insert(food)

      if (error) {
        console.log(`❌ 添加 ${food.name} 失敗:`, error.message)
      } else {
        console.log(`✅ 成功添加: ${food.name}`)
        added++
      }
    } catch (err) {
      console.log(`❌ 添加 ${food.name} 時發生錯誤:`, err.message)
    }
  }

  console.log(`📊 樣本食物添加完成: ${added}/${sampleFoods.length}`)
}

checkAndSetup().catch(console.error)