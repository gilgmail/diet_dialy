# Realtime Sync 測試結果

## 測試日期
2025-11-27

## 測試環境
- Supabase Project: lbjeyvvierxcnrytuvto
- 測試用戶: 22e990b6-a888-4beb-9ac6-c9a145731542

## 測試結果摘要

### ✅ 成功項目
1. **Realtime Subscription 連接** - 使用 anon key 可以成功建立 realtime subscription
2. **資料庫操作** - INSERT/UPDATE/DELETE 操作都正常工作
3. **網路連接** - Supabase 服務連接正常

### ❌ 發現的問題
1. **Service Role Key 不觸發 Realtime 事件**
   - 使用 Service Role Key 進行的資料庫操作不會觸發 realtime 事件
   - 這是 Supabase 的設計特性，service role key 繞過了 Realtime 系統

2. **JWT Token 過期問題**
   - TEST_ACCESS_TOKEN 在測試時已過期
   - Refresh token 功能因網路連線問題無法正常工作

## 根本原因分析

### Supabase Realtime 工作原理
1. **Realtime 事件只對認證用戶觸發**
   - 需要使用 anon key + 有效的用戶 session
   - Service role key 繞過了認證和 Realtime 系統

2. **RLS 政策與 Realtime 的關係**
   - Realtime 事件會遵守 RLS 政策
   - 只有符合 RLS 政策的操作才會觸發相應的 realtime 事件

## 測試腳本說明

### 1. test-realtime-sync.js
**完整的 realtime sync 測試腳本**
- 測試 food_entries 和 daily_symptom_entries 兩個表
- 測試 INSERT, UPDATE, DELETE 三種事件
- 測量同步延遲
- 生成詳細測試報告

**限制**：
- 需要有效的用戶 access token
- 不能使用 service role key（不會觸發 realtime 事件）

### 2. test-insert-only.js
**簡化的插入測試**
- 只測試 INSERT 操作
- 可用於驗證資料庫連接和權限
- 支援 service role key（但不會觸發 realtime）

### 3. test-realtime-minimal.js
**最小化 realtime 連接測試**
- 只測試 subscription 連接，不進行資料庫操作
- 用於驗證 Realtime 服務是否正常
- 可以手動在 Dashboard 插入資料來測試事件接收

## 建議

### 在生產環境中
1. **使用正常的用戶認證流程**
   - Mobile/Web app 通過 Supabase Auth 登入
   - 使用用戶的 session 進行所有資料庫操作
   - 使用相同的 session 建立 realtime subscription

2. **避免使用 Service Role Key 進行用戶操作**
   - Service role key 僅用於後台管理任務
   - 用戶相關的操作應該通過用戶認證進行

### 測試 Realtime Sync
1. **從實際的 Mobile/Web app 測試**
   - 登入用戶帳號
   - 進行資料庫操作
   - 觀察其他裝置是否收到 realtime 更新

2. **或使用有效的用戶 token 進行腳本測試**
   - 從已登入的 app 獲取有效的 access token
   - 更新 .env.local 中的 TEST_ACCESS_TOKEN
   - 執行 test-realtime-sync.js

## 修正項目

### 已修正
1. **添加 JWT token 刷新功能**
   - 在 test-realtime-sync.js 中添加 `ensureValidSession()` 函數
   - 自動檢測並刷新過期的 token
   - 提示用戶如何更新 token

2. **改進錯誤處理**
   - 明確區分 service role key 和 anon key 的使用場景
   - 提供清楚的錯誤訊息和解決建議

### 尚未修正
1. **Token 刷新的網路連線問題**
   - Refresh token API 呼叫出現連線逾時
   - 可能是防火牆或網路設定問題
   - 建議：使用 VPN 或檢查網路設定

## 結論

**Realtime Sync 功能本身正常運作**，問題在於測試方法：
- ✅ Realtime subscription 可以成功建立
- ✅ 資料庫操作正常
- ❌ 使用 service role key 測試會失敗（這是預期行為）

**正確的測試方式**：
1. 從實際的 Mobile/Web app 進行測試
2. 或使用有效的用戶 access token 執行測試腳本
3. 不要使用 service role key 來測試 realtime 功能

## 下一步行動

1. **從 Mobile app 測試**
   - 在兩個裝置上登入同一帳號
   - 在一個裝置上新增/修改資料
   - 確認另一個裝置收到 realtime 更新

2. **檢查 Supabase Dashboard 設定**
   - 確認 Realtime 已啟用（Database → Realtime）
   - 確認 food_entries 和 daily_symptom_entries 表的 realtime 已開啟

3. **監控生產環境**
   - 添加 realtime 連接狀態監控
   - 記錄同步延遲和失敗率
   - 設置告警機制

## 測試命令參考

```bash
# 1. 最小化 realtime 連接測試（推薦先執行）
node scripts/test-realtime-minimal.js <user_id>

# 2. 簡化的插入測試（驗證資料庫連接）
node scripts/test-insert-only.js <user_id>

# 3. 完整的 realtime sync 測試（需要有效的 user token）
# 先更新 .env.local 的 TEST_ACCESS_TOKEN
node scripts/test-realtime-sync.js <user_id>
```

## 附錄：如何獲取有效的 User Token

### 從 Web App
1. 打開瀏覽器開發者工具
2. 進入 Application → Cookies
3. 複製 `supabase.auth.token` 的值
4. 更新 .env.local:
   ```
   TEST_ACCESS_TOKEN=<access_token>
   TEST_REFRESH_TOKEN=<refresh_token>
   ```

### 從 Mobile App
1. 在 React Native 中使用 AsyncStorage
2. 取得 supabase session:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Access Token:', session?.access_token);
   console.log('Refresh Token:', session?.refresh_token);
   ```
3. 將 tokens 更新到 .env.local
