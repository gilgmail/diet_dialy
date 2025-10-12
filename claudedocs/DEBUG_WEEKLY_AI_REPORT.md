# 🔍 一週 AI 分析報告除錯指南

## 問題描述

一週 AI 分析報告按鈕顯示正常，但沒有產生新的報告。
- 舊報告：共分析 21 筆飲食與 1 筆症狀記錄
- 本週實際：25 筆飲食記錄，2 筆症狀記錄

## 改進內容

### ✅ 已添加診斷日誌

#### 1. Mobile App - DashboardService ([DashboardService.ts:342-352](../mobile/react-native-starter-kit/DietDailyMobile/src/features/dashboard/services/DashboardService.ts#L342-L352))

```typescript
// 🔍 請求前日誌
console.log('[DashboardService] 🔍 Requesting AI analysis:')
console.log('  📅 startDate:', startDate)
console.log('  📅 endDate:', endDate)
console.log('  📊 weeklyTrend length:', weeklyTrend.week.length)
console.log('  👤 userId:', userId)
console.log('  🌐 endpoint:', endpoint)

// 🔍 回應後日誌
console.log('[DashboardService] 📥 AI analysis response received:')
console.log('  ✅ success:', payload.success)
console.log('  📊 method:', payload.analysis?.method)
console.log('  🍽️ food entries:', payload.analysis?.totals?.food_entries)
console.log('  ❤️ symptom entries:', payload.analysis?.totals?.symptom_entries)
console.log('  📅 timeframe:', payload.analysis?.timeframe)
console.log('  📚 history count:', payload.history?.length)
```

#### 2. Backend API - fetchDataset ([weekly-ibd-analysis.ts:485-517](../src/lib/ai/weekly-ibd-analysis.ts#L485-L517))

```typescript
// 🔍 資料獲取前日誌
console.log('[fetchDataset] 🔍 Fetching data for analysis:')
console.log('  👤 userId:', userId)
console.log('  📅 startDate:', timeframe.startDate)
console.log('  📅 endDate:', timeframe.endDate)
console.log('  📊 daysCovered:', timeframe.daysCovered)

// 🔍 資料獲取後日誌
console.log('[fetchDataset] 📥 Data retrieved:')
console.log('  🍽️ Food entries:', foodEntries.length)
console.log('  ❤️ Symptom entries:', symptomEntries.length)
console.log('  📅 Unique food dates:', uniqueDates.sort())
console.log('  📅 Unique symptom dates:', uniqueDates.sort())
```

#### 3. API Route Handler ([route.ts:198-227](../src/app/api/ai/weekly-ibd-analysis/route.ts#L198-L227))

```typescript
// 🔍 API 請求日誌
console.log('[weekly-ibd-analysis] 🔍 POST request received:')
console.log('  👤 userId:', body.userId)
console.log('  📅 startDate:', body.startDate)
console.log('  📅 endDate:', body.endDate)

// 🔍 分析完成日誌
console.log('[weekly-ibd-analysis] 📊 Analysis completed:')
console.log('  ✅ success:', result.success)
console.log('  📊 method:', result.method)
console.log('  🍽️ food_entries:', result.totals.food_entries)
console.log('  ❤️ symptom_entries:', result.totals.symptom_entries)

// 🔍 儲存報告日誌
console.log('[weekly-ibd-analysis] 💾 Saving report to storage...')
console.log('[weekly-ibd-analysis] ✅ Report saved successfully')
console.log('[weekly-ibd-analysis] 📚 Fetched history:', history.length, 'reports')
```

#### 4. 去重邏輯 ([route.ts:115-139](../src/app/api/ai/weekly-ibd-analysis/route.ts#L115-L139))

```typescript
// 🔍 去重處理日誌
console.log('[fetchWeeklyHistory] 🔍 Deduplication process:')
console.log('  📊 Total reports before dedup:', sorted.length)

// 對每個報告記錄去重決策
console.log(`  ${exists ? '⏭️ Skip' : '✅ Keep'} [${key}]`)
console.log(`    🕒 Created: ${item.createdAt}`)
console.log(`    📊 Data: ${item.title}`)

console.log('  📊 Total reports after dedup:', dedupedItems.length)
```

## 🚀 測試步驟

### 1. 啟動 Metro Bundler
```bash
cd mobile/react-native-starter-kit/DietDailyMobile
npm start
```

### 2. 查看 Console 輸出
- 開啟 Metro Bundler 的 terminal
- 或使用 React Native Debugger

### 3. 點擊「一週 AI 分析」按鈕
在 mobile app 的 Dashboard 頁面點擊按鈕

### 4. 觀察日誌輸出
依序檢查以下資訊：

#### ✅ 檢查點 1: 日期範圍
```
[DashboardService] 🔍 Requesting AI analysis:
  📅 startDate: 2025-10-06
  📅 endDate: 2025-10-12
```
**確認**: 日期範圍是否涵蓋本週？

#### ✅ 檢查點 2: 資料獲取
```
[fetchDataset] 📥 Data retrieved:
  🍽️ Food entries: 25
  ❤️ Symptom entries: 2
  📅 Unique food dates: [...]
```
**確認**: 是否正確獲取到 25 筆食物和 2 筆症狀？

#### ✅ 檢查點 3: 分析結果
```
[weekly-ibd-analysis] 📊 Analysis completed:
  ✅ success: true
  📊 method: claude_api
  🍽️ food_entries: 25
  ❤️ symptom_entries: 2
```
**確認**: 分析是否成功？資料筆數是否正確？

#### ✅ 檢查點 4: 報告儲存
```
[weekly-ibd-analysis] 💾 Saving report to storage...
[weekly-ibd-analysis] ✅ Report saved successfully
```
**確認**: 報告是否成功儲存？

#### ✅ 檢查點 5: 去重邏輯
```
[fetchWeeklyHistory] 🔍 Deduplication process:
  📊 Total reports before dedup: 3
  ✅ Keep [2025-10-06_2025-10-12]
    🕒 Created: 2025-10-12T10:30:00Z
  ⏭️ Skip [2025-10-06_2025-10-12]
    🕒 Created: 2025-10-11T15:20:00Z
```
**確認**:
- 是否有多個相同日期範圍的報告？
- 是否保留最新的報告？

## 🐛 常見問題診斷

### 問題 1: 日期範圍不正確
**症狀**: startDate 和 endDate 不是本週
**可能原因**: `weeklyTrend.week` 陣列資料不正確
**解決方案**: 檢查 `calculateWeeklyTrend` 方法

### 問題 2: 資料筆數不符
**症狀**: fetchDataset 獲取的資料少於預期
**可能原因**:
- 資料庫查詢的日期範圍有誤
- 資料的 consumed_at/recorded_date 時區問題
**解決方案**:
- 檢查資料庫中的實際日期值
- 確認時區轉換邏輯

### 問題 3: 舊報告被顯示
**症狀**: 新報告已生成但顯示舊報告
**可能原因**:
- 去重邏輯保留了舊報告
- 前端 cache 未更新
**解決方案**:
- 檢查 createdAt 時間戳
- 清除 app cache 重新載入

### 問題 4: 報告儲存失敗
**症狀**: analysis 成功但未儲存
**可能原因**:
- Supabase storage 權限問題
- PDF 生成失敗
**解決方案**:
- 檢查 storage bucket 權限
- 查看 PDF 生成錯誤訊息

## 📝 預期正常流程

成功生成新報告時，應該看到：

```
[DashboardService] 🔍 Requesting AI analysis:
  📅 startDate: 2025-10-06
  📅 endDate: 2025-10-12

[fetchDataset] 📥 Data retrieved:
  🍽️ Food entries: 25
  ❤️ Symptom entries: 2

[weekly-ibd-analysis] 📊 Analysis completed:
  ✅ success: true
  📊 method: claude_api
  🍽️ food_entries: 25
  ❤️ symptom_entries: 2

[weekly-ibd-analysis] 💾 Saving report to storage...
[weekly-ibd-analysis] ✅ Report saved successfully

[DashboardService] 📥 AI analysis response received:
  ✅ success: true
  📊 method: claude_api
  🍽️ food entries: 25
  ❤️ symptom entries: 2
```

## 🔧 下一步行動

1. **執行測試**: 點擊按鈕並觀察 console
2. **記錄日誌**: 複製完整的日誌輸出
3. **比對檢查點**: 找出哪個檢查點失敗
4. **定位問題**: 根據失敗的檢查點定位具體問題
5. **修正問題**: 針對性地修正發現的問題

## 📞 回報問題

如果問題仍未解決，請提供：
1. 完整的 console 日誌
2. 失敗的檢查點
3. 資料庫中實際的記錄筆數
4. 報告歷史列表的截圖
