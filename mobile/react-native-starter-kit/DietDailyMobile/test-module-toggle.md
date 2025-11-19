# 模組開關功能測試指南

## ✅ 已修復的問題

### 1. TodayScreen 缺少 import
**問題**: 使用了 `useSettingsStore` 和 `DEFAULT_SETTINGS` 但沒有導入
**修復**:
```typescript
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
```

### 2. SettingsService modules 更新邏輯
**問題**: `hasPreferenceUpdates` 檢查缺少 `modules` 欄位
**修復**:
```typescript
const hasPreferenceUpdates =
  mobilePreferenceUpdates.notificationsEnabled !== undefined ||
  mobilePreferenceUpdates.mealReminders !== undefined ||
  mobilePreferenceUpdates.timezoneOffset !== undefined ||
  mobilePreferenceUpdates.modules !== undefined  // ✅ 新增
```

## 🧪 測試步驟

### Phase 1: 基礎功能驗證

#### 測試 1: 檢查預設狀態
```typescript
// 預期結果：所有模組預設為 true
settings.modules = {
  medication: true,
  sleep: true,
  activity: true
}
```

**驗證方法**:
1. 開啟 App
2. 進入「設定」→「模組設定」tab
3. 確認所有模組開關都是「開啟」狀態
4. 進入「今日記錄」
5. 確認可以看到：
   - ✅ 用藥紀錄區塊
   - ✅ 用藥療程區塊
   - ✅ 睡眠紀錄區塊
   - ✅ 運動紀錄區塊

---

#### 測試 2: 關閉用藥模組
**操作**:
1. 進入「設定」→「模組設定」
2. 關閉「用藥紀錄」開關
3. 返回「今日記錄」

**預期結果**:
- ❌ 用藥紀錄區塊消失
- ❌ 用藥療程區塊消失
- ✅ 睡眠紀錄區塊仍可見
- ✅ 運動紀錄區塊仍可見

**驗證代碼邏輯**:
```typescript
// TodayScreen.tsx 第 53-55 行
const showMedication = moduleVisibility.medication !== false
// 當 settings.modules.medication = false 時，showMedication = false

// 第 688-795 行
{showMedication && (
  // 用藥相關 UI 被隱藏
)}
```

---

#### 測試 3: 關閉睡眠模組
**操作**:
1. 開啟「用藥紀錄」（如果之前關閉）
2. 關閉「睡眠紀錄」開關
3. 返回「今日記錄」

**預期結果**:
- ✅ 用藥紀錄區塊可見
- ❌ 睡眠紀錄區塊消失
- ✅ 運動紀錄區塊仍可見

---

#### 測試 4: 關閉運動模組
**操作**:
1. 關閉「運動紀錄」開關
2. 返回「今日記錄」

**預期結果**:
- ✅ 用藥紀錄區塊可見
- ❌ 睡眠紀錄區塊消失（之前已關閉）
- ❌ 運動紀錄區塊消失

---

#### 測試 5: 全部關閉
**操作**:
1. 關閉所有三個模組
2. 返回「今日記錄」

**預期結果**:
- ❌ 所有健康模組區塊消失
- ✅ 僅顯示飲食和症狀記錄（這些是核心功能，不受開關控制）

---

### Phase 2: 資料持久性測試

#### 測試 6: 設定儲存與同步
**操作**:
1. 關閉「睡眠紀錄」
2. 完全關閉 App（從背景關閉）
3. 重新開啟 App
4. 檢查設定

**預期結果**:
- ✅ 睡眠紀錄開關仍為「關閉」狀態
- ✅ 今日記錄中睡眠區塊仍隱藏
- ✅ 資料已儲存到 Supabase

**資料庫驗證**:
```sql
-- 檢查 diet_daily_users 表格
SELECT
  id,
  preferences->'mobileSettings'->'modules' as modules
FROM diet_daily_users
WHERE id = '<your_user_id>';

-- 預期結果
{
  "medication": true,
  "sleep": false,      -- ✅ 已儲存
  "activity": true
}
```

---

#### 測試 7: 即時同步（如果支援多裝置）
**操作**:
1. 裝置 A：關閉「運動紀錄」
2. 裝置 B：等待 10 秒後檢查設定

**預期結果**:
- ✅ 裝置 B 的設定自動更新
- ✅ 運動紀錄模組自動隱藏

---

### Phase 3: 邊界條件測試

#### 測試 8: 快速切換
**操作**:
1. 快速開關任一模組 5 次
2. 檢查最終狀態

**預期結果**:
- ✅ 最後的狀態正確反映在 UI
- ✅ 無 UI 閃爍或錯誤
- ✅ 資料庫狀態與 UI 一致

---

#### 測試 9: 資料保留驗證
**操作**:
1. 記錄一筆睡眠資料
2. 關閉「睡眠紀錄」模組
3. 確認睡眠區塊消失
4. 重新開啟「睡眠紀錄」模組

**預期結果**:
- ✅ 之前記錄的睡眠資料仍然存在
- ✅ 提示文字正確顯示：「關閉模組後，對應的快速新增與今日摘要會隱藏，但既有資料仍保留於帳號中。」

---

## 🔧 偵錯工具

### Console 檢查
在 TodayScreen，已加入全域變數供偵錯：
```javascript
// 開啟 React Native Debugger
console.log('Module Visibility:', globalThis.showMedication, globalThis.showSleep, globalThis.showActivity)
console.log('Settings:', globalThis.settings)
```

### 資料庫檢查
```sql
-- 檢查完整設定
SELECT
  id,
  name,
  preferences
FROM diet_daily_users
WHERE id = '<user_id>';

-- 檢查模組設定
SELECT
  preferences->'mobileSettings'->'modules' as modules,
  updated_at
FROM diet_daily_users
WHERE id = '<user_id>';
```

---

## 📋 驗證清單

- [ ] 所有模組預設開啟
- [ ] 個別關閉每個模組都能正確隱藏對應區塊
- [ ] 設定儲存到資料庫
- [ ] App 重啟後設定保留
- [ ] 快速切換無錯誤
- [ ] 關閉模組不會刪除資料
- [ ] 重新開啟模組能看到歷史資料
- [ ] 設定頁面提示文字清楚

---

## ✅ 預期行為總結

| 模組開關狀態 | 今日記錄顯示 | 資料保留 | 快速新增按鈕 |
|------------|------------|---------|------------|
| medication: true | ✅ 用藥 + 療程 | ✅ | ✅ |
| medication: false | ❌ 隱藏 | ✅ 保留 | ❌ 隱藏 |
| sleep: true | ✅ 睡眠 | ✅ | ✅ |
| sleep: false | ❌ 隱藏 | ✅ 保留 | ❌ 隱藏 |
| activity: true | ✅ 運動 | ✅ | ✅ |
| activity: false | ❌ 隱藏 | ✅ 保留 | ❌ 隱藏 |

---

## 🐛 已知限制

1. **快速新增按鈕控制**: 目前僅控制「今日記錄」頁面顯示，快速新增按鈕的控制需要額外實作
2. **歷史紀錄頁面**: History 頁面可能需要同步更新以隱藏關閉模組的資料
3. **Dashboard 統計**: Dashboard 可能需要排除關閉模組的資料

---

## 📝 下一步改進

1. **快速新增按鈕整合**: 在底部 Tab Bar 的 + 按鈕選單中根據模組開關動態顯示選項
2. **歷史頁面整合**: 在 History 頁面也應用相同的模組可見性邏輯
3. **Dashboard 整合**: 確保 Dashboard 統計數據也遵守模組開關
4. **設定頁面優化**: 加入「重置為預設」按鈕
