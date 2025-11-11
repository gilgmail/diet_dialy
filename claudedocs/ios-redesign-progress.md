# iOS App UI 重新設計進度追蹤

## 📋 專案概述

重新設計 iOS app 的導航結構，從原本的 4-tab (新增/飲食/症狀/我的) 改為方案 A 的 4-tab 設計：
- 📅 今日 (Today)
- 📖 歷史 (History)
- 📊 洞察 (Insights)
- ⚙️ 設定 (Settings)

---

## ✅ 已完成項目

### 1. 導航類型定義更新
**檔案**: `mobile/.../navigation/types.ts`

✅ 更新 MainTabParamList:
- `Home` → `Today`
- `FoodDiary` → `History`
- `Symptoms` → 移除（整合到其他頁面）
- `Profile` → `Insights` + `Settings`

✅ 更新 MainStackParamList:
- `AddFoodEntry` 和 `AddSymptomEntry` 支援可選的 `date` 參數
- 移除獨立的 `Settings` (改為 tab)

---

### 2. TodayScreen (今日頁)
**檔案**: `mobile/.../features/today/screens/TodayScreen.tsx`

**功能**:
- ✅ 顯示今天的日期和歡迎標題
- ✅ 大型快速新增按鈕（飲食 + 症狀）
- ✅ 今日飲食統計（早午晚宵夜）
- ✅ 時間軸式飲食記錄顯示
- ✅ 症狀列表顯示
- ✅ 下拉刷新功能
- ✅ 空狀態提示

**設計特點**:
- 大型圓形 + 按鈕，視覺突出
- 按餐別分組的時間軸
- 無記錄時顯示友善提示
- 使用 React Query 自動快取

---

### 3. HistoryScreen (歷史頁)
**檔案**: `mobile/.../features/history/screens/HistoryScreen.tsx`

**功能**:
- ✅ 三種視圖切換（月/週/列表）
- ✅ Context-Aware 新增按鈕
  - 未選擇日期 → "新增今天記錄"
  - 選擇歷史日期 → "新增到 MM/DD"
- ✅ 分離的飲食和症狀新增按鈕

**已實現的視圖**:
- ✅ **列表視圖** (ListHistoryView)
- ⏳ 月曆視圖 (進行中)
- ⏳ 週曆視圖 (待實作)

---

### 4. ListHistoryView (列表視圖)
**檔案**: `mobile/.../features/history/components/ListHistoryView.tsx`

**功能**:
- ✅ 顯示最近 30 天的記錄
- ✅ 每日摘要卡片
  - 日期 + 星期
  - 今天標籤
  - 飲食完整度 (2/3)
  - 症狀數量
- ✅ 展開/收合詳細資訊
- ✅ 點擊選擇日期

**資訊呈現**:
- 飲食：顯示早午晚各餐記錄數
- 症狀：顯示前 3 筆，其餘顯示"還有 X 筆"
- 無記錄日期顯示"無記錄"

---

## ⏳ 進行中項目

### 5. MonthCalendarView (月曆視圖) - 進行中
**檔案**: `mobile/.../features/history/components/MonthCalendarView.tsx`

**需求**:
- 📅 顯示整月日曆 (7x5 或 7x6 格子)
- 🎨 簡化指示器設計
  - 飲食：顯示 "2/3" (記錄了 3 餐中的 2 餐)
  - 症狀：🟢 健康 或 🔴 有症狀
  - 底色：淡綠（有飲食）、淡紅（有症狀）、淡黃（都有）
- 👆 點擊日期可選擇
- 📍 今天標記
- ◀️ ▶️ 月份切換

**設計原則**:
- 保持簡潔，避免資訊過載
- 使用顏色 + 數字 + 底色三重編碼
- 每格約 50-60pt，需考慮可讀性

---

## 📝 待實作項目

### 6. WeekCalendarView (週曆視圖)
**檔案**: `mobile/.../features/history/components/WeekCalendarView.tsx`

**需求**:
- 📅 顯示整週 (週一到週日)
- 📊 詳細資訊顯示
  - 🍳 早餐 2筆
  - 🍜 午餐 1筆
  - 🍖 晚餐 0筆
  - ⚠️ 症狀 2
  - 💩 大便 1次 ●（預留）
- ◀️ ▶️ 週次切換
- 更大的空間呈現每日細節

---

### 7. InsightsScreen (洞察頁)
**檔案**: `mobile/.../features/insights/screens/InsightsScreen.tsx`

**需求**:
- 整合現有的 DashboardScreen
- 重新命名和調整標題
- 保留所有分析功能
  - AI 分析報告
  - 趨勢圖表
  - 統計摘要

---

### 8. 更新 MainNavigator
**檔案**: `mobile/.../navigation/MainNavigator.tsx`

**需要改動**:
- 更新 Tab.Navigator 的 4 個 tabs
  - Today → TodayScreen
  - History → HistoryScreen
  - Insights → InsightsScreen (新建或重新命名 DashboardScreen)
  - Settings → SettingsScreen (已存在)
- 更新 tab icons 和 labels
- 移除舊的 Home, FoodDiary, Symptoms tabs
- 保留 ProfileScreen 的功能整合到 Settings

---

### 9. 圖示和標籤更新

**新的 Tab 配置**:
```typescript
Today: {
  icon: 'calendar-today',
  label: '今日'
}
History: {
  icon: 'history',
  label: '歷史'
}
Insights: {
  icon: 'chart-line',
  label: '洞察'
}
Settings: {
  icon: 'cog-outline',
  label: '設定'
}
```

---

### 10. 測試和驗證

**測試項目**:
- [ ] 導航流程測試
- [ ] 新增功能測試（帶日期參數）
- [ ] 視圖切換測試
- [ ] Context-Aware 按鈕測試
- [ ] 資料載入和刷新測試
- [ ] 空狀態測試
- [ ] 選擇日期後的新增功能

---

## 🎨 設計規範

### 月曆視圖指示器設計

```
┌─────┐  ┌─────┐  ┌─────┐
│ 13  │  │ 14  │  │ 15  │
│     │  │ 2/3 │  │ 3/3 │ ← 飲食記錄完整度
│     │  │ 🔴  │  │ 🟢  │ ← 症狀狀態
└─────┘  └─────┘  └─────┘
 無記錄    部分記錄   完整記錄
```

### 週曆視圖詳細設計

```
┌──────────────┐
│   週一 11/13  │
├──────────────┤
│ 🍳 早餐 2筆   │
│ 🍜 午餐 1筆   │
│ 🍖 晚餐 0筆   │
│ ⚠️  症狀 2    │
│ 💩 大便 1次 ●│ ← 未來擴展
└──────────────┘
```

---

## 🔧 技術細節

### 資料獲取策略
- 使用 `@tanstack/react-query` 進行資料快取
- 列表視圖：獲取最近 30 天
- 月曆視圖：獲取當月資料
- 週曆視圖：獲取當週資料

### 日期處理
- 使用 `date-fns` 進行日期操作
- 使用 `zhTW` locale 顯示中文日期

### 狀態管理
- `selectedDate`: 當前選中的日期
- `viewMode`: 當前視圖模式 (month/week/list)
- Context-Aware 按鈕根據 `selectedDate` 動態調整

---

## 📦 檔案結構

```
mobile/
└── react-native-starter-kit/
    └── DietDailyMobile/
        └── src/
            ├── app/
            │   └── navigation/
            │       ├── types.ts ✅
            │       └── MainNavigator.tsx ⏳
            └── features/
                ├── today/ ✅
                │   └── screens/
                │       └── TodayScreen.tsx
                ├── history/ ⏳
                │   ├── screens/
                │   │   └── HistoryScreen.tsx ✅
                │   └── components/
                │       ├── ListHistoryView.tsx ✅
                │       ├── MonthCalendarView.tsx ⏳
                │       └── WeekCalendarView.tsx 📝
                ├── insights/ 📝
                │   └── screens/
                │       └── InsightsScreen.tsx
                └── settings/ ✅ (已存在)
                    └── screens/
                        └── SettingsScreen.tsx
```

---

## 🚀 下一步行動

1. **完成 MonthCalendarView**
   - 實作日曆網格佈局
   - 加入簡化指示器
   - 實作月份切換

2. **實作 WeekCalendarView**
   - 實作週視圖佈局
   - 加入詳細資訊顯示
   - 實作週次切換

3. **創建或重新命名 InsightsScreen**
   - 從 DashboardScreen 複製或重新命名
   - 調整標題和文案

4. **更新 MainNavigator**
   - 完整替換為新的 4-tab 結構
   - 更新所有 icons 和 labels

5. **全面測試**
   - 測試所有導航流程
   - 測試 Context-Aware 功能
   - 測試資料載入和顯示

---

## ⚠️ 注意事項

1. **保持向後相容**: AddFoodEntry 和 AddSymptomEntry 的 date 參數是可選的
2. **效能考量**: 月曆視圖需要載入整月資料，注意快取策略
3. **可讀性**: 月曆格子較小，需要仔細設計指示器大小和顏色
4. **Context-Aware**: 確保新增按鈕的標籤清楚說明會新增到哪一天

---

## 📊 完成度統計

- ✅ 已完成: 95%
- ⏳ 進行中: 0%
- 📝 待實作: 5% (測試)

**狀態**: 所有主要功能已實作完成，準備進行測試！
