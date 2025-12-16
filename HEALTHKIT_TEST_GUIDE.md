# HealthKit 設定修復與測試指南

## 📋 概述

本指南說明如何修復 HealthKit 設定問題並進行完整測試。

## 🔍 問題診斷

### 當前狀態檢查

運行以下命令檢查約束狀態：

```bash
node scripts/check-healthkit-constraint.js
```

**預期結果（修復前）**：
- ❌ 約束不匹配錯誤
- 錯誤碼: `42P10`
- 訊息: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

## 🔧 修復步驟

### 步驟 1: 執行 Migration

按照 [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) 中的說明執行 migration。

**快速執行**：
1. 前往 [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/sql)
2. 執行 `supabase/migrations/20251216_fix_health_metrics_unique_constraint.sql` 中的 SQL

### 步驟 2: 驗證約束

執行驗證腳本：

```bash
node scripts/check-healthkit-constraint.js
```

**預期結果（修復後）**：
- ✅ Constraint check passed!
- ✅ Upsert test successful!

## 🧪 測試步驟

### 測試 1: API 同步測試

**前置條件**：
1. 確保 API 服務器正在運行：
   ```bash
   npm run dev
   ```

2. 在另一個終端執行測試：
   ```bash
   node scripts/test-healthkit-sync.js
   ```

**預期結果**：
- ✅ API sync successful!
- ✅ Found metrics in database
- ✅ Upsert test passed

### 測試 2: 資料庫 Upsert 測試

測試腳本會自動執行以下測試：
1. 插入初始記錄
2. 使用相同 `user_id, source, source_identifier, start_time` 插入（應該更新而非重複插入）
3. 驗證值已更新

### 測試 3: Mobile App 整合測試

在 iOS 裝置上測試：

1. **啟動 App**：
   ```bash
   cd mobile/react-native-starter-kit/DietDailyMobile
   npm start
   ```

2. **測試 HealthKit 同步**：
   - 開啟 App
   - 前往設定頁面
   - 點擊 "同步 HealthKit 數據"
   - 確認同步成功

3. **驗證數據**：
   ```bash
   # 檢查資料庫中的記錄
   node scripts/check-healthkit-constraint.js
   ```

## 📊 測試結果檢查清單

### 資料庫層
- [ ] `health_metrics` 表有正確的 UNIQUE 約束 `health_metrics_user_source_unique`
- [ ] 約束包含 `user_id, source, source_identifier, start_time`
- [ ] 索引 `idx_health_metrics_upsert` 已建立

### API 層
- [ ] `POST /api/healthkit/sync` 返回 `success: true`
- [ ] Upsert 操作正確處理重複數據（更新而非插入）
- [ ] 錯誤處理正常（測試無效輸入）

### Mobile App 層
- [ ] HealthKit 授權成功
- [ ] 數據成功同步到 Supabase
- [ ] 重複同步不會產生重複記錄

## 🐛 常見問題

### 問題 1: Migration 執行失敗

**錯誤**: `permission denied` 或 `relation does not exist`

**解決方案**:
- 確認使用 Supabase Dashboard SQL Editor（有完整權限）
- 確認 `health_metrics` 表存在
- 檢查 migration SQL 語法

### 問題 2: API 測試失敗

**錯誤**: `fetch failed` 或 `ECONNREFUSED`

**解決方案**:
- 確認 API 服務器正在運行: `npm run dev`
- 檢查 `NEXT_PUBLIC_API_URL` 環境變數
- 確認端口 3000 未被占用

### 問題 3: Upsert 不工作

**錯誤**: 仍然插入重複記錄

**解決方案**:
- 確認 migration 已執行
- 驗證約束存在: `node scripts/check-healthkit-constraint.js`
- 檢查 API 的 `onConflict` 參數是否正確

## 📝 相關文件

- Migration 說明: [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md)
- Migration 文件: [supabase/migrations/20251216_fix_health_metrics_unique_constraint.sql](./supabase/migrations/20251216_fix_health_metrics_unique_constraint.sql)
- API 路由: [src/app/api/healthkit/sync/route.ts](./src/app/api/healthkit/sync/route.ts)
- HealthKit 服務: [mobile/react-native-starter-kit/DietDailyMobile/src/services/HealthKitService.ts](./mobile/react-native-starter-kit/DietDailyMobile/src/services/HealthKitService.ts)

## ✅ 完成標準

所有測試通過後，應該看到：

1. ✅ 約束檢查通過
2. ✅ API 同步測試通過
3. ✅ Upsert 測試通過
4. ✅ Mobile App 可以成功同步數據

完成後，HealthKit 整合應該可以正常運作！

