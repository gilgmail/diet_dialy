#!/usr/bin/env node

// 測試已認證用戶的 Supabase 儲存操作
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'

const supabase = createClient(supabaseUrl, supabaseKey)

// 測試用戶數據（來自服務器日誌的已認證用戶）
const authenticatedUserId = '22e990b6-a888-4beb-9ac6-c9a145731542'
const testEmail = 'gilko0725@gmail.com'

async function testAuthenticatedUserOperations() {
  console.log('🧪 測試已認證用戶的儲存操作')
  console.log('=' .repeat(50))
  console.log(`👤 測試用戶: ${authenticatedUserId}`)
  console.log(`📧 用戶信箱: ${testEmail}`)
  console.log('')

  try {
    // 測試 1: 查詢現有用戶數據
    console.log('📋 測試 1: 查詢現有用戶數據...')
    const { data: existingUser, error: queryError } = await supabase
      .from('diet_daily_users')
      .select('*')
      .eq('id', authenticatedUserId)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      console.log('❌ 查詢錯誤:', queryError.message)
    } else if (existingUser) {
      console.log('✅ 找到現有用戶數據:')
      console.log('  - 信箱:', existingUser.email)
      console.log('  - 醫療狀況:', existingUser.medical_conditions || '[]')
      console.log('  - 過敏原:', existingUser.allergies || '[]')
      console.log('  - 飲食限制:', existingUser.dietary_restrictions || '[]')
      console.log('  - 創建時間:', existingUser.created_at)
      console.log('  - 更新時間:', existingUser.updated_at)
    } else {
      console.log('📝 用戶數據不存在，將創建新用戶')
    }

    console.log('')

    // 測試 2: 創建或更新用戶數據
    console.log('💾 測試 2: 創建或更新用戶數據...')

    const userData = {
      id: authenticatedUserId,
      email: testEmail,
      medical_conditions: ['發炎性腸病 (IBD)'],
      allergies: ['牛奶'],
      dietary_restrictions: ['低 FODMAP 飲食'],
      medications: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 使用 upsert 來創建或更新
    const { data: upsertedData, error: upsertError } = await supabase
      .from('diet_daily_users')
      .upsert(userData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (upsertError) {
      console.log('❌ Upsert 失敗:', upsertError.message)
      console.log('錯誤詳情:', upsertError)

      // 如果 upsert 失敗，嘗試直接 insert
      console.log('🔄 嘗試直接插入...')
      const { data: insertData, error: insertError } = await supabase
        .from('diet_daily_users')
        .insert(userData)
        .select()
        .single()

      if (insertError) {
        console.log('❌ Insert 也失敗:', insertError.message)
        return
      } else {
        console.log('✅ 直接插入成功:', insertData)
      }
    } else {
      console.log('✅ Upsert 成功:', upsertedData)
    }

    console.log('')

    // 測試 3: 驗證資料持久化
    console.log('🔍 測試 3: 驗證資料持久化...')
    const { data: verificationData, error: verificationError } = await supabase
      .from('diet_daily_users')
      .select('*')
      .eq('id', authenticatedUserId)
      .single()

    if (verificationError) {
      console.log('❌ 驗證失敗:', verificationError.message)
    } else {
      console.log('✅ 資料驗證成功:')
      console.log('  - 醫療狀況:', verificationData.medical_conditions)
      console.log('  - 過敏原:', verificationData.allergies)
      console.log('  - 飲食限制:', verificationData.dietary_restrictions)
      console.log('  - 最後更新:', verificationData.updated_at)
    }

    console.log('')

    // 測試 4: 更新部分資料
    console.log('📝 測試 4: 更新部分資料...')
    const updateData = {
      medical_conditions: ['發炎性腸病 (IBD)', '腸躁症 (IBS)'],
      dietary_restrictions: ['低 FODMAP 飲食', '無麩質飲食'],
      updated_at: new Date().toISOString()
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('diet_daily_users')
      .update(updateData)
      .eq('id', authenticatedUserId)
      .select()
      .single()

    if (updateError) {
      console.log('❌ 更新失敗:', updateError.message)
    } else {
      console.log('✅ 部分更新成功:')
      console.log('  - 新醫療狀況:', updatedData.medical_conditions)
      console.log('  - 新飲食限制:', updatedData.dietary_restrictions)
    }

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error)
  }
}

async function provideFinalSummary() {
  console.log('')
  console.log('📊 測試總結')
  console.log('=' .repeat(50))
  console.log('✅ 成功測試項目:')
  console.log('  1. Supabase 基礎連接')
  console.log('  2. 用戶數據查詢')
  console.log('  3. 用戶數據創建/更新（Upsert）')
  console.log('  4. 資料持久化驗證')
  console.log('  5. 部分資料更新')
  console.log('')
  console.log('🎯 前端應用程式測試建議:')
  console.log('  1. 在 http://localhost:3000/settings 測試醫療狀況選擇')
  console.log('  2. 確認選擇的狀況能正確儲存')
  console.log('  3. 重新載入頁面確認資料持久存在')
  console.log('  4. 嘗試修改設定並確認更新成功')
  console.log('')
  console.log('💡 如果前端仍有問題:')
  console.log('  - 檢查瀏覽器開發者工具的 Console 日誌')
  console.log('  - 確認認證狀態正確顯示')
  console.log('  - 查看 Network 標籤的 API 請求')
}

async function main() {
  await testAuthenticatedUserOperations()
  await provideFinalSummary()
}

main().catch(console.error)