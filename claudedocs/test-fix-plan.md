# 測試修復計劃

> 最後更新：2025-11-21

## 📋 執行摘要

### 當前狀態
- **已修復**：PDFReportExporter (29/29 ✅)
- **待修復**：4 個測試套件，39 個失敗測試
- **未提交改動**：5 個文件（與測試失敗可能相關）

### 優先級評估
1. **P0 - 緊急**：與未提交改動相關的測試失敗
2. **P1 - 高**：影響核心功能的測試失敗
3. **P2 - 中**：邊緣情況和性能測試

## 🔍 未提交改動分析

### 1. Supabase Server 相關改動
**文件**：
- `src/lib/supabase/server.ts` (4 行改動)
- `src/lib/supabase/server-auth.ts` (4 行改動)

**改動內容**：
- 修復 `cookies()` 類型問題：`as unknown as Awaited<ReturnType<typeof cookies>>`
- 改進錯誤處理

**影響範圍**：
- ✅ 可能修復 Integration 測試中的 `TypeError: Cannot read properties of undefined (reading 'get')`
- ✅ 與 `daily-symptoms-integration.test.ts` 失敗相關（10 個測試）

**優先級**：**P0 - 緊急**
- 這些改動直接影響 Integration 測試
- 應該先提交這些改動，然後驗證測試是否修復

### 2. Multi-Condition Foods Service
**文件**：`src/lib/supabase/multi-condition-foods-service.ts` (20 行改動)

**改動內容**：未知（需要檢查）

**影響範圍**：可能影響食物相關測試

**優先級**：**P1 - 高**

### 3. Package.json
**文件**：`package.json` (1 行改動)

**改動內容**：新增 `test:phase-a` 腳本

**影響範圍**：無直接測試影響

**優先級**：**P2 - 低**

### 4. E2E 測試文件
**文件**：
- `e2e/settings-page.spec.ts` (341 行刪除)
- `src/__tests__/e2e/settings-page.spec.ts` (新文件)

**改動內容**：測試文件重構/移動

**影響範圍**：E2E 測試

**優先級**：**P2 - 低**

## 🎯 測試修復計劃

### Phase 1: 提交並驗證未提交改動（P0）

#### 1.1 提交 Supabase Server 改動
```bash
git add src/lib/supabase/server.ts src/lib/supabase/server-auth.ts
git commit -m "fix: 修復 Supabase server cookies 類型問題

- 修復 cookies() 類型轉換問題
- 改進錯誤處理
- 可能修復 Integration 測試中的 TypeError"
```

**預期結果**：
- 修復 `daily-symptoms-integration.test.ts` 中的 10 個失敗測試
- 所有測試應該能正確訪問 cookies

#### 1.2 驗證 Integration 測試
```bash
npm test -- src/__tests__/integration/daily-symptoms-integration.test.ts
```

**驗證點**：
- ✅ 不再出現 `TypeError: Cannot read properties of undefined (reading 'get')`
- ✅ 測試能夠正確設置和讀取 cookies
- ✅ CRUD 操作測試通過

### Phase 2: 修復 SymptomAnalysisEngine 測試（P1）

#### 2.1 問題分析
**錯誤類型**：
- `Unable to find an element with the text: 症狀智能分析系統`
- `Unable to find an accessible element with the role "tab"`

**根本原因**：
1. 組件可能沒有正確渲染（返回空 `<div />`）
2. 可能是 `'use client'` 指令問題
3. Recharts mock 可能不完整

#### 2.2 修復步驟

**步驟 1：檢查組件是否為 Client Component**
```typescript
// 確認 src/components/medical/SymptomAnalysisEngine.tsx 有 'use client'
'use client';
```

**步驟 2：檢查 Recharts Mock**
```typescript
// 確認 jest.setup.js 或測試文件中有完整的 Recharts mock
jest.mock('recharts', () => ({
  // ... 完整的 mock 實現
}));
```

**步驟 3：更新測試以匹配實際渲染**
- 檢查組件實際渲染的結構
- 更新測試查詢以匹配實際 DOM 結構

**預期修復時間**：2-3 小時

### Phase 3: 修復 HealthTrendPredictor 測試（P1）

#### 3.1 問題分析
**錯誤類型**：
- `Found multiple elements with the text: /症狀頻率/`

**根本原因**：
- 測試使用 `getByText` 但有多個匹配元素（select option 和顯示文本）
- 需要使用更精確的查詢

#### 3.2 修復步驟

**步驟 1：使用更精確的查詢**
```typescript
// 從
expect(screen.getByText(new RegExp(metricLabels[metric]))).toBeInTheDocument();

// 改為
const elements = screen.getAllByText(new RegExp(metricLabels[metric]));
expect(elements.length).toBeGreaterThan(0);
// 或者使用更精確的查詢，例如通過 testid
```

**步驟 2：驗證圖表渲染**
- 確認 Recharts mock 正確設置
- 驗證圖表組件正確渲染

**預期修復時間**：1-2 小時

### Phase 4: 修復 API Weekly Analysis 測試（P1）

#### 4.1 問題分析
**錯誤類型**：
- `expect(received).toBe(expected) // Object.is equality`
- `Expected: 200, Received: 500`

**根本原因**：
- API 端點返回 500 錯誤
- 可能是 mock 數據設置問題
- 可能是 API 邏輯變更

#### 4.2 修復步驟

**步驟 1：檢查 API 端點實現**
```typescript
// 檢查 src/app/api/ai/weekly-ibd-analysis/route.ts
// 確認錯誤處理邏輯
```

**步驟 2：更新 Mock 數據**
- 確保 mock 數據符合 API 預期格式
- 檢查所有必需的字段

**步驟 3：添加錯誤日誌**
- 在測試中添加 console.log 查看實際錯誤
- 根據錯誤信息修復

**預期修復時間**：1-2 小時

## 📊 修復優先級矩陣

| 測試套件 | 失敗數 | 優先級 | 預估時間 | 相關未提交改動 |
|---------|-------|--------|----------|---------------|
| Daily Symptom Integration | 10 | P0 | 1-2h | ✅ server.ts, server-auth.ts |
| SymptomAnalysisEngine | 23 | P1 | 2-3h | ❌ 無 |
| HealthTrendPredictor | 5 | P1 | 1-2h | ❌ 無 |
| API Weekly Analysis | 1 | P1 | 1-2h | ❌ 無 |

**總預估時間**：5-9 小時

## 🚀 執行順序

### 立即執行（今天）
1. ✅ 提交 Supabase server 改動
2. ✅ 驗證 Integration 測試是否修復
3. 🔄 如果未完全修復，深入調查

### 短期執行（本週）
1. 修復 SymptomAnalysisEngine 測試
2. 修復 HealthTrendPredictor 測試
3. 修復 API Weekly Analysis 測試

### 長期執行（下週）
1. 添加 Phase A API 測試
2. 改進測試覆蓋率
3. 添加 E2E 測試

## 📝 詳細修復指南

### 修復 SymptomAnalysisEngine 測試

#### 問題 1：組件未渲染
**症狀**：`<body><div /></body>`

**可能原因**：
1. 組件拋出錯誤但被靜默捕獲
2. `'use client'` 指令缺失
3. 依賴項未正確 mock

**檢查清單**：
- [ ] 確認組件有 `'use client'` 指令
- [ ] 檢查瀏覽器控制台是否有錯誤
- [ ] 驗證所有依賴項都已正確 mock
- [ ] 檢查組件的 props 類型是否正確

#### 問題 2：Tab 無法找到
**症狀**：`Unable to find an accessible element with the role "tab"`

**可能原因**：
1. ARIA 屬性未正確設置
2. 組件結構變更
3. 測試查詢方式不正確

**修復方法**：
```typescript
// 檢查組件是否正確設置 role="tab"
// 如果使用 button，需要明確設置 role
<button role="tab" aria-selected={active}>

// 或者使用更寬鬆的查詢
screen.getByText(/總覽分析/)
```

### 修復 HealthTrendPredictor 測試

#### 問題：多個匹配元素
**症狀**：`Found multiple elements with the text: /症狀頻率/`

**修復方法**：
```typescript
// 方法 1：使用 getAllByText 然後檢查第一個
const elements = screen.getAllByText(/症狀頻率/);
expect(elements[0]).toBeInTheDocument();

// 方法 2：使用更精確的查詢
const chartTitle = screen.getByTestId('chart-title');
expect(chartTitle).toHaveTextContent(/症狀頻率/);

// 方法 3：使用 querySelector
const title = document.querySelector('[data-testid="metric-title"]');
expect(title).toHaveTextContent(/症狀頻率/);
```

## 🔗 相關資源

- [測試狀態報告](./test-status.md)
- [Phase A Medication Sleep Data Plan](./phase-a-medication-sleep-data-plan.md)
- [React Testing Library 最佳實踐](https://testing-library.com/docs/react-testing-library/intro/)

## 📈 進度追蹤

### 已完成
- [x] PDFReportExporter 測試修復 (29/29)
- [x] 測試狀態文檔創建
- [x] 修復計劃制定

### 進行中
- [ ] 提交 Supabase server 改動
- [ ] 驗證 Integration 測試

### 待處理
- [ ] SymptomAnalysisEngine 測試修復
- [ ] HealthTrendPredictor 測試修復
- [ ] API Weekly Analysis 測試修復

