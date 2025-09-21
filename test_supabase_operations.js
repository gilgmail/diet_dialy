#!/usr/bin/env node

// Supabase 操作測試程式
// 用於診斷 Diet Daily 應用程式的儲存問題

const { createClient } = require('@supabase/supabase-js')

// 使用與主應用程式相同的配置
const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

// 測試用戶 ID（從當前會話獲取）
const testUserId = '22e990b6-a888-4beb-9ac6-c9a145731542'
const testEmail = 'gilko0725@gmail.com'

// 測試醫療狀況資料（與設定頁面相同的結構）
const testMedicalData = {
  medical_conditions: ['發炎性腸病 (IBD)'],
  allergies: [],
  dietary_restrictions: [],
  medications: []
}

async function logStep(step, description) {
  console.log(`\n📋 ${step}: ${description}`)
  console.log('=' .repeat(50))
}

async function logResult(success, data, error = null) {
  if (success) {
    console.log('✅ 成功:', JSON.stringify(data, null, 2))
  } else {
    console.log('❌ 失敗:', error?.message || error)
    if (error?.details) console.log('詳細:', error.details)
    if (error?.hint) console.log('提示:', error.hint)
  }
}

// 測試 1: 基本連接測試
async function testConnection() {
  await logStep('測試 1', '基本 Supabase 連接測試')

  try {
    const { data, error } = await supabase.auth.getSession()
    await logResult(!error, { connected: true, hasSession: !!data.session }, error)
    return !error
  } catch (err) {
    await logResult(false, null, err)
    return false
  }
}

// 測試 2: 檢查用戶資料表
async function testTableAccess() {
  await logStep('測試 2', '檢查 diet_daily_users 資料表存取權限')

  try {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .select('count', { count: 'exact' })

    await logResult(!error, { tableAccess: true, count: data }, error)
    return !error
  } catch (err) {
    await logResult(false, null, err)
    return false
  }
}

// 測試 3: 查詢特定用戶資料
async function testGetUserProfile() {
  await logStep('測試 3', `查詢用戶資料 (ID: ${testUserId})`)

  try {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .select('*')
      .eq('id', testUserId)
      .single()

    await logResult(!error, data, error)
    return { success: !error, data }
  } catch (err) {
    await logResult(false, null, err)
    return { success: false, data: null }
  }
}

// 測試 4: 建立或更新用戶資料（模擬 upsertUserProfile）
async function testUpsertUserProfile() {
  await logStep('測試 4', '建立或更新用戶資料')

  try {
    // 先檢查用戶是否存在
    const { data: existingUser } = await supabase
      .from('diet_daily_users')
      .select('*')
      .eq('id', testUserId)
      .single()

    console.log('現有用戶資料:', existingUser ? '存在' : '不存在')

    if (existingUser) {
      // 更新現有用戶
      const { data, error } = await supabase
        .from('diet_daily_users')
        .update({
          ...testMedicalData,
          updated_at: new Date().toISOString()
        })
        .eq('id', testUserId)
        .select()
        .single()

      await logResult(!error, data, error)
      return { success: !error, data }
    } else {
      // 建立新用戶
      const { data, error } = await supabase
        .from('diet_daily_users')
        .insert({
          id: testUserId,
          email: testEmail,
          ...testMedicalData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      await logResult(!error, data, error)
      return { success: !error, data }
    }
  } catch (err) {
    await logResult(false, null, err)
    return { success: false, data: null }
  }
}

// 測試 5: 直接更新用戶資料（模擬 updateUserProfile）
async function testUpdateUserProfile() {
  await logStep('測試 5', '直接更新用戶醫療資料')

  try {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .update(testMedicalData)
      .eq('id', testUserId)
      .select()
      .single()

    await logResult(!error, data, error)
    return { success: !error, data }
  } catch (err) {
    await logResult(false, null, err)
    return { success: false, data: null }
  }
}

// 測試 6: 驗證資料是否正確儲存
async function testVerifyData() {
  await logStep('測試 6', '驗證資料是否正確儲存')

  try {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .select('medical_conditions, allergies, dietary_restrictions, medications')
      .eq('id', testUserId)
      .single()

    const isCorrect = JSON.stringify(data.medical_conditions) === JSON.stringify(testMedicalData.medical_conditions)

    await logResult(!error, {
      savedData: data,
      expectedData: testMedicalData,
      isCorrect
    }, error)

    return { success: !error && isCorrect, data }
  } catch (err) {
    await logResult(false, null, err)
    return { success: false, data: null }
  }
}

// 主測試函數
async function runAllTests() {
  console.log('🧪 Supabase 操作測試開始')
  console.log(`時間: ${new Date().toLocaleString('zh-TW')}`)
  console.log(`測試用戶: ${testUserId}`)
  console.log(`測試資料: ${JSON.stringify(testMedicalData)}`)

  const results = {
    connection: false,
    tableAccess: false,
    getUserProfile: false,
    upsertUserProfile: false,
    updateUserProfile: false,
    verifyData: false
  }

  // 執行所有測試
  results.connection = await testConnection()

  if (results.connection) {
    results.tableAccess = await testTableAccess()

    if (results.tableAccess) {
      const getUserResult = await testGetUserProfile()
      results.getUserProfile = getUserResult.success

      const upsertResult = await testUpsertUserProfile()
      results.upsertUserProfile = upsertResult.success

      if (upsertResult.success) {
        const updateResult = await testUpdateUserProfile()
        results.updateUserProfile = updateResult.success

        if (updateResult.success) {
          const verifyResult = await testVerifyData()
          results.verifyData = verifyResult.success
        }
      }
    }
  }

  // 測試結果摘要
  console.log('\n🎯 測試結果摘要')
  console.log('=' .repeat(50))

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? '通過' : '失敗'}`)
  })

  const allPassed = Object.values(results).every(r => r)

  console.log('\n' + '=' .repeat(50))
  console.log(`總體結果: ${allPassed ? '✅ 所有測試通過' : '❌ 部分測試失敗'}`)

  if (allPassed) {
    console.log('\n💡 建議: Supabase 操作正常，問題可能在前端代碼邏輯')
  } else {
    console.log('\n💡 建議: 檢查失敗的測試項目以診斷問題')
  }

  return results
}

// 執行測試
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { runAllTests, testUserId, testMedicalData }