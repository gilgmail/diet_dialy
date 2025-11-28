# Phase A iOS App 實作檢查報告

## 檢查日期
2025-01-XX

## 檢查範圍

根據 Phase A 需求，檢查 iOS app 中以下功能的實作狀況：
- A1: 藥物記錄升級（劑量、頻率、變更日期）
- A2: 睡眠與運動時間記錄
- A3: Reminders & QA（資料充足度顯示、缺漏提醒）

---

## ✅ 已實作功能

### A1: 藥物記錄升級

#### ✅ 基本藥物記錄功能
- **檔案**: `MedicationLogScreen.tsx`
- **功能**: 
  - ✅ 可以記錄用藥（`medication_administrations`）
  - ✅ 支援劑量輸入（`dose`）
  - ✅ 支援依從性狀態（`adherence_status`: taken/skipped/delayed/missed）
  - ✅ 支援症狀觸發用藥（`symptom_triggered`）
  - ✅ 支援備註（`notes`）

#### ✅ 服務層支援
- **檔案**: `HealthLogService.ts`
- **功能**:
  - ✅ `logMedicationAdministration()`: 記錄用藥
  - ✅ `getActiveRegimens()`: 取得活躍療程
  - ✅ `buildMedicationInput()`: 建立藥物輸入資料

#### ⚠️ 缺少功能
- ❌ **藥物變更歷史記錄** (`medication_change_history`)
  - 目前沒有 UI 或 API 來記錄藥物變更（劑量變更、頻率變更、停止等）
  - 需要新增功能來追蹤藥物變更歷史

### A2: 睡眠與運動時間記錄

#### ✅ 睡眠記錄功能
- **檔案**: `SleepLogScreen.tsx`
- **功能**:
  - ✅ 記錄睡眠時間（`sleep_sessions`）
  - ✅ 支援預計睡眠時間（`planned_start_time`, `planned_duration_minutes`）
  - ✅ 支援實際睡眠時間（`start_time`, `end_time`, `duration_minutes`）
  - ✅ 支援睡眠品質評分（`quality_score`）
  - ✅ 區分主要睡眠和小睡（`is_main_sleep`）

#### ✅ 運動記錄功能
- **檔案**: `ActivityLogScreen.tsx`
- **功能**:
  - ✅ 記錄運動時間（`activity_sessions`）
  - ✅ 支援運動時數（`duration_minutes`）
  - ✅ 支援運動類型（`activity_type`）
  - ✅ 支援卡路里和步數（`calories`, `steps`）

#### ✅ 自動同步機制
- **資料庫層**: 已建立觸發器自動同步到 `daily_symptom_entries`
  - `trigger_sync_sleep_to_symptom`: 同步睡眠資料
  - `trigger_sync_activity_to_symptom`: 同步運動資料
- **欄位**: 
  - ✅ `sleep_duration_minutes`
  - ✅ `exercise_duration_minutes`
  - ✅ `exercise_intensity`

### A3: Reminders & QA

#### ❌ 缺少功能
- ❌ **資料充足度顯示**
  - 沒有 UI 顯示資料覆蓋率（症狀、飲食、藥物、睡眠、運動）
  - 沒有顯示整體資料狀態（sufficient/partial/insufficient）
  
- ❌ **缺漏提醒功能**
  - 沒有呼叫 `get_user_missing_data_alerts()` 函數
  - 沒有顯示缺漏項目提醒
  - 沒有補資料提醒通知

---

## 📋 需要新增的功能

### 1. 藥物變更歷史記錄（A1 補完）

**需求**: 允許使用者記錄藥物變更（劑量變更、頻率變更、停止等）

**實作建議**:
- 新增 `MedicationChangeScreen.tsx` 或擴充現有藥物管理頁面
- 新增 API 端點來記錄變更到 `medication_change_history` 表
- 在藥物管理頁面顯示變更歷史

**檔案位置**:
```
mobile/react-native-starter-kit/DietDailyMobile/src/features/health-logs/
  - screens/MedicationChangeScreen.tsx (新增)
  - services/HealthLogService.ts (擴充)
```

### 2. 資料充足度顯示（A3）

**需求**: 在 Dashboard 或 Today 頁面顯示資料覆蓋率

**實作建議**:
- 新增 `DataCoverageCard` 組件
- 呼叫 `data_coverage_dashboard` 視圖或建立對應的 API
- 顯示各類資料的覆蓋率百分比
- 顯示整體資料狀態和缺漏項目

**檔案位置**:
```
mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/
  - components/DataCoverageCard.tsx (新增)
  - services/DashboardService.ts (擴充)
```

### 3. 缺漏提醒功能（A3）

**需求**: 顯示缺漏資料提醒，鼓勵使用者補資料

**實作建議**:
- 新增 `MissingDataAlertCard` 組件
- 呼叫 `get_user_missing_data_alerts()` RPC 函數
- 在 Dashboard 或 Today 頁面顯示提醒
- 提供快速連結到對應的記錄頁面

**檔案位置**:
```
mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/
  - components/MissingDataAlertCard.tsx (新增)
  - services/DashboardService.ts (擴充)
```

---

## 🔍 詳細檢查結果

### 資料庫整合

| 功能 | 資料表/視圖 | iOS App 支援 | 狀態 |
|------|------------|-------------|------|
| 藥物記錄 | `medication_administrations` | ✅ 完整 | 已實作 |
| 藥物變更歷史 | `medication_change_history` | ❌ 缺少 | 需新增 |
| 睡眠記錄 | `sleep_sessions` | ✅ 完整 | 已實作 |
| 運動記錄 | `activity_sessions` | ✅ 完整 | 已實作 |
| 資料同步 | 觸發器自動同步 | ✅ 自動 | 已實作 |
| 資料覆蓋率 | `data_coverage_dashboard` | ❌ 缺少 | 需新增 |
| 缺漏提醒 | `get_user_missing_data_alerts()` | ❌ 缺少 | 需新增 |

### UI/UX 整合

| 頁面 | Phase A 功能 | 狀態 |
|------|-------------|------|
| `MedicationLogScreen` | 基本記錄 | ✅ 完整 |
| `MedicationLogScreen` | 變更歷史 | ❌ 缺少 |
| `SleepLogScreen` | 睡眠記錄 | ✅ 完整 |
| `ActivityLogScreen` | 運動記錄 | ✅ 完整 |
| `TodayScreen` / `DashboardScreen` | 資料覆蓋率顯示 | ❌ 缺少 |
| `TodayScreen` / `DashboardScreen` | 缺漏提醒 | ❌ 缺少 |

---

## 🎯 優先順序建議

### 高優先級（核心功能）
1. **資料充足度顯示** - 讓使用者了解自己的資料完整性
2. **缺漏提醒功能** - 鼓勵使用者補資料，提高覆蓋率

### 中優先級（功能補完）
3. **藥物變更歷史記錄** - 完整追蹤藥物變更，支援 Phase B 報告

---

## 📝 實作檢查清單

### A1: 藥物記錄升級
- [x] 基本藥物記錄（`medication_administrations`）
- [x] 劑量輸入
- [x] 依從性狀態
- [ ] 藥物變更歷史記錄（`medication_change_history`）
- [ ] 變更歷史 UI

### A2: 睡眠與運動時間記錄
- [x] 睡眠記錄（`sleep_sessions`）
- [x] 運動記錄（`activity_sessions`）
- [x] 自動同步到 `daily_symptom_entries`
- [x] 睡眠時數欄位
- [x] 運動時數欄位
- [x] 運動強度欄位

### A3: Reminders & QA
- [ ] 資料覆蓋率顯示
- [ ] 缺漏提醒功能
- [ ] 補資料快速連結
- [ ] 資料充足度狀態顯示

---

## 🔗 相關檔案

### 已實作
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/health-logs/screens/MedicationLogScreen.tsx`
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/health-logs/screens/SleepLogScreen.tsx`
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/health-logs/screens/ActivityLogScreen.tsx`
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/health-logs/services/HealthLogService.ts`

### 需要新增
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/health-logs/screens/MedicationChangeScreen.tsx`
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/components/DataCoverageCard.tsx`
- `mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/components/MissingDataAlertCard.tsx`
- API 端點：`/api/mobile/data-coverage` 和 `/api/mobile/data-coverage/alerts`

---

## 總結

**完成度**: 約 70%

**已實作**:
- ✅ A1 基本藥物記錄
- ✅ A2 睡眠與運動記錄（完整）
- ✅ 資料自動同步機制

**缺少功能**:
- ❌ A1 藥物變更歷史記錄
- ❌ A3 資料充足度顯示
- ❌ A3 缺漏提醒功能

**建議**: 優先實作 A3 功能（資料充足度顯示和缺漏提醒），這對提高使用者資料完整性最有效。

