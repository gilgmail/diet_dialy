#!/usr/bin/env node

// Supabase 整合測試工具
// 測試 food-database 與 Supabase diet_daily_foods 表的整合狀況

const { createClient } = require('@supabase/supabase-js')

// 從環境變數載入 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤：請設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupabaseIntegration() {
  console.log('🔍 開始測試 Supabase 整合...\n')

  try {
    // 測試 1: 連接測試
    console.log('📡 測試 1: Supabase 連接')
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_version')
      .catch(() => ({ data: null, error: null }))

    if (tablesError) {
      console.log('⚠️  無法執行 RPC 調用，但這可能是正常的')
    } else {
      console.log('✅ Supabase 連接成功')
    }

    // 測試 2: 檢查 diet_daily_foods 表
    console.log('\n📊 測試 2: diet_daily_foods 表結構')
    const { data: foodsTest, error: foodsError } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .limit(1)

    if (foodsError) {
      console.error('❌ 無法訪問 diet_daily_foods 表:', foodsError.message)
      return
    }

    console.log('✅ diet_daily_foods 表訪問成功')

    // 測試 3: 統計資料
    console.log('\n📈 測試 3: 資料庫統計')

    const [
      { count: totalCount },
      { count: approvedCount },
      { count: pendingCount },
      { count: rejectedCount },
      { count: customCount },
      { count: taiwanCount }
    ] = await Promise.all([
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('is_custom', true),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('taiwan_origin', true)
    ])

    console.log(`📋 總計食物: ${totalCount || 0}`)
    console.log(`✅ 已驗證: ${approvedCount || 0}`)
    console.log(`⏳ 待審核: ${pendingCount || 0}`)
    console.log(`❌ 已拒絕: ${rejectedCount || 0}`)
    console.log(`👤 自訂食物: ${customCount || 0}`)
    console.log(`🇹🇼 台灣食物: ${taiwanCount || 0}`)

    // 測試 4: 檢查分類
    console.log('\n🏷️  測試 4: 食物分類')
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('diet_daily_foods')
      .select('category')
      .not('category', 'is', null)
      .limit(100)

    if (categoriesError) {
      console.error('❌ 無法獲取分類:', categoriesError.message)
    } else {
      const categories = [...new Set(categoriesData.map(item => item.category))]
      console.log(`📂 發現 ${categories.length} 個分類:`)
      categories.slice(0, 10).forEach(cat => console.log(`   - ${cat}`))
      if (categories.length > 10) {
        console.log(`   ... 還有 ${categories.length - 10} 個分類`)
      }
    }

    // 測試 5: 檢查最近的食物
    console.log('\n🕒 測試 5: 最近新增的食物')
    const { data: recentFoods, error: recentError } = await supabase
      .from('diet_daily_foods')
      .select('name, category, verification_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('❌ 無法獲取最近食物:', recentError.message)
    } else {
      console.log('最近新增的食物:')
      recentFoods.forEach((food, index) => {
        const date = new Date(food.created_at).toLocaleString('zh-TW')
        console.log(`   ${index + 1}. ${food.name} (${food.category}) - ${food.verification_status} - ${date}`)
      })
    }

    // 測試結果總結
    console.log('\n🎉 測試完成！')
    console.log('\n📋 總結:')

    if (totalCount === 0) {
      console.log('⚠️  資料庫為空，建議執行食物資料導入')
      console.log('   可以使用: import_taiwan_foods_simplified.sql')
    } else {
      console.log(`✅ 資料庫包含 ${totalCount} 項食物，可以正常使用 food-database`)

      if (pendingCount > 0) {
        console.log(`⏳ 有 ${pendingCount} 項食物待審核`)
      }

      if (taiwanCount > 0) {
        console.log(`🇹🇼 包含 ${taiwanCount} 項台灣食物`)
      }
    }

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message)
    console.log('\n可能的解決方案:')
    console.log('1. 檢查 .env.local 文件中的 Supabase 配置')
    console.log('2. 確認 Supabase 專案正在運行')
    console.log('3. 檢查網路連接')
  }
}

// 執行測試
testSupabaseIntegration()