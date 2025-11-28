# Phase A iOS App 實作驗證指南

## 實作完成日期
2025-01-XX

## 已實作功能

### ✅ API 端點
1. **GET /api/mobile/data-coverage**
   - 取得使用者的資料覆蓋率資訊
   - 回傳 `DataCoverageInfo` 物件

2. **GET /api/mobile/data-coverage/alerts**
   - 取得使用者的缺漏資料提醒
   - 回傳 `MissingDataAlert[]` 陣列

### ✅ React Native 組件
1. **DataCoverageCard**
   - 顯示各類資料的覆蓋率百分比
   - 顯示整體資料狀態（充足/部分/不足）
   - 顯示缺漏項目標籤

2. **MissingDataAlertCard**
   - 顯示缺漏項目提醒
   - 提供快速連結到對應記錄頁面
   - 顯示補資料建議

### ✅ Hooks
1. **useDataCoverage()**
   - 取得資料覆蓋率資訊
   - 自動快取和重新整理

2. **useMissingDataAlerts(daysThreshold)**
   - 取得缺漏提醒
   - 支援自訂缺漏天數閾值

### ✅ 整合
- 已整合到 `TodayScreen` 的摘要頁面
- 支援下拉重新整理
- 自動載入和顯示

## 驗證步驟

### 1. 資料庫驗證
在 Supabase Studio SQL Editor 中執行：
```sql
supabase/migrations/verify_phase_a_ios_integration.sql
```

預期結果：
- ✅ `data_coverage_dashboard` 視圖存在
- ✅ `get_user_missing_data_alerts()` 函數存在
- ✅ 同步觸發器存在（3 個）
- ✅ 新增欄位存在（sleep_duration_minutes, exercise_duration_minutes, exercise_intensity）

### 2. API 端點測試

#### 測試資料覆蓋率 API
```bash
# 需要先取得 auth token
curl -X GET "https://your-api.com/api/mobile/data-coverage?userId=YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

預期回應：
```json
{
  "success": true,
  "coverage": {
    "user_id": "...",
    "email": "...",
    "symptom_coverage_percent": 26.7,
    "food_coverage_percent": 60.0,
    "overall_data_status": "partial",
    "missing_categories": ["symptoms", "medications"]
  }
}
```

#### 測試缺漏提醒 API
```bash
curl -X GET "https://your-api.com/api/mobile/data-coverage/alerts?userId=YOUR_USER_ID&daysThreshold=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

預期回應：
```json
{
  "success": true,
  "alerts": [
    {
      "category": "symptoms",
      "missing_days": 5,
      "recommendation": "請記得記錄每日症狀，有助於追蹤健康狀況"
    }
  ]
}
```

### 3. iOS App 驗證

#### 步驟 1: 啟動 App
1. 開啟 iOS app
2. 登入帳號（建議使用 kogil0231@gmail.com）

#### 步驟 2: 檢查 Today 頁面
1. 進入「今日記錄」頁面
2. 切換到「摘要」標籤
3. 應該能看到：
   - **缺漏資料提醒卡片**（如果有缺漏）
   - **資料充足度卡片**（顯示覆蓋率）

#### 步驟 3: 驗證功能
- [ ] 資料覆蓋率卡片顯示正確的百分比
- [ ] 整體狀態標籤正確（充足/部分/不足）
- [ ] 缺漏項目標籤正確顯示
- [ ] 缺漏提醒卡片可以點擊導航到對應頁面
- [ ] 下拉重新整理會更新資料

### 4. 功能測試場景

#### 場景 1: 資料充足的使用者
- 覆蓋率 ≥ 60%
- 狀態顯示「充足」
- 沒有缺漏提醒

#### 場景 2: 資料部分的使用者
- 覆蓋率 40-60%
- 狀態顯示「部分」
- 顯示缺漏項目標籤
- 顯示缺漏提醒（如果有）

#### 場景 3: 資料不足的使用者
- 覆蓋率 < 40%
- 狀態顯示「不足」
- 顯示多個缺漏項目
- 顯示缺漏提醒

## 已知問題與限制

### 目前限制
1. **藥物變更歷史**：尚未實作 UI，僅有資料庫支援
2. **資料更新頻率**：資料覆蓋率每 5 分鐘更新一次（可調整）

### 待改進項目
1. 加入資料覆蓋率趨勢圖表
2. 加入補資料快速操作按鈕
3. 加入資料充足度目標設定

## 相關檔案

### API 端點
- `src/app/api/mobile/data-coverage/route.ts`
- `src/app/api/mobile/data-coverage/alerts/route.ts`

### React Native 組件
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/components/DataCoverageCard.tsx`
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/components/MissingDataAlertCard.tsx`

### Hooks
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/hooks/useDataCoverage.ts`

### 服務層
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/services/DashboardService.ts`

### 整合
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/today/screens/TodayScreen.tsx`

### 測試
- `mobile/react-native-starter-kit/DietDailyMobile/src/__tests__/features/dashboard/data-coverage.test.ts`
- `supabase/migrations/verify_phase_a_ios_integration.sql`

## 下一步

1. **測試驗證**：執行驗證腳本確認功能正常
2. **使用者測試**：在實際裝置上測試 UI/UX
3. **效能優化**：監控 API 回應時間和快取效果
4. **功能擴充**：實作藥物變更歷史 UI（A1 補完）

