#!/usr/bin/env node

// 設置食物日記資料庫的腳本
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('🚀 開始設置食物日記資料庫...')
  console.log('=' .repeat(50))

  try {
    // 1. 檢查是否已經有表格
    console.log('\n📊 檢查現有表格...')

    const { data: foods, error: foodsError } = await supabase
      .from('diet_daily_foods')
      .select('count', { count: 'exact' })

    const { data: entries, error: entriesError } = await supabase
      .from('food_entries')
      .select('count', { count: 'exact' })

    if (foodsError || entriesError) {
      console.log('❌ 表格尚未建立，需要執行 schema.sql')
      console.log('')
      console.log('請按照以下步驟執行：')
      console.log('1. 登入 Supabase Dashboard: https://app.supabase.com')
      console.log('2. 選擇您的專案')
      console.log('3. 進入 SQL Editor')
      console.log('4. 複製 supabase/schema.sql 的內容並執行')
      console.log('5. 執行完成後重新運行此腳本')
      return
    }

    console.log('✅ 表格已存在，繼續添加資料...')

    // 2. 添加樣本食物資料
    console.log('\n🍎 添加樣本食物資料...')

    const sampleFoods = [
      {
        name: '白米飯',
        category: '穀類',
        calories: 130,
        protein: 2.7,
        carbohydrates: 28,
        fat: 0.3,
        fiber: 0.4,
        verification_status: 'approved',
        medical_scores: { ibd_score: 8, safety_level: 'safe' },
        allergens: [],
        tags: ['主食', '溫和'],
        nutrition_data: {
          calcium: 10,
          iron: 0.8,
          vitamin_c: 0
        }
      },
      {
        name: '蒸蛋',
        category: '蛋類',
        calories: 155,
        protein: 13,
        carbohydrates: 1.1,
        fat: 11,
        fiber: 0,
        verification_status: 'approved',
        medical_scores: { ibd_score: 7, safety_level: 'safe' },
        allergens: ['蛋'],
        tags: ['蛋白質', '易消化'],
        nutrition_data: {
          calcium: 56,
          iron: 1.75,
          vitamin_d: 41
        }
      },
      {
        name: '香蕉',
        category: '水果',
        calories: 89,
        protein: 1.1,
        carbohydrates: 23,
        fat: 0.3,
        fiber: 2.6,
        verification_status: 'approved',
        medical_scores: { ibd_score: 9, safety_level: 'safe' },
        allergens: [],
        tags: ['水果', '高鉀', '易消化'],
        nutrition_data: {
          potassium: 358,
          vitamin_c: 8.7,
          vitamin_b6: 0.4
        }
      },
      {
        name: '雞胸肉',
        category: '肉類',
        calories: 165,
        protein: 31,
        carbohydrates: 0,
        fat: 3.6,
        fiber: 0,
        verification_status: 'approved',
        medical_scores: { ibd_score: 6, safety_level: 'safe' },
        allergens: [],
        tags: ['蛋白質', '低脂'],
        nutrition_data: {
          niacin: 14.8,
          phosphorus: 196,
          selenium: 26.4
        }
      },
      {
        name: '地瓜',
        category: '穀類',
        calories: 86,
        protein: 1.6,
        carbohydrates: 20,
        fat: 0.1,
        fiber: 3,
        verification_status: 'approved',
        medical_scores: { ibd_score: 8, safety_level: 'safe' },
        allergens: [],
        tags: ['根莖類', '膳食纖維', '維生素A'],
        nutrition_data: {
          beta_carotene: 8509,
          vitamin_c: 2.4,
          potassium: 337
        }
      },
      {
        name: '白吐司',
        category: '穀類',
        calories: 265,
        protein: 9,
        carbohydrates: 49,
        fat: 3.2,
        fiber: 2.7,
        verification_status: 'approved',
        medical_scores: { ibd_score: 6, safety_level: 'caution' },
        allergens: ['麩質', '小麥'],
        tags: ['主食', '麵包', '加工食品'],
        nutrition_data: {
          folate: 43,
          thiamine: 0.5,
          iron: 3.6
        }
      },
      {
        name: '蘋果',
        category: '水果',
        calories: 52,
        protein: 0.3,
        carbohydrates: 14,
        fat: 0.2,
        fiber: 2.4,
        verification_status: 'approved',
        medical_scores: { ibd_score: 8, safety_level: 'safe' },
        allergens: [],
        tags: ['水果', '維生素C', '膳食纖維'],
        nutrition_data: {
          vitamin_c: 4.6,
          potassium: 107,
          quercetin: 4.4
        }
      },
      {
        name: '白粥',
        category: '穀類',
        calories: 30,
        protein: 0.6,
        carbohydrates: 6.8,
        fat: 0.1,
        fiber: 0.1,
        verification_status: 'approved',
        medical_scores: { ibd_score: 10, safety_level: 'safe' },
        allergens: [],
        tags: ['主食', '易消化', '溫和'],
        nutrition_data: {
          water: 92,
          sodium: 1,
          carb_simple: 6.8
        }
      }
    ]

    let addedFoods = 0
    let skippedFoods = 0

    for (const food of sampleFoods) {
      try {
        // 檢查是否已存在
        const { data: existing } = await supabase
          .from('diet_daily_foods')
          .select('id')
          .eq('name', food.name)
          .single()

        if (existing) {
          console.log(`⏭️  跳過已存在的食物: ${food.name}`)
          skippedFoods++
          continue
        }

        // 添加新食物
        const { data: newFood, error: insertError } = await supabase
          .from('diet_daily_foods')
          .insert(food)
          .select()
          .single()

        if (insertError) {
          console.log(`❌ 添加食物 ${food.name} 失敗:`, insertError.message)
        } else {
          console.log(`✅ 成功添加食物: ${food.name}`)
          addedFoods++
        }
      } catch (error) {
        console.log(`❌ 處理食物 ${food.name} 時發生錯誤:`, error.message)
      }
    }

    console.log(`\n📊 食物資料添加完成: ${addedFoods} 個新增, ${skippedFoods} 個跳過`)

    // 3. 檢查資料庫狀態
    console.log('\n🔍 檢查最終資料庫狀態...')

    const { data: totalFoods, error: countError } = await supabase
      .from('diet_daily_foods')
      .select('id', { count: 'exact' })
      .eq('verification_status', 'approved')

    if (countError) {
      console.log('❌ 查詢食物總數失敗:', countError.message)
    } else {
      console.log(`✅ 資料庫中共有 ${totalFoods.length} 個已驗證的食物`)
    }

    // 4. 測試食物搜尋功能
    console.log('\n🔎 測試食物搜尋功能...')

    const { data: searchResults, error: searchError } = await supabase
      .from('diet_daily_foods')
      .select('name, category, calories, medical_scores')
      .eq('verification_status', 'approved')
      .ilike('name', '%白%')

    if (searchError) {
      console.log('❌ 搜尋測試失敗:', searchError.message)
    } else {
      console.log(`✅ 搜尋「白」相關食物找到 ${searchResults.length} 個結果:`)
      searchResults.forEach(food => {
        console.log(`   - ${food.name} (${food.category}) - ${food.calories} 卡`)
      })
    }

    console.log('\n🎉 資料庫設置完成！')

  } catch (error) {
    console.error('❌ 設置過程中發生錯誤:', error)
  }
}

async function printUsageInstructions() {
  console.log('\n📋 使用說明')
  console.log('=' .repeat(50))
  console.log('✅ 資料庫已準備就緒，您現在可以：')
  console.log('')
  console.log('1. 🌐 前端測試：')
  console.log('   - 開啟 http://localhost:3000/food-diary')
  console.log('   - 使用 Google 帳戶登入')
  console.log('   - 搜尋食物（如：白米飯、香蕉）')
  console.log('   - 添加食物記錄')
  console.log('')
  console.log('2. 🧪 功能測試：')
  console.log('   - 搜尋食物：輸入「白」、「香蕉」、「肉」等關鍵字')
  console.log('   - 選擇食物後填寫份量（如：100g）')
  console.log('   - 選擇餐次（早餐、午餐、晚餐、點心）')
  console.log('   - 點擊「新增記錄」')
  console.log('   - 查看右側的今日記錄')
  console.log('')
  console.log('3. 📊 驗證功能：')
  console.log('   - 醫療評分顯示（推薦/適中/謹慎）')
  console.log('   - 卡路里自動計算')
  console.log('   - 記錄時間戳')
  console.log('   - 頁面重新載入後資料持久存在')
  console.log('')
  console.log('🎯 如果遇到問題：')
  console.log('   - 確認已登入 Google 帳戶')
  console.log('   - 檢查瀏覽器開發者工具的 Console')
  console.log('   - 確認網路連接正常')
}

async function main() {
  await setupDatabase()
  await printUsageInstructions()
}

main().catch(console.error)