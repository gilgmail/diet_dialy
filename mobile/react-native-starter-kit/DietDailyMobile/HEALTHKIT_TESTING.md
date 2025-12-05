# HealthKit Integration - Testing Guide

## 📋 測試前準備

### 1. 資料庫 Migration
在 Supabase Dashboard 執行 migration：

```bash
# 檔案位置
supabase/migrations/20241204_healthkit_integration.sql
```

執行後應該看到：
```
✅ health_metrics table created successfully
✅ daily_symptom_entries extended with health columns
✅ HealthKit integration migration completed successfully!
```

### 2. Xcode 設定（必須手動完成）

按照 [HEALTHKIT_SETUP.md](./HEALTHKIT_SETUP.md) 的指示：

1. 開啟 `ios/DietDailyMobile.xcworkspace`
2. 選擇 DietDailyMobile target
3. 在 "Signing & Capabilities" 中添加 "HealthKit"
4. 確認 `DietDailyMobile.entitlements` 文件出現

### 3. 真實裝置需求

⚠️ **重要**: HealthKit 只能在真實 iOS 裝置上測試，模擬器不支援。

需要：
- 實體 iPhone 或 iPad
- iOS 12.0 或更高版本
- 已登入 iCloud（HealthKit 需要）
- Apple Health app 已設定

## 🧪 端到端測試流程

### Phase 1: 基礎設定測試

#### 1.1 安裝與執行
```bash
# 確認 pod 已安裝
cd ios && pod install && cd ..

# 在真實裝置上執行
npx expo run:ios --device
```

#### 1.2 導航到 HealthKit 設定
1. 開啟 app
2. 進入 "設定" 頁面
3. 應該看到 "HealthKit 整合" 選項
4. 點擊進入 HealthKit 設定畫面

**預期結果**:
- ✅ 畫面顯示 "HealthKit 整合" header
- ✅ 授權狀態顯示 "未授權"
- ✅ 顯示 "授權 HealthKit 權限" 按鈕

### Phase 2: 授權測試

#### 2.1 請求授權
1. 點擊 "授權 HealthKit 權限" 按鈕
2. 系統彈出 HealthKit 權限請求對話框
3. 勾選所有數據類型（睡眠、步數、心率、活動消耗）
4. 點擊 "允許"

**預期結果**:
- ✅ 看到系統權限對話框
- ✅ 對話框包含自訂說明文字（from Info.plist）
- ✅ 授權成功後顯示 "✅ 授權成功" alert
- ✅ 授權狀態變更為 "已授權"

#### 2.2 驗證授權狀態
1. 關閉 app
2. 重新開啟 app
3. 進入 HealthKit 設定畫面

**預期結果**:
- ✅ 授權狀態仍然顯示 "已授權"（持久化成功）

### Phase 3: 數據同步測試

#### 3.1 準備測試數據
在 iOS "健康" app 中手動添加測試數據：
- 睡眠: 昨晚 11:00 PM - 今早 7:00 AM (8小時)
- 步數: 今天 5000 步
- 心率: 今天多個心率記錄（靜息 60-70 bpm）

#### 3.2 執行同步
1. 在 HealthKit 設定畫面點擊 "立即同步"
2. 等待同步完成

**預期結果**:
- ✅ 按鈕顯示 "同步中..." 且禁用
- ✅ 同步完成後顯示 "✅ 同步成功" alert
- ✅ 顯示同步數量統計（睡眠 X 筆、步數 X 筆、心率 X 筆）
- ✅ "最後同步" 時間更新為 "剛剛"
- ✅ 顯示同步結果詳情

#### 3.3 驗證數據庫資料
在 Supabase Dashboard 查詢：

```sql
-- 檢查 health_metrics 表格
SELECT
  metric_type,
  COUNT(*) as count,
  MAX(synced_at) as last_sync
FROM health_metrics
WHERE user_id = '<your-user-id>'
GROUP BY metric_type;

-- 檢查 daily_symptom_entries 是否自動更新
SELECT
  recorded_date,
  avg_heart_rate,
  daily_steps,
  active_calories
FROM daily_symptom_entries
WHERE user_id = '<your-user-id>'
AND recorded_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY recorded_date DESC;
```

**預期結果**:
- ✅ health_metrics 有新記錄
- ✅ 各 metric_type 的數量正確
- ✅ sync_status 為 'synced'
- ✅ daily_symptom_entries 自動更新（透過 trigger）

### Phase 4: API 測試

#### 4.1 測試同步 API
```bash
# 使用 curl 測試同步狀態 API
curl -X GET "http://localhost:3000/api/healthkit/sync?userId=<your-user-id>&days=7"
```

**預期回應**:
```json
{
  "success": true,
  "message": "成功獲取 7 天內的同步狀態",
  "data": {
    "total_records": 150,
    "synced_count": 150,
    "pending_count": 0,
    "error_count": 0,
    "last_sync": "2024-12-04T10:30:00Z",
    "metrics_by_type": {
      "sleep_analysis": 7,
      "steps": 7,
      "heart_rate": 120,
      "active_energy": 16
    }
  }
}
```

#### 4.2 測試摘要 API
```bash
# 使用 curl 測試摘要 API
curl -X GET "http://localhost:3000/api/healthkit/summary?userId=<your-user-id>"
```

**預期回應**:
```json
{
  "success": true,
  "message": "成功獲取健康數據摘要",
  "data": {
    "summary": {
      "heart_rate": {
        "avg_value": 68.5,
        "min_value": 58,
        "max_value": 95,
        "total_records": 120,
        "last_updated": "2024-12-04T10:30:00Z"
      },
      "steps": {
        "avg_value": 6500,
        "min_value": 2000,
        "max_value": 12000,
        "total_records": 7,
        "last_updated": "2024-12-04T10:30:00Z"
      }
    },
    "total_metric_types": 4
  }
}
```

### Phase 5: 自動同步測試

#### 5.1 啟用自動同步
1. 在 HealthKit 設定畫面開啟 "自動同步" 開關
2. 確認顯示 "自動同步已啟用" alert

**Note**: 實際的背景同步需要實作 background tasks，目前只是 UI 狀態。

### Phase 6: 錯誤處理測試

#### 6.1 網路錯誤
1. 關閉網路連線
2. 點擊 "立即同步"

**預期結果**:
- ✅ 顯示友善的錯誤訊息
- ✅ 不會 crash

#### 6.2 未授權狀態
1. 清除 AsyncStorage 授權狀態
2. 嘗試同步

**預期結果**:
- ✅ 顯示 "需要授權" alert
- ✅ 引導使用者授權

#### 6.3 無數據情況
1. 在 Health app 中刪除所有測試數據
2. 執行同步

**預期結果**:
- ✅ 同步成功但數量為 0
- ✅ 不會報錯

## 📊 完整測試檢查清單

### 前置條件
- [ ] Database migration 成功執行
- [ ] Xcode HealthKit capability 已啟用
- [ ] 在真實 iOS 裝置上測試
- [ ] Health app 已設定並有測試數據

### 功能測試
- [ ] HealthKit 可用性檢測正確
- [ ] 授權流程成功
- [ ] 授權狀態持久化
- [ ] 睡眠數據同步成功
- [ ] 步數數據同步成功
- [ ] 心率數據同步成功
- [ ] 活動消耗同步成功
- [ ] 最後同步時間正確顯示
- [ ] 同步結果統計正確

### 資料庫驗證
- [ ] health_metrics 表格有正確數據
- [ ] recorded_date 自動設定（透過 trigger）
- [ ] daily_symptom_entries 自動更新（透過 trigger）
- [ ] RLS 政策正常運作
- [ ] 重複數據正確處理（UNIQUE constraint）

### API 測試
- [ ] POST /api/healthkit/sync 正常運作
- [ ] GET /api/healthkit/sync 回傳正確狀態
- [ ] GET /api/healthkit/summary 正確彙總數據
- [ ] 錯誤處理正確（400, 500 狀態碼）

### UI/UX 測試
- [ ] 畫面載入正常
- [ ] 按鈕狀態正確（enabled/disabled）
- [ ] Loading 狀態顯示
- [ ] Alert 訊息清楚易懂
- [ ] Icon 顯示正確
- [ ] 中文文案正確

### 錯誤處理
- [ ] 網路錯誤處理
- [ ] 授權拒絕處理
- [ ] 無數據情況處理
- [ ] 資料庫錯誤處理
- [ ] 不會因錯誤 crash

## 🐛 常見問題排解

### 問題 1: "HealthKit is not available"
**原因**: 在模擬器上運行
**解決**: 必須使用真實 iOS 裝置

### 問題 2: 授權對話框不出現
**原因**: HealthKit capability 未在 Xcode 中啟用
**解決**: 按照 HEALTHKIT_SETUP.md 設定 Xcode

### 問題 3: 同步後數據庫沒有資料
**原因**: RLS 政策或 service role key 問題
**解決**:
1. 檢查 SUPABASE_SERVICE_ROLE_KEY 環境變數
2. 驗證 RLS 政策設定

### 問題 4: daily_symptom_entries 沒有自動更新
**原因**: Trigger 未正確執行
**解決**:
1. 檢查 migration 是否成功執行
2. 驗證 trigger function 存在
3. 確認 sync_status 為 'synced'

## 📝 測試報告範本

```markdown
## HealthKit Integration Test Report

**測試日期**: 2024-12-04
**測試裝置**: iPhone 15 Pro, iOS 17.2
**測試者**: [Your Name]

### 測試結果摘要
- ✅ 通過: X 項
- ❌ 失敗: Y 項
- ⏭️ 跳過: Z 項

### 詳細測試結果
1. [測試項目]: ✅/❌
   - 預期: [...]
   - 實際: [...]
   - 備註: [...]

### 發現的問題
1. [問題描述]
   - 嚴重程度: 高/中/低
   - 重現步驟: [...]
   - 截圖: [...]

### 建議
[改進建議...]
```

## 🚀 正式上線前檢查

- [ ] 所有測試通過
- [ ] 在多台裝置測試（不同 iOS 版本）
- [ ] 壓力測試（大量數據同步）
- [ ] 安全性審查（API keys, RLS policies）
- [ ] 使用者文檔更新
- [ ] App Store 描述更新（提及 HealthKit 功能）
- [ ] 隱私政策更新（說明健康數據使用）
