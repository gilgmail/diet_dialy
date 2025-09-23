#!/usr/bin/env node

// 測試食物評分功能
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://lbjeyvvierxcnrytuvto.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'
)

async function testScoreUpdate() {
  try {
    console.log('🧪 測試評分更新功能...')

    // 先獲取一個食物
    const { data: foods, error: fetchError } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .limit(1)

    if (fetchError) {
      console.log('❌ 獲取食物失敗:', fetchError)
      return
    }

    if (!foods || foods.length === 0) {
      console.log('⚠️ 沒有找到食物')
      return
    }

    const testFood = foods[0]
    console.log('📋 測試食物:', testFood.name)
    console.log('📋 食物ID:', testFood.id)

    // 準備測試評分數據
    const testScores = {
      ibd: {
        general_safety: 4,
        acute_phase: 3,
        remission_phase: 5
      },
      ibs: {
        general_safety: 3,
        trigger_risk: 'low'
      },
      allergies: {
        allergen_free_confidence: 5,
        cross_contamination_risk: 5
      },
      cancer_chemo: {
        general_safety: 4,
        immune_support: 3,
        nausea_friendly: 4,
        nutrition_density: 3
      }
    }

    const testNotes = '測試評分更新功能 - ' + new Date().toISOString()

    console.log('📝 準備更新評分...')

    // 更新評分
    const { data: updatedFood, error: updateError } = await supabase
      .from('diet_daily_foods')
      .update({
        condition_scores: testScores,
        verification_notes: testNotes,
        verified_by: 'test-admin',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testFood.id)
      .select()

    if (updateError) {
      console.log('❌ 更新評分失敗:', updateError)
      return
    }

    console.log('✅ 評分更新成功!')
    console.log('📊 更新結果:', updatedFood)
    if (updatedFood && updatedFood.length > 0) {
      const foodResult = updatedFood[0]
      console.log('📊 新評分:', JSON.stringify(foodResult.condition_scores, null, 2))
      console.log('📝 備註:', foodResult.verification_notes)
    }

    // 驗證更新是否正確
    console.log('🔍 驗證更新結果...')
    const { data: verifyFood, error: verifyError } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('id', testFood.id)
      .single()

    if (verifyError) {
      console.log('❌ 驗證失敗:', verifyError)
      return
    }

    console.log('🔍 驗證結果:')
    console.log('- 評分是否正確:', JSON.stringify(verifyFood.condition_scores) === JSON.stringify(testScores))
    console.log('- 備註是否正確:', verifyFood.verification_notes === testNotes)
    console.log('- 驗證者是否正確:', verifyFood.verified_by === 'test-admin')
    console.log('- 更新時間:', verifyFood.updated_at)

    console.log('🎉 評分功能測試完成!')

  } catch (err) {
    console.log('💥 測試異常:', err.message)
  }
}

// 測試獲取需要評分的食物
async function testFoodsNeedingScores() {
  try {
    console.log('\n🔍 測試獲取需要評分的食物...')

    const { data: foods, error } = await supabase
      .from('diet_daily_foods')
      .select('id, name, condition_scores')
      .eq('verification_status', 'admin_approved')
      .limit(5)

    if (error) {
      console.log('❌ 獲取失敗:', error)
      return
    }

    console.log('📊 食物評分狀態:')
    foods.forEach((food, index) => {
      const hasScores = food.condition_scores && Object.keys(food.condition_scores).length > 0
      console.log(`${index + 1}. ${food.name}: ${hasScores ? '✅ 已評分' : '❌ 未評分'}`)
    })

  } catch (err) {
    console.log('💥 測試異常:', err.message)
  }
}

// 執行所有測試
async function runAllTests() {
  console.log('🚀 開始測試食物評分系統...')
  console.log('=' .repeat(50))

  await testScoreUpdate()
  await testFoodsNeedingScores()

  console.log('=' .repeat(50))
  console.log('✅ 所有測試完成!')
}

if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testScoreUpdate, testFoodsNeedingScores }