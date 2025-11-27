# Realtime Sync Testing Guide

**建立時間**: 2025-11-26
**狀態**: ✅ Realtime Subscriptions 已實作
**目的**: 測試 Mobile-Web 即時同步功能

---

## 📋 實作摘要

### 已完成的變更

#### 1. useFoodDiary.ts
**位置**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/food-diary/hooks/useFoodDiary.ts`

**新增功能**:
- Supabase Realtime subscription 監聽 `food_entries` 表
- 監聽所有事件：INSERT, UPDATE, DELETE
- 使用 user_id 過濾，只接收當前用戶的變更
- 事件觸發時自動 invalidate React Query cache
- 自動清理 subscription（unmount 時）

**實作細節**:
```typescript
useEffect(() => {
  if (!user?.id) return

  const channel = supabase
    .channel('food_entries_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'food_entries',
      filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      console.log('[useFoodDiary] Realtime event received:', payload.eventType)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.foodEntries(user.id),
      })
    })
    .subscribe()

  return () => channel.unsubscribe()
}, [user?.id, queryClient])
```

#### 2. useSymptomDiary.ts
**位置**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/symptom-diary/hooks/useSymptomDiary.ts`

**新增功能**:
- Supabase Realtime subscription 監聽 `daily_symptom_entries` 表
- 監聽所有事件：INSERT, UPDATE, DELETE
- 使用 user_id 過濾
- 事件觸發時自動 invalidate React Query cache
- 自動清理 subscription

**實作細節**:
```typescript
useEffect(() => {
  if (!user?.id) return

  const channel = supabase
    .channel('symptom_entries_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'daily_symptom_entries',
      filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      console.log('[useSymptomDiary] Realtime event received:', payload.eventType)
      queryClient.invalidateQueries({
        queryKey: ['symptomEntries', user.id],
      })
    })
    .subscribe()

  return () => channel.unsubscribe()
}, [user?.id, queryClient])
```

---

## 🧪 測試計劃

### 測試環境準備

#### 前置條件
- [ ] Mobile app 已安裝並可運行
- [ ] Web app 已運行（http://localhost:3000 或 production URL）
- [ ] 兩端使用相同的用戶帳號登入
- [ ] 網路連線穩定

#### 測試工具
- [ ] React Native Debugger（查看 console logs）
- [ ] Chrome DevTools（Web 端）
- [ ] Supabase Dashboard（監控 realtime connections）

---

### Test Suite 1: Food Entries 同步測試

#### Test 1.1: Web → Mobile 同步（新增）
**目的**: 驗證 Web 新增食物記錄後，Mobile 即時顯示

**步驟**:
1. 在 Mobile 打開 Food Diary 畫面
2. 在 Web 新增一筆食物記錄
3. 觀察 Mobile console logs 是否出現 realtime event
4. 檢查 Mobile 畫面是否自動更新（< 3 秒）

**預期結果**:
```
✅ Mobile console 顯示：
[useFoodDiary] Realtime event received: INSERT
[useFoodDiary] Invalidating queries for user: <user-id>

✅ Mobile 畫面：
新增的食物記錄出現在列表中（無需手動刷新）

✅ 延遲：< 3 秒
```

**實際結果**:
- [ ] Console logs 正確
- [ ] 畫面自動更新
- [ ] 延遲符合預期
- [ ] 資料完整且正確

---

#### Test 1.2: Mobile → Web 同步（新增）
**目的**: 驗證 Mobile 新增食物記錄後，Web 即時顯示

**步驟**:
1. 在 Web 打開 Food Diary 頁面
2. 在 Mobile 新增一筆食物記錄
3. 觀察 Web 是否自動更新（< 3 秒）
4. 檢查 Web console logs（如果有實作 realtime）

**預期結果**:
```
✅ Web 畫面：
新增的食物記錄出現在列表中（可能需要手動刷新，因 Web 端可能尚未實作 realtime）

✅ 延遲：< 3 秒（如果 Web 有 realtime）
```

**實際結果**:
- [ ] 資料出現在 Web
- [ ] 資料完整且正確

**注意**: Web 端可能需要手動刷新，因為目前只實作了 Mobile 端的 realtime subscriptions。

---

#### Test 1.3: Web → Mobile 同步（編輯）
**目的**: 驗證 Web 編輯食物記錄後，Mobile 即時更新

**步驟**:
1. 確認 Mobile 和 Web 都有相同的食物記錄
2. 在 Web 編輯該記錄（修改份量或備註）
3. 觀察 Mobile 是否自動更新

**預期結果**:
```
✅ Mobile console 顯示：
[useFoodDiary] Realtime event received: UPDATE

✅ Mobile 畫面：
記錄內容自動更新
```

**實際結果**:
- [ ] Console logs 正確
- [ ] 畫面自動更新
- [ ] 修改內容正確

---

#### Test 1.4: Mobile → Web 同步（刪除）
**目的**: 驗證 Mobile 刪除食物記錄後，Web 即時更新

**步驟**:
1. 確認 Mobile 和 Web 都有相同的食物記錄
2. 在 Mobile 刪除該記錄
3. 觀察 Web 是否自動更新（或手動刷新後消失）

**預期結果**:
```
✅ Mobile console 顯示：
[useFoodDiary] Realtime event received: DELETE

✅ Web 畫面：
記錄從列表中消失
```

**實際結果**:
- [ ] 記錄從兩端都消失
- [ ] 無錯誤發生

---

### Test Suite 2: Symptom Entries 同步測試

#### Test 2.1: Web → Mobile 同步（新增）
**步驟**:
1. 在 Mobile 打開 Symptom Diary 畫面
2. 在 Web 新增一筆症狀記錄
3. 觀察 Mobile 是否自動更新

**預期結果**:
```
✅ Mobile console 顯示：
[useSymptomDiary] Realtime event received: INSERT

✅ Mobile 畫面：
新症狀記錄出現
```

**實際結果**:
- [ ] Console logs 正確
- [ ] 畫面自動更新
- [ ] 延遲 < 3 秒

---

#### Test 2.2: Mobile → Web 同步（新增）
**步驟**:
1. 在 Web 打開 Symptom Diary 頁面
2. 在 Mobile 新增一筆症狀記錄
3. 檢查 Web 是否顯示新記錄

**預期結果**:
```
✅ Web 畫面：
新症狀記錄出現（可能需手動刷新）
```

**實際結果**:
- [ ] 記錄出現在 Web
- [ ] 資料正確

---

#### Test 2.3: 編輯與刪除測試
**步驟**: 類似 Food Entries 的 Test 1.3 和 1.4

**實際結果**:
- [ ] 編輯同步正常
- [ ] 刪除同步正常

---

### Test Suite 3: 邊界情況測試

#### Test 3.1: 網路中斷與恢復
**步驟**:
1. 開啟 Mobile app 並觀察 subscription status
2. 關閉 WiFi/行動網路
3. 觀察 console logs（應顯示 disconnect）
4. 恢復網路連線
5. 觀察是否自動重新連接

**預期結果**:
```
✅ 斷線時：
[useFoodDiary] Subscription status: disconnected

✅ 恢復時：
[useFoodDiary] Subscription status: connected
自動重新訂閱，接收最新資料
```

**實際結果**:
- [ ] 斷線偵測正確
- [ ] 自動重連成功
- [ ] 資料同步恢復

---

#### Test 3.2: 大量資料同步
**步驟**:
1. 在 Web 快速新增 10 筆食物記錄
2. 觀察 Mobile 是否全部接收

**預期結果**:
```
✅ Mobile 接收到 10 個 realtime events
✅ 所有記錄都正確顯示
✅ 無遺失或重複
```

**實際結果**:
- [ ] 所有記錄都接收
- [ ] 無遺失
- [ ] 無重複
- [ ] 性能正常（無卡頓）

---

#### Test 3.3: 多設備同時編輯
**步驟**:
1. 在 Mobile 和 Web 同時編輯同一筆記錄
2. 觀察最終結果（後寫入者勝出）

**預期結果**:
```
✅ 無錯誤發生
✅ 最後一次更新生效
✅ 兩端資料一致
```

**實際結果**:
- [ ] 無錯誤
- [ ] 資料一致
- [ ] 無衝突問題

---

#### Test 3.4: Token 過期處理
**步驟**:
1. 使用一個帳號登入 Mobile
2. 等待 token 過期（或手動觸發）
3. 觀察 subscription 是否重新建立

**預期結果**:
```
✅ Token refresh 自動觸發
✅ Subscription 自動重新建立
✅ 同步功能恢復正常
```

**實際結果**:
- [ ] Token refresh 成功
- [ ] Subscription 重建成功
- [ ] 同步持續正常

---

### Test Suite 4: 效能測試

#### Test 4.1: 同步延遲測試
**方法**: 測量從 Web 新增記錄到 Mobile 顯示的時間

**測試次數**: 10 次

**記錄**:
| 次數 | 延遲時間 (秒) | 狀態 |
|------|--------------|------|
| 1    |              |      |
| 2    |              |      |
| 3    |              |      |
| 4    |              |      |
| 5    |              |      |
| 6    |              |      |
| 7    |              |      |
| 8    |              |      |
| 9    |              |      |
| 10   |              |      |

**統計**:
- 平均延遲: _____ 秒
- 最小延遲: _____ 秒
- 最大延遲: _____ 秒
- **目標**: 平均 < 3 秒

---

#### Test 4.2: 資源使用測試
**監控項目**:
- [ ] CPU 使用率
- [ ] 內存使用
- [ ] 網路流量
- [ ] 電池消耗

**測試時長**: 30 分鐘

**實際結果**:
- CPU: _____ %
- 記憶體: _____ MB
- 網路流量: _____ KB
- 電池: _____ %/小時

---

## ✅ 測試結果總結

### 測試完成度
- [ ] Food Entries 同步測試（4 個測試）
- [ ] Symptom Entries 同步測試（3 個測試）
- [ ] 邊界情況測試（4 個測試）
- [ ] 效能測試（2 個測試）

**總計**: ___ / 13 個測試通過

### 成功標準
- ✅ 同步成功率 ≥ 98%
- ✅ 同步延遲 < 3 秒
- ✅ 資料一致性 100%
- ✅ 無重大 bugs

### 已知問題
（記錄測試中發現的問題）

1.
2.
3.

---

## 🤖 自動化驗證腳本

### 使用驗證腳本

我們提供了一個自動化驗證腳本來測試 realtime sync 功能：

**腳本位置**: `scripts/test-realtime-sync.js`

**功能**:
- ✅ 自動測試 `food_entries` 表的 INSERT, UPDATE, DELETE 事件
- ✅ 自動測試 `daily_symptom_entries` 表的 INSERT, UPDATE, DELETE 事件
- ✅ 測量同步延遲時間
- ✅ 生成詳細的測試報告
- ✅ 驗證事件是否正確觸發

**使用方法**:

```bash
# 使用環境變數中的用戶 ID（會自動獲取第一個用戶）
node scripts/test-realtime-sync.js

# 或指定用戶 ID
node scripts/test-realtime-sync.js <user_id>
```

**前置條件**:
1. 確保 `.env.local` 檔案包含 Supabase 配置：
   - `NEXT_PUBLIC_SUPABASE_URL` 或 `EXPO_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 或 `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. 確保資料庫中有至少一個用戶（如果未提供用戶 ID）

**測試流程**:
1. 腳本會連接到 Supabase
2. 設置 realtime subscriptions 監聽兩個表
3. 執行 CRUD 操作（創建、更新、刪除）
4. 驗證事件是否在 3 秒內接收
5. 計算統計數據（平均延遲、最小/最大延遲）
6. 生成測試報告

**預期輸出**:
```
🚀 開始 Realtime Sync 驗證測試
============================================================
👤 使用測試用戶 ID: <user-id>

📋 測試 Food Entries Realtime Subscription
==================================================
🔌 Subscription 狀態: SUBSCRIBED
🧪 Test 1.1: INSERT 事件測試
✅ INSERT 成功: <entry-id>
📨 收到事件: insert
✅ 事件接收成功，延遲: 234ms
...
📊 測試報告
============================================================
🍽️  Food Entries 測試結果:
  INSERT:
    通過: 1 / 1 (100.0%)
    平均延遲: 234ms
...
✅ 所有測試通過！Realtime Sync 功能正常運作
```

**測試標準**:
- ✅ 同步成功率 ≥ 98%
- ✅ 同步延遲 < 3 秒
- ✅ 所有事件類型（INSERT, UPDATE, DELETE）都正常運作

**注意事項**:
- 腳本會創建測試資料，測試完成後會自動清理
- 如果測試失敗，檢查 Supabase Dashboard 中的 Realtime 配置
- 確保資料表的 RLS (Row Level Security) 政策允許當前用戶操作

---

## 🔧 Debug 技巧

### 查看 Subscription 狀態
```typescript
// 在 Mobile app console 中查找：
[useFoodDiary] Setting up realtime subscription
[useFoodDiary] Subscription status: connected
```

### 查看 Realtime Events
```typescript
// 每次資料變更都應該看到：
[useFoodDiary] Realtime event received: INSERT
[useFoodDiary] Realtime event received: UPDATE
[useFoodDiary] Realtime event received: DELETE
```

### Supabase Dashboard 監控
1. 前往 Supabase Dashboard
2. 選擇 "Database" → "Realtime"
3. 檢查 active connections
4. 查看 realtime logs

---

## 📝 下一步

### 如果測試通過
- [ ] 更新文檔，標記功能為 ✅ 完成
- [ ] Commit 變更
- [ ] 部署到 production
- [ ] 通知團隊

### 如果測試失敗
- [ ] 記錄失敗的測試案例
- [ ] 分析 console logs
- [ ] 檢查 Supabase realtime 配置
- [ ] 修復 bugs
- [ ] 重新測試

---

**文件版本**: 1.0
**最後更新**: 2025-11-26
**測試負責人**: _____
**測試日期**: _____
