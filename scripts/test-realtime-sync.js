#!/usr/bin/env node

/**
 * Realtime Sync 驗證腳本
 * 測試 Mobile-Web 即時同步功能
 * 
 * 功能：
 * 1. 測試 food_entries 表的 realtime subscriptions
 * 2. 測試 daily_symptom_entries 表的 realtime subscriptions
 * 3. 驗證 INSERT, UPDATE, DELETE 事件
 * 4. 測量同步延遲
 * 5. 生成測試報告
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
// 優先使用 service role key（繞過 RLS，僅用於測試）
// 如果沒有，則使用 anon key（需要正確的認證）
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 環境變數未設定');
  console.log('請檢查 .env.local 檔案中的：');
  console.log('- NEXT_PUBLIC_SUPABASE_URL 或 EXPO_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY（推薦，用於測試）');
  console.log('  或 NEXT_PUBLIC_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// 創建 Supabase client
// 如果使用 anon key 且有 access token，需要配置正確的認證
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: usingServiceRole ? {} : (process.env.TEST_ACCESS_TOKEN ? {
      Authorization: `Bearer ${process.env.TEST_ACCESS_TOKEN}`
    } : {})
  }
});

// 如果使用 anon key，可以選擇性地設置用戶 session（用於測試 realtime）
// 注意：這需要從實際的用戶 session 中獲取 access_token
const testAccessToken = process.env.TEST_ACCESS_TOKEN;

// 測試結果收集
const testResults = {
  foodEntries: {
    insert: { passed: 0, failed: 0, delays: [] },
    update: { passed: 0, failed: 0, delays: [] },
    delete: { passed: 0, failed: 0, delays: [] },
  },
  symptomEntries: {
    insert: { passed: 0, failed: 0, delays: [] },
    update: { passed: 0, failed: 0, delays: [] },
    delete: { passed: 0, failed: 0, delays: [] },
  },
  errors: [],
};

// 測試用戶 ID（需要從環境變數或參數取得）
let testUserId = process.argv[2];

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 等待指定時間
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 獲取測試用戶 ID
 */
async function getTestUserId() {
  if (testUserId) {
    return testUserId;
  }

  // 嘗試從資料庫獲取第一個用戶
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    log('❌ 無法獲取測試用戶，請手動提供用戶 ID', 'red');
    log('用法: node test-realtime-sync.js <user_id>', 'yellow');
    process.exit(1);
  }

  return data.id;
}

/**
 * 測試 Food Entries Realtime Subscription
 */
async function testFoodEntriesRealtime(userId) {
  log('\n📋 測試 Food Entries Realtime Subscription', 'cyan');
  log('='.repeat(50), 'cyan');

  return new Promise((resolve) => {
    let isResolved = false;
    let subscriptionTimeout;
    let overallTimeout;
    let testStarted = false;
    let channel; // 先聲明 channel 變數

    const events = {
      insert: null,
      update: null,
      delete: null,
    };

    const timestamps = {
      insert: null,
      update: null,
      delete: null,
    };

    const cleanup = () => {
      if (isResolved) return;
      isResolved = true;
      if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
      if (overallTimeout) clearTimeout(overallTimeout);
      if (channel) channel.unsubscribe();
    };

    // 設置 subscription
    log('   設置 Realtime subscription...', 'blue');
    channel = supabase
      .channel('test_food_entries_realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const eventType = payload.eventType.toLowerCase();
          const timestamp = Date.now();

          log(`\n📨 收到事件: ${eventType}`, 'blue');
          log(`   時間: ${new Date(timestamp).toISOString()}`, 'blue');
          log(`   資料 ID: ${payload.new?.id || payload.old?.id || 'N/A'}`, 'blue');

          if (events[eventType] === null) {
            events[eventType] = payload;
            timestamps[eventType] = timestamp;
          }
        }
      )
      .subscribe((status, err) => {
        log(`\n🔌 Subscription 狀態: ${status}`, status === 'SUBSCRIBED' ? 'green' : 'yellow');
        if (err) {
          log(`   錯誤: ${err.message || JSON.stringify(err)}`, 'red');
        }

        if (status === 'SUBSCRIBED') {
          if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
          testStarted = true;
          log('   ✅ Subscription 已連接，等待 1 秒後開始測試...', 'green');
          // 等待一下確保 subscription 完全建立
          setTimeout(() => {
            runFoodEntriesTests(userId, timestamps, events, channel, () => {
              cleanup();
              resolve();
            });
          }, 1000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          log(`\n❌ Subscription 連接失敗: ${status}`, 'red');
          if (err) {
            log(`   錯誤詳情: ${err.message || JSON.stringify(err)}`, 'red');
          }
          cleanup();
          resolve();
        }
      });

    // Subscription 連接超時（10 秒）
    subscriptionTimeout = setTimeout(() => {
      if (!testStarted) {
        log('\n⏱️  Subscription 連接超時（10秒）', 'red');
        log('   提示: 檢查 Supabase Realtime 是否啟用', 'yellow');
        cleanup();
        resolve();
      }
    }, 10000);

    // 整體測試超時（60 秒）
    overallTimeout = setTimeout(() => {
      if (!isResolved) {
        log('\n⏱️  整體測試超時（60秒）', 'yellow');
        cleanup();
        resolve();
      }
    }, 60000);
  });
}

/**
 * 執行 Food Entries 測試操作
 */
async function runFoodEntriesTests(userId, timestamps, events, channel, resolve) {
  try {
    // Test 1: INSERT
    log('\n🧪 Test 1.1: INSERT 事件測試', 'cyan');
    const insertStartTime = Date.now();
    
    const { data: insertedEntry, error: insertError } = await supabase
      .from('food_entries')
      .insert({
        user_id: userId,
        food_name: `測試食物_${Date.now()}`,
        meal_type: 'breakfast',
        amount: 1,
        unit: '份',
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      log(`❌ INSERT 失敗: ${insertError.message}`, 'red');
      testResults.foodEntries.insert.failed++;
      testResults.errors.push({ test: 'food_insert', error: insertError.message });
    } else {
      log(`✅ INSERT 成功: ${insertedEntry.id}`, 'green');
      log(`   等待 realtime 事件（最多 3 秒）...`, 'blue');
      
      // 等待事件（增加等待時間，因為 realtime 可能有延遲）
      // 使用輪詢方式檢查事件是否到達
      let eventReceived = false;
      for (let i = 0; i < 6; i++) {
        await sleep(500);
        if (events.insert && timestamps.insert) {
          eventReceived = true;
          break;
        }
      }
      
      if (eventReceived) {
        const delay = timestamps.insert - insertStartTime;
        testResults.foodEntries.insert.delays.push(delay);
        
        if (delay < 3000) {
          log(`✅ 事件接收成功，延遲: ${delay}ms`, 'green');
          testResults.foodEntries.insert.passed++;
        } else {
          log(`⚠️  事件接收成功但延遲過長: ${delay}ms`, 'yellow');
          testResults.foodEntries.insert.failed++;
        }
      } else {
        log(`❌ 未收到 INSERT 事件（等待 3 秒後）`, 'red');
        log(`   提示: 使用 service role key 時，realtime 可能不會觸發`, 'yellow');
        log(`   建議: 使用 anon key + 正確的用戶認證來測試 realtime`, 'yellow');
        testResults.foodEntries.insert.failed++;
      }
    }

    // Test 2: UPDATE
    if (insertedEntry) {
      log('\n🧪 Test 1.2: UPDATE 事件測試', 'cyan');
      const updateStartTime = Date.now();
      
      const { error: updateError } = await supabase
        .from('food_entries')
        .update({ food_name: `更新後的測試食物_${Date.now()}` })
        .eq('id', insertedEntry.id)
        .eq('user_id', userId);

      if (updateError) {
        log(`❌ UPDATE 失敗: ${updateError.message}`, 'red');
        testResults.foodEntries.update.failed++;
        testResults.errors.push({ test: 'food_update', error: updateError.message });
      } else {
        log(`✅ UPDATE 成功`, 'green');
        log(`   等待 realtime 事件（最多 3 秒）...`, 'blue');
        
        // 等待事件
        let eventReceived = false;
        for (let i = 0; i < 6; i++) {
          await sleep(500);
          if (events.update && timestamps.update) {
            eventReceived = true;
            break;
          }
        }
        
        if (eventReceived) {
          const delay = timestamps.update - updateStartTime;
          testResults.foodEntries.update.delays.push(delay);
          
          if (delay < 3000) {
            log(`✅ 事件接收成功，延遲: ${delay}ms`, 'green');
            testResults.foodEntries.update.passed++;
          } else {
            log(`⚠️  事件接收成功但延遲過長: ${delay}ms`, 'yellow');
            testResults.foodEntries.update.failed++;
          }
        } else {
          log(`❌ 未收到 UPDATE 事件（等待 3 秒後）`, 'red');
          testResults.foodEntries.update.failed++;
        }
      }

      // Test 3: DELETE
      log('\n🧪 Test 1.3: DELETE 事件測試', 'cyan');
      const deleteStartTime = Date.now();
      
      const { error: deleteError } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', insertedEntry.id)
        .eq('user_id', userId);

      if (deleteError) {
        log(`❌ DELETE 失敗: ${deleteError.message}`, 'red');
        testResults.foodEntries.delete.failed++;
        testResults.errors.push({ test: 'food_delete', error: deleteError.message });
      } else {
        log(`✅ DELETE 成功`, 'green');
        log(`   等待 realtime 事件（最多 3 秒）...`, 'blue');
        
        // 等待事件
        let eventReceived = false;
        for (let i = 0; i < 6; i++) {
          await sleep(500);
          if (events.delete && timestamps.delete) {
            eventReceived = true;
            break;
          }
        }
        
        if (eventReceived) {
          const delay = timestamps.delete - deleteStartTime;
          testResults.foodEntries.delete.delays.push(delay);
          
          if (delay < 3000) {
            log(`✅ 事件接收成功，延遲: ${delay}ms`, 'green');
            testResults.foodEntries.delete.passed++;
          } else {
            log(`⚠️  事件接收成功但延遲過長: ${delay}ms`, 'yellow');
            testResults.foodEntries.delete.failed++;
          }
        } else {
          log(`❌ 未收到 DELETE 事件（等待 3 秒後）`, 'red');
          testResults.foodEntries.delete.failed++;
        }
      }
    }

  } catch (error) {
    log(`❌ 測試執行錯誤: ${error.message}`, 'red');
    testResults.errors.push({ test: 'food_entries', error: error.message });
  } finally {
    // 清理（channel 會在 cleanup 中處理，這裡只做最後的等待）
    await sleep(500);
    log('\n✅ Food Entries 測試完成', 'green');
    // resolve 由調用者處理
  }
}

/**
 * 測試 Symptom Entries Realtime Subscription
 */
async function testSymptomEntriesRealtime(userId) {
  log('\n📋 測試 Symptom Entries Realtime Subscription', 'cyan');
  log('='.repeat(50), 'cyan');

  return new Promise((resolve) => {
    let isResolved = false;
    let subscriptionTimeout;
    let overallTimeout;
    let testStarted = false;
    let channel; // 先聲明 channel 變數

    const events = {
      insert: null,
      update: null,
      delete: null,
    };

    const timestamps = {
      insert: null,
      update: null,
      delete: null,
    };

    const cleanup = () => {
      if (isResolved) return;
      isResolved = true;
      if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
      if (overallTimeout) clearTimeout(overallTimeout);
      if (channel) channel.unsubscribe();
    };

    // 設置 subscription
    log('   設置 Realtime subscription...', 'blue');
    channel = supabase
      .channel('test_symptom_entries_realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_symptom_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const eventType = payload.eventType.toLowerCase();
          const timestamp = Date.now();

          log(`\n📨 收到事件: ${eventType}`, 'blue');
          log(`   時間: ${new Date(timestamp).toISOString()}`, 'blue');
          log(`   資料 ID: ${payload.new?.id || payload.old?.id || 'N/A'}`, 'blue');

          if (events[eventType] === null) {
            events[eventType] = payload;
            timestamps[eventType] = timestamp;
          }
        }
      )
      .subscribe((status, err) => {
        log(`\n🔌 Subscription 狀態: ${status}`, status === 'SUBSCRIBED' ? 'green' : 'yellow');
        if (err) {
          log(`   錯誤: ${err.message || JSON.stringify(err)}`, 'red');
        }

        if (status === 'SUBSCRIBED') {
          if (subscriptionTimeout) clearTimeout(subscriptionTimeout);
          testStarted = true;
          log('   ✅ Subscription 已連接，等待 1 秒後開始測試...', 'green');
          // 等待一下確保 subscription 完全建立
          setTimeout(() => {
            runSymptomEntriesTests(userId, timestamps, events, channel, () => {
              cleanup();
              resolve();
            });
          }, 1000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          log(`\n❌ Subscription 連接失敗: ${status}`, 'red');
          if (err) {
            log(`   錯誤詳情: ${err.message || JSON.stringify(err)}`, 'red');
          }
          cleanup();
          resolve();
        }
      });

    // Subscription 連接超時（10 秒）
    subscriptionTimeout = setTimeout(() => {
      if (!testStarted) {
        log('\n⏱️  Subscription 連接超時（10秒）', 'red');
        log('   提示: 檢查 Supabase Realtime 是否啟用', 'yellow');
        cleanup();
        resolve();
      }
    }, 10000);

    // 整體測試超時（60 秒）
    overallTimeout = setTimeout(() => {
      if (!isResolved) {
        log('\n⏱️  整體測試超時（60秒）', 'yellow');
        cleanup();
        resolve();
      }
    }, 60000);
  });
}

/**
 * 執行 Symptom Entries 測試操作
 */
async function runSymptomEntriesTests(userId, timestamps, events, channel, resolve) {
  try {
    // Test 1: INSERT
    log('\n🧪 Test 2.1: INSERT 事件測試', 'cyan');
    const insertStartTime = Date.now();
    
    // 先檢查並刪除今天可能存在的記錄（避免唯一約束錯誤）
    const recordedDate = new Date().toISOString().split('T')[0];
    log(`   檢查並清理 ${recordedDate} 的現有記錄...`, 'blue');
    
    const { data: existingEntries } = await supabase
      .from('daily_symptom_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('recorded_date', recordedDate);
    
    if (existingEntries && existingEntries.length > 0) {
      log(`   找到 ${existingEntries.length} 筆現有記錄，正在清理...`, 'yellow');
      for (const entry of existingEntries) {
        await supabase
          .from('daily_symptom_entries')
          .delete()
          .eq('id', entry.id);
      }
      await sleep(500); // 等待刪除完成
    }
    
    const { data: insertedEntry, error: insertError } = await supabase
      .from('daily_symptom_entries')
      .insert({
        user_id: userId,
        recorded_date: recordedDate,
        recorded_at: new Date().toISOString(),
        overall_health: 3, // 必填欄位，1-5 分數
        abdominal_pain: 0,
        diarrhea: 0,
        bloody_stool: 0,
        bloating: 0,
        entry_source: 'manual',
        data_completeness_score: 0.6,
        triggers_identified: [],
        improvement_factors: [],
        medications_taken: [],
        additional_symptoms: [],
        related_food_entries: [],
        notes: `測試症狀_${Date.now()}`,
      })
      .select()
      .single();

    if (insertError) {
      log(`❌ INSERT 失敗: ${insertError.message}`, 'red');
      testResults.symptomEntries.insert.failed++;
      testResults.errors.push({ test: 'symptom_insert', error: insertError.message });
    } else {
      log(`✅ INSERT 成功: ${insertedEntry.id}`, 'green');
      log(`   等待 realtime 事件（最多 3 秒）...`, 'blue');
      
      // 等待事件
      let eventReceived = false;
      for (let i = 0; i < 6; i++) {
        await sleep(500);
        if (events.insert && timestamps.insert) {
          eventReceived = true;
          break;
        }
      }
      
      if (eventReceived) {
        const delay = timestamps.insert - insertStartTime;
        testResults.symptomEntries.insert.delays.push(delay);
        
        if (delay < 3000) {
          log(`✅ 事件接收成功，延遲: ${delay}ms`, 'green');
          testResults.symptomEntries.insert.passed++;
        } else {
          log(`⚠️  事件接收成功但延遲過長: ${delay}ms`, 'yellow');
          testResults.symptomEntries.insert.failed++;
        }
      } else {
        log(`❌ 未收到 INSERT 事件（等待 3 秒後）`, 'red');
        log(`   提示: 使用 service role key 時，realtime 可能不會觸發`, 'yellow');
        testResults.symptomEntries.insert.failed++;
      }
    }

    // Test 2: UPDATE
    if (insertedEntry) {
      log('\n🧪 Test 2.2: UPDATE 事件測試', 'cyan');
      const updateStartTime = Date.now();
      
      const { error: updateError } = await supabase
        .from('daily_symptom_entries')
        .update({ 
          overall_health: 5, 
          notes: `更新後的測試症狀_${Date.now()}` 
        })
        .eq('id', insertedEntry.id)
        .eq('user_id', userId);

      if (updateError) {
        log(`❌ UPDATE 失敗: ${updateError.message}`, 'red');
        testResults.symptomEntries.update.failed++;
        testResults.errors.push({ test: 'symptom_update', error: updateError.message });
      } else {
        log(`✅ UPDATE 成功`, 'green');
        log(`   等待 realtime 事件（最多 3 秒）...`, 'blue');
        
        // 等待事件
        let eventReceived = false;
        for (let i = 0; i < 6; i++) {
          await sleep(500);
          if (events.update && timestamps.update) {
            eventReceived = true;
            break;
          }
        }
        
        if (eventReceived) {
          const delay = timestamps.update - updateStartTime;
          testResults.symptomEntries.update.delays.push(delay);
          
          if (delay < 3000) {
            log(`✅ 事件接收成功，延遲: ${delay}ms`, 'green');
            testResults.symptomEntries.update.passed++;
          } else {
            log(`⚠️  事件接收成功但延遲過長: ${delay}ms`, 'yellow');
            testResults.symptomEntries.update.failed++;
          }
        } else {
          log(`❌ 未收到 UPDATE 事件（等待 3 秒後）`, 'red');
          testResults.symptomEntries.update.failed++;
        }
      }

      // Test 3: DELETE
      log('\n🧪 Test 2.3: DELETE 事件測試', 'cyan');
      const deleteStartTime = Date.now();
      
      const { error: deleteError } = await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('id', insertedEntry.id)
        .eq('user_id', userId);

      if (deleteError) {
        log(`❌ DELETE 失敗: ${deleteError.message}`, 'red');
        testResults.symptomEntries.delete.failed++;
        testResults.errors.push({ test: 'symptom_delete', error: deleteError.message });
      } else {
        log(`✅ DELETE 成功`, 'green');
        log(`   等待 realtime 事件（最多 3 秒）...`, 'blue');
        
        // 等待事件
        let eventReceived = false;
        for (let i = 0; i < 6; i++) {
          await sleep(500);
          if (events.delete && timestamps.delete) {
            eventReceived = true;
            break;
          }
        }
        
        if (eventReceived) {
          const delay = timestamps.delete - deleteStartTime;
          testResults.symptomEntries.delete.delays.push(delay);
          
          if (delay < 3000) {
            log(`✅ 事件接收成功，延遲: ${delay}ms`, 'green');
            testResults.symptomEntries.delete.passed++;
          } else {
            log(`⚠️  事件接收成功但延遲過長: ${delay}ms`, 'yellow');
            testResults.symptomEntries.delete.failed++;
          }
        } else {
          log(`❌ 未收到 DELETE 事件（等待 3 秒後）`, 'red');
          testResults.symptomEntries.delete.failed++;
        }
      }
    }

  } catch (error) {
    log(`❌ 測試執行錯誤: ${error.message}`, 'red');
    testResults.errors.push({ test: 'symptom_entries', error: error.message });
  } finally {
    // 清理（channel 會在 cleanup 中處理，這裡只做最後的等待）
    await sleep(500);
    log('\n✅ Symptom Entries 測試完成', 'green');
    // resolve 由調用者處理
  }
}

/**
 * 計算統計數據
 */
function calculateStats(delays) {
  if (delays.length === 0) return null;
  
  const sum = delays.reduce((a, b) => a + b, 0);
  const avg = sum / delays.length;
  const min = Math.min(...delays);
  const max = Math.max(...delays);
  
  return { avg, min, max, count: delays.length };
}

/**
 * 生成測試報告
 */
function generateReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 測試報告', 'cyan');
  log('='.repeat(60), 'cyan');

  // Food Entries 報告
  log('\n🍽️  Food Entries 測試結果:', 'cyan');
  ['insert', 'update', 'delete'].forEach(event => {
    const result = testResults.foodEntries[event];
    const stats = calculateStats(result.delays);
    const total = result.passed + result.failed;
    const passRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : 0;
    
    log(`\n  ${event.toUpperCase()}:`, 'blue');
    log(`    通過: ${result.passed} / ${total} (${passRate}%)`, result.passed === total ? 'green' : 'yellow');
    if (stats) {
      log(`    平均延遲: ${stats.avg.toFixed(0)}ms`, 'blue');
      log(`    最小延遲: ${stats.min}ms`, 'blue');
      log(`    最大延遲: ${stats.max}ms`, 'blue');
    }
  });

  // Symptom Entries 報告
  log('\n🏥 Symptom Entries 測試結果:', 'cyan');
  ['insert', 'update', 'delete'].forEach(event => {
    const result = testResults.symptomEntries[event];
    const stats = calculateStats(result.delays);
    const total = result.passed + result.failed;
    const passRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : 0;
    
    log(`\n  ${event.toUpperCase()}:`, 'blue');
    log(`    通過: ${result.passed} / ${total} (${passRate}%)`, result.passed === total ? 'green' : 'yellow');
    if (stats) {
      log(`    平均延遲: ${stats.avg.toFixed(0)}ms`, 'blue');
      log(`    最小延遲: ${stats.min}ms`, 'blue');
      log(`    最大延遲: ${stats.max}ms`, 'blue');
    }
  });

  // 總體統計
  const totalPassed = 
    testResults.foodEntries.insert.passed +
    testResults.foodEntries.update.passed +
    testResults.foodEntries.delete.passed +
    testResults.symptomEntries.insert.passed +
    testResults.symptomEntries.update.passed +
    testResults.symptomEntries.delete.passed;
  
  const totalFailed = 
    testResults.foodEntries.insert.failed +
    testResults.foodEntries.update.failed +
    testResults.foodEntries.delete.failed +
    testResults.symptomEntries.insert.failed +
    testResults.symptomEntries.update.failed +
    testResults.symptomEntries.delete.failed;
  
  const totalTests = totalPassed + totalFailed;
  const overallPassRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  log('\n📈 總體統計:', 'cyan');
  log(`  總測試數: ${totalTests}`, 'blue');
  log(`  通過: ${totalPassed}`, 'green');
  log(`  失敗: ${totalFailed}`, totalFailed === 0 ? 'green' : 'red');
  log(`  通過率: ${overallPassRate}%`, overallPassRate >= 98 ? 'green' : 'yellow');

  // 錯誤報告
  if (testResults.errors.length > 0) {
    log('\n❌ 錯誤列表:', 'red');
    testResults.errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error.test}: ${error.error}`, 'red');
    });
  }

  // 結論
  log('\n' + '='.repeat(60), 'cyan');
  if (overallPassRate >= 98 && totalFailed === 0) {
    log('✅ 所有測試通過！Realtime Sync 功能正常運作', 'green');
  } else if (overallPassRate >= 90) {
    log('⚠️  大部分測試通過，但有一些問題需要修復', 'yellow');
  } else {
    log('❌ 測試失敗率過高，需要檢查配置和實作', 'red');
    
    // 如果使用 service role key 且沒有收到任何事件，提供建議
    if (usingServiceRole && totalPassed === 0) {
      log('', 'reset');
      log('💡 可能的解決方案:', 'cyan');
      log('   1. 使用 anon key 而非 service role key', 'blue');
      log('   2. 確保 Supabase Realtime 已啟用（Dashboard → Database → Realtime）', 'blue');
      log('   3. 檢查資料表的 realtime 設定是否開啟', 'blue');
      log('   4. 確認網路連接正常', 'blue');
    }
  }
  log('='.repeat(60), 'cyan');
}

/**
 * 主函數
 */
async function main() {
  log('🚀 開始 Realtime Sync 驗證測試', 'cyan');
  log('='.repeat(60), 'cyan');

  if (usingServiceRole) {
    log('⚠️  使用 Service Role Key（將繞過 RLS 政策）', 'yellow');
    log('⚠️  注意: Service Role Key 可能無法觸發 Realtime 事件', 'yellow');
    log('', 'reset');
    log('💡 要測試 realtime，請使用 anon key:', 'cyan');
    log('   1. 在 .env.local 中註釋或移除 SUPABASE_SERVICE_ROLE_KEY', 'blue');
    log('   2. 確保有 NEXT_PUBLIC_SUPABASE_ANON_KEY', 'blue');
    log('   3. (可選) 設置 TEST_ACCESS_TOKEN 以通過 RLS 政策', 'blue');
    log('      - 從瀏覽器 DevTools > Application > Cookies 複製 supabase.auth.token', 'blue');
    log('      - 或從 Mobile app 的 AsyncStorage 獲取', 'blue');
    log('');
  } else {
    log('✅ 使用 Anon Key（適合測試 Realtime）', 'green');
    if (testAccessToken) {
      log('✅ 已設置 Access Token（將通過 RLS 政策）', 'green');
      // 設置 session
      try {
        // 嘗試解析 token（可能是 JSON 格式的完整 session）
        let accessToken = testAccessToken;
        let refreshToken = '';
        
        // 如果是 JSON 格式，嘗試解析
        if (testAccessToken.startsWith('{')) {
          try {
            const sessionData = JSON.parse(testAccessToken);
            accessToken = sessionData.access_token || sessionData.accessToken || testAccessToken;
            refreshToken = sessionData.refresh_token || sessionData.refreshToken || '';
          } catch (e) {
            // 不是 JSON，直接使用
          }
        }
        
        // 先嘗試使用 getUser 驗證 token
        const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
        
        if (userError) {
          // 如果 getUser 失敗，嘗試 setSession
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || 'dummy',
          });
          
          if (sessionError) {
            log(`⚠️  設置 session 失敗: ${sessionError.message}`, 'yellow');
            log('   提示: Access Token 可能已過期或格式不正確', 'yellow');
            log('   將繼續使用未認證的連接（可能無法通過 RLS）', 'yellow');
          } else if (sessionData?.user) {
            log('✅ Session 設置成功', 'green');
            log(`   認證用戶 ID: ${sessionData.user.id}`, 'blue');
            log(`   認證用戶 Email: ${sessionData.user.email || 'N/A'}`, 'blue');
          }
        } else if (userData?.user) {
          // getUser 成功，直接使用這個 token
          log('✅ Token 驗證成功', 'green');
          log(`   認證用戶 ID: ${userData.user.id}`, 'blue');
          log(`   認證用戶 Email: ${userData.user.email || 'N/A'}`, 'blue');
          // 設置 session（即使失敗也繼續，因為 token 已經有效）
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          }).catch(() => {
            // 忽略 setSession 錯誤，因為 getUser 已經成功
          });
        } else {
          log('⚠️  無法驗證 token', 'yellow');
        }
      } catch (err) {
        log(`⚠️  設置 session 時發生錯誤: ${err.message}`, 'yellow');
        log('   將繼續使用未認證的連接（可能無法通過 RLS）', 'yellow');
      }
    } else {
      log('⚠️  未設置 Access Token（可能無法通過 RLS 政策）', 'yellow');
      log('   提示: 設置 TEST_ACCESS_TOKEN 環境變數以進行認證', 'yellow');
    }
    log('');
  }

  try {
    // 獲取測試用戶 ID
    testUserId = await getTestUserId();
    log(`\n👤 使用測試用戶 ID: ${testUserId}`, 'blue');

    // 測試 Food Entries
    await testFoodEntriesRealtime(testUserId);
    
    // 等待一下再測試 Symptom Entries
    await sleep(2000);
    
    // 測試 Symptom Entries
    await testSymptomEntriesRealtime(testUserId);

    // 生成報告
    generateReport();

  } catch (error) {
    log(`\n❌ 測試執行失敗: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 執行測試
main().catch(console.error);

