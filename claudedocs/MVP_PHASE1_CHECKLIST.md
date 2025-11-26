# MVP Phase 1 - 完成檢查清單

**版本**: 1.0
**建立日期**: 2025-11-26
**預計完成**: 2025 Q1 結束前（4-6 週）
**當前進度**: 80% → 目標 100%

---

## 📊 總體進度追蹤

### 優先級分布
- 🔴 **Critical**: 3 項（必須完成）
- 🟡 **High**: 1 項（強烈建議）
- 🟢 **Medium**: 3 項（品質保證）
- 📋 **Low**: 4 項（可選）

### 時間估算
- **最小範圍** (僅 Critical): 6-9 天
- **建議範圍** (Critical + High + Medium): 17-25 天
- **完整範圍** (含可選項目): 27-39 天

---

## 🔴 Critical Priority（必須完成）

### 1. Mobile-Web 同步修復 ✅ Must Complete
**優先級**: 🔴 Critical
**工作量**: 3-5 天
**負責人**: _____
**截止日期**: _____

#### 問題描述
- iOS app 與 Web 資料不同步
- 用戶在 mobile 新增的記錄未出現在 web
- 同步機制可能存在配置或認證問題

#### 工作項目清單
- [ ] **環境檢查**
  - [ ] 確認 Supabase URL 和 anon key 在 mobile 正確配置
  - [ ] 驗證 mobile 和 web 使用相同的 Supabase project
  - [ ] 檢查環境變數是否正確載入（.env 配置）

- [ ] **Authentication Flow 驗證**
  - [ ] 確認 mobile 登入後的 session token 正確儲存
  - [ ] 驗證 AsyncStorage 中的 auth token 有效性
  - [ ] 測試 token refresh 機制運作正常
  - [ ] 檢查 RLS policies 是否正確應用到 mobile client

- [ ] **Supabase Client 初始化**
  - [ ] 檢查 [supabase.ts](../src/lib/supabase.ts) mobile 配置
  - [ ] 確認 realtime subscriptions 正確啟用
  - [ ] 驗證 database connection 建立成功
  - [ ] 測試 API calls 是否正確執行

- [ ] **Realtime Subscriptions 測試**
  - [ ] 測試 food_entries 表的 realtime 更新
  - [ ] 測試 daily_symptom_entries 表的 realtime 更新
  - [ ] 驗證 insert/update/delete 事件正確觸發
  - [ ] 檢查 subscription cleanup 機制

- [ ] **同步邏輯修復**
  - [ ] 修復 FoodDiaryService 同步問題
  - [ ] 修復 SymptomDiaryService 同步問題
  - [ ] 實作錯誤重試機制
  - [ ] 新增同步狀態指示器（UI feedback）

#### 測試驗證
- [ ] **單元測試**
  - [ ] Supabase client 初始化測試
  - [ ] Auth service 測試
  - [ ] Data service CRUD 操作測試

- [ ] **整合測試**
  - [ ] Web 新增記錄 → Mobile 查看（5 秒內）
  - [ ] Mobile 新增記錄 → Web 查看（5 秒內）
  - [ ] 編輯記錄雙向同步測試
  - [ ] 刪除記錄雙向同步測試

- [ ] **效能測試**
  - [ ] 同步延遲 < 3 秒
  - [ ] 批量資料同步（100+ 筆）穩定性
  - [ ] 網路不穩定情況下的重試機制

#### 成功標準
- ✅ 同步成功率 ≥ 98%
- ✅ 同步延遲 < 3 秒
- ✅ 無資料遺失或重複
- ✅ 錯誤處理完善（有明確錯誤提示）

---

### 2. 資料庫 Schema 對齊 ✅ Must Complete
**優先級**: 🔴 Critical
**工作量**: 2-3 天
**負責人**: _____
**截止日期**: _____

#### 問題描述
- `daily_symptom_entries` schema 在 web/mobile 不一致
- 可能導致資料寫入失敗或欄位缺失
- 需要統一資料結構並建立 migration

#### 工作項目清單
- [ ] **Schema 分析**
  - [ ] 匯出當前 production schema
  - [ ] 比對 web 和 mobile 的資料結構定義
  - [ ] 識別不一致的欄位（類型、nullable、default）
  - [ ] 記錄 schema 差異清單

- [ ] **Migration 規劃**
  - [ ] 設計統一的 schema 結構
  - [ ] 規劃向後相容的 migration 策略
  - [ ] 評估資料遷移影響範圍
  - [ ] 準備 rollback 計劃

- [ ] **執行 Migration**
  - [ ] 建立 migration script（SQL）
  - [ ] 在 staging 環境測試 migration
  - [ ] 備份 production 資料
  - [ ] 執行 production migration
  - [ ] 驗證 migration 成功

- [ ] **TypeScript Types 更新**
  - [ ] 更新 [types/database.ts](../src/types/database.ts)
  - [ ] 重新生成 Supabase types（`npx supabase gen types`）
  - [ ] 更新相關的 service interfaces
  - [ ] 修正 type errors

- [ ] **程式碼適配**
  - [ ] 更新 web 端資料存取邏輯
  - [ ] 更新 mobile 端資料存取邏輯
  - [ ] 確保新舊資料相容性
  - [ ] 測試資料讀寫功能

#### 受影響的檔案（預估）
- `supabase/migrations/*.sql`
- `src/types/database.ts`
- `src/lib/services/SymptomDiaryService.ts`
- `src/app/api/symptoms/**/*.ts`
- Mobile 端對應的 service 檔案

#### 測試驗證
- [ ] **資料完整性測試**
  - [ ] 所有欄位正確讀取
  - [ ] 資料寫入無錯誤
  - [ ] 舊資料正確遷移
  - [ ] NULL/Default 值處理正確

- [ ] **跨平台測試**
  - [ ] Web 寫入 → Mobile 讀取
  - [ ] Mobile 寫入 → Web 讀取
  - [ ] 資料結構 100% 一致

- [ ] **邊界測試**
  - [ ] 空值處理
  - [ ] 最大長度測試
  - [ ] 特殊字符處理

#### 成功標準
- ✅ Schema 100% 一致
- ✅ 無資料遺失
- ✅ TypeScript 編譯無錯誤
- ✅ 所有測試通過

---

### 3. Bug 修復與驗證 ✅ Must Complete
**優先級**: 🟡 High
**工作量**: 1 天
**負責人**: _____
**截止日期**: _____

#### 已修復項目（2025-01-12）
- ✅ TodayScreen 導航到 Insights 錯誤
- ✅ SettingsService 更新 hero 模組錯誤

#### 待驗證清單
- [ ] **導航功能測試**
  - [ ] TodayScreen → Insights 導航正常
  - [ ] 所有 tab navigation 無錯誤
  - [ ] Deep linking 測試（如適用）
  - [ ] 返回導航（back navigation）正常

- [ ] **設定更新功能測試**
  - [ ] Hero 模組開關功能正常
  - [ ] 設定變更即時生效
  - [ ] 設定持久化正確（AsyncStorage）
  - [ ] 跨平台設定同步測試

- [ ] **回歸測試**
  - [ ] 運行完整 test suite
  - [ ] 檢查是否引入新的 bug
  - [ ] 驗證核心功能未受影響

#### 測試方法
```bash
# 運行測試
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run type-check         # TypeScript 檢查
npm run lint               # ESLint 檢查
```

#### 成功標準
- ✅ 所有已修復 bug 驗證通過
- ✅ 無新引入的 regression
- ✅ 測試覆蓋相關功能

---

## 🟢 Medium Priority（品質保證）

### 4. 測試覆蓋率提升 📊 Quality Gate
**優先級**: 🟢 Medium
**工作量**: 5-7 天
**負責人**: _____
**目標**: 10% → 40%

#### 當前狀況
- 測試覆蓋率: ~10%
- 缺乏 service 層測試
- API routes 測試不足

#### 工作項目清單
- [ ] **Services 層測試**
  - [ ] FoodDiaryService 測試（CRUD 操作）
  - [ ] SymptomDiaryService 測試（CRUD 操作）
  - [ ] GamificationService 測試（streak 計算）
  - [ ] SettingsService 測試（配置管理）
  - [ ] AuthService 測試（認證流程）

- [ ] **API Routes 測試**
  - [ ] `/api/food-entries` 測試
  - [ ] `/api/symptoms` 測試
  - [ ] `/api/gamification` 測試
  - [ ] `/api/ai/weekly-analysis` 測試
  - [ ] Error handling 測試

- [ ] **關鍵業務邏輯測試**
  - [ ] Streak 計算邏輯
  - [ ] 覆蓋率計算邏輯
  - [ ] 資料驗證邏輯
  - [ ] 日期處理邏輯

- [ ] **工具與設定**
  - [ ] 設定 Jest configuration
  - [ ] 設定 test coverage reporting
  - [ ] 整合到 CI/CD pipeline
  - [ ] 新增 pre-commit hook（測試門檻）

#### 測試範例
```typescript
// FoodDiaryService.test.ts
describe('FoodDiaryService', () => {
  describe('getFoodEntries', () => {
    it('should return entries for specific date', async () => {
      // Test implementation
    });

    it('should handle empty results', async () => {
      // Test implementation
    });
  });
});
```

#### 優先測試範圍
1. **High Priority**（必須）:
   - FoodDiaryService
   - SymptomDiaryService
   - GamificationService

2. **Medium Priority**（建議）:
   - API routes
   - AuthService
   - SettingsService

3. **Low Priority**（可選）:
   - Utility functions
   - UI components

#### 成功標準
- ✅ 測試覆蓋率 ≥ 40%
- ✅ 核心 services 覆蓋率 ≥ 70%
- ✅ 所有測試通過
- ✅ CI/CD 整合完成

---

### 5. Code Quality 改善 🧹 Clean Code
**優先級**: 🟢 Medium
**工作量**: 2-3 天
**負責人**: _____

#### 當前狀況
- 704 個 console statements
- 未使用的 exports
- ESLint warnings

#### 工作項目清單
- [ ] **Console Logs 清理**
  - [ ] 執行 `scripts/cleanup-console-logs.sh`
  - [ ] 手動審查剩餘的 console.log
  - [ ] 替換為適當的 logger（生產環境）
  - [ ] 保留必要的 debug logs（開發環境）
  - [ ] 目標: < 50 console statements

- [ ] **Unused Code 移除**
  - [ ] 運行 `npx ts-unused-exports`
  - [ ] 移除未使用的 exports
  - [ ] 移除未使用的 imports
  - [ ] 移除 dead code
  - [ ] 移除註解的舊代碼

- [ ] **ESLint Warnings 修復**
  - [ ] 運行 `npm run lint`
  - [ ] 修復所有 warnings
  - [ ] 確保無 errors
  - [ ] 統一 code style

- [ ] **Code Organization**
  - [ ] 檢查檔案命名一致性
  - [ ] 改善目錄結構（如需要）
  - [ ] 新增必要的註解和文檔
  - [ ] 統一 import 順序

#### 工具命令
```bash
# 清理 console logs
./scripts/cleanup-console-logs.sh

# 檢查未使用的 exports
npx ts-unused-exports tsconfig.json

# ESLint 檢查和修復
npm run lint
npm run lint:fix

# TypeScript 檢查
npm run type-check
```

#### 成功標準
- ✅ Console statements < 50
- ✅ 無未使用的 exports
- ✅ ESLint: 0 errors, < 10 warnings
- ✅ TypeScript: 0 errors

---

### 6. 效能優化 ⚡ Performance
**優先級**: 🟢 Medium
**工作量**: 3-4 天
**負責人**: _____

#### 當前目標
- 頁面載入 < 2 秒
- API 回應 < 500ms (p95)
- Mobile app 啟動 < 3 秒

#### 工作項目清單
- [ ] **圖片優化**
  - [ ] 轉換圖片為 WebP 格式
  - [ ] 實作 lazy loading
  - [ ] 新增 image placeholders
  - [ ] 壓縮現有圖片資源

- [ ] **API 回應時間優化**
  - [ ] 新增 database indexes
  - [ ] 優化 SQL queries
  - [ ] 實作 API response caching
  - [ ] 減少不必要的資料查詢

- [ ] **Mobile App 啟動優化**
  - [ ] 分析啟動瓶頸（React Native Profiler）
  - [ ] 延遲載入非關鍵模組
  - [ ] 優化初始 bundle size
  - [ ] 實作 code splitting（如適用）

- [ ] **前端效能優化**
  - [ ] React Query cache 優化
  - [ ] Component memoization
  - [ ] Virtualized lists（長列表）
  - [ ] 減少 re-renders

#### 效能測試
- [ ] **Web 效能測試**
  - [ ] Lighthouse 測試（Performance > 80）
  - [ ] 首次內容繪製（FCP < 1.5s）
  - [ ] 可交互時間（TTI < 3s）

- [ ] **API 效能測試**
  - [ ] 測試 API 回應時間（p50, p95, p99）
  - [ ] 負載測試（模擬 100 concurrent users）
  - [ ] 資料庫 query 效能分析

- [ ] **Mobile 效能測試**
  - [ ] 啟動時間測量
  - [ ] 內存使用監控
  - [ ] 電池消耗測試

#### 效能基準（Baseline）
記錄當前效能指標作為基準：
- [ ] Web 頁面載入時間: _____ ms
- [ ] API 平均回應時間: _____ ms
- [ ] Mobile app 啟動時間: _____ ms

#### 成功標準
- ✅ Web 頁面載入 < 2 秒
- ✅ API 回應 < 500ms (p95)
- ✅ Mobile 啟動 < 3 秒
- ✅ Lighthouse Performance > 80

---

## 📋 Low Priority（可選功能）

### 7. 匯出體驗優化 📤 Optional
**優先級**: 📋 Low
**工作量**: 2-3 天
**負責人**: _____

#### 功能描述
改善資料匯出功能，讓用戶更容易將資料提供給 AI 分析

#### 工作項目清單
- [ ] 單鍵匯出功能
  - [ ] 一鍵匯出最近一週資料（CSV + JSON）
  - [ ] 預設檔案命名格式（含日期範圍）
  - [ ] 匯出進度指示器

- [ ] 預設範本
  - [ ] AI 友善格式範本（結構化 JSON）
  - [ ] 醫療報告格式範本（CSV）
  - [ ] 自訂範圍選擇（日期、資料類型）

- [ ] 容量上限提示
  - [ ] 計算匯出資料大小
  - [ ] 超過 10MB 警告提示
  - [ ] 建議分批匯出

#### 成功標準
- ✅ 匯出時間 < 10 秒（1000 筆記錄）
- ✅ 檔案格式正確無誤
- ✅ 用戶體驗流暢

---

### 8. 監控與告警 📊 Optional
**優先級**: 📋 Low
**工作量**: 3-4 天
**負責人**: _____

#### 功能描述
建立基礎監控與錯誤追蹤系統

#### 工作項目清單
- [ ] 錯誤追蹤（Sentry 或類似工具）
  - [ ] 整合 Sentry SDK
  - [ ] 設定錯誤過濾規則
  - [ ] 設定通知渠道

- [ ] 核心事件埋點
  - [ ] 用戶註冊/登入事件
  - [ ] 資料記錄事件
  - [ ] AI 週報生成事件
  - [ ] 匯出功能使用事件

- [ ] 同步失敗告警
  - [ ] 監控同步成功率
  - [ ] 同步失敗自動告警
  - [ ] 錯誤日誌收集

#### 工具選擇
- 錯誤追蹤: Sentry（推薦）
- 分析: Google Analytics / Mixpanel
- 日誌: CloudWatch / Supabase Logs

#### 成功標準
- ✅ 錯誤追蹤系統運作正常
- ✅ 核心事件正確記錄
- ✅ 告警機制測試通過

---

### 9. 使用者指引 📖 Optional
**優先級**: 📋 Low
**工作量**: 2-3 天
**負責人**: _____

#### 功能描述
改善用戶引導與教學體驗

#### 工作項目清單
- [ ] AI 提示詞優化
  - [ ] 提供範例提示詞
  - [ ] 說明如何使用匯出資料
  - [ ] AI 分析最佳實踐指南

- [ ] 匯出教學
  - [ ] 匯出功能使用教學
  - [ ] 資料格式說明
  - [ ] 常見問題解答

- [ ] 首週任務卡
  - [ ] 設計 onboarding tasks
  - [ ] 每日引導提示
  - [ ] 完成獎勵機制

#### 成功標準
- ✅ 教學內容清晰易懂
- ✅ 用戶完成率提升
- ✅ 減少支援請求

---

### 10. 隱私與合規 🔒 Optional
**優先級**: 📋 Low
**工作量**: 3-4 天
**負責人**: _____

#### 功能描述
完善隱私政策與合規文件

#### 工作項目清單
- [ ] 條款與隱私政策
  - [ ] 撰寫服務條款
  - [ ] 撰寫隱私政策
  - [ ] GDPR 合規聲明
  - [ ] 台灣個資法合規

- [ ] AI 使用說明
  - [ ] AI 資料處理說明
  - [ ] 用戶同意機制
  - [ ] 資料使用範圍說明

- [ ] 資料留存政策
  - [ ] 定義資料保存期限
  - [ ] 資料刪除流程
  - [ ] 備份與恢復政策

#### 法律審查
- [ ] 請法律顧問審查文件（如適用）
- [ ] 確保符合當地法規

#### 成功標準
- ✅ 文件完整且合規
- ✅ 用戶同意流程完善
- ✅ 隱私保護機制健全

---

## 🎯 Phase 1 發布準備檢查清單

### 必須完成項目（Release Blocker）
- [ ] ✅ Mobile-Web 同步成功率 > 98%
- [ ] ✅ 資料庫 Schema 一致性 100%
- [ ] ✅ 所有已知 Critical bugs 修復
- [ ] ✅ 測試覆蓋率 > 40%
- [ ] ✅ Code Quality: < 50 console statements
- [ ] ✅ 效能指標達標（頁面 < 2s，API < 500ms）
- [ ] ✅ 無 P0/P1 級別 bugs

### 強烈建議項目
- [ ] 核心功能 E2E 測試通過
- [ ] 跨平台一致性測試通過
- [ ] 基礎文檔完成（README, API docs）
- [ ] 監控系統基礎設置

### 可選項目
- [ ] 離線模式基礎功能
- [ ] 進階圖表分析
- [ ] 匯出體驗優化
- [ ] 使用者指引完善

---

## 📅 里程碑時間表

### Week 1-2: Critical Fixes
- Mobile-Web 同步修復
- 資料庫 Schema 對齊
- Bug 驗證

### Week 3-4: Quality Improvements
- 測試覆蓋率提升
- Code Quality 改善
- 效能優化

### Week 5-6: Final Polish (Optional)
- 匯出體驗優化
- 監控與告警
- 文檔完善

---

## 🔄 每日檢查項目

### 開發期間每日檢查
- [ ] 運行測試套件（`npm test`）
- [ ] 檢查 TypeScript 編譯（`npm run type-check`）
- [ ] 執行 ESLint（`npm run lint`）
- [ ] Git commit message 符合規範
- [ ] 更新 todo list 進度

### 每週檢查
- [ ] 審查本週完成的功能
- [ ] 更新進度報告
- [ ] 評估是否需要調整計劃
- [ ] 風險評估與緩解措施

---

## 📝 定義完成（Definition of Done）

每個任務完成時必須滿足：
- ✅ 功能實作完成
- ✅ 單元測試撰寫並通過
- ✅ 整合測試通過（如適用）
- ✅ Code review 完成
- ✅ 文檔更新（如需要）
- ✅ 無已知 bugs
- ✅ 效能符合標準
- ✅ 安全性檢查通過

---

## 🚨 風險與緩解措施

### 高風險項目
1. **Mobile-Web 同步**
   - 風險: 底層架構問題，修復困難
   - 緩解: 保留 2 週緩衝時間，必要時尋求專家協助

2. **資料庫 Migration**
   - 風險: 資料遺失或不一致
   - 緩解: 完整備份、staging 環境測試、rollback 計劃

3. **測試覆蓋率**
   - 風險: 時間不足無法達成目標
   - 緩解: 優先測試核心功能，調整目標至 30% 最低限度

### 時間風險管理
- 每週評估進度
- 優先完成 Critical 項目
- Low priority 項目可延後至 Phase 2
- 保持靈活調整能力

---

## 📊 品質指標（Quality Gates）

### 程式碼品質
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors, < 10 warnings
- [ ] Console logs: < 50
- [ ] Test coverage: ≥ 40%

### 功能品質
- [ ] 同步成功率: ≥ 98%
- [ ] 同步延遲: < 3 秒
- [ ] 資料一致性: 100%

### 效能品質
- [ ] 頁面載入: < 2 秒
- [ ] API 回應: < 500ms (p95)
- [ ] Mobile 啟動: < 3 秒
- [ ] Lighthouse Performance: > 80

### 穩定性
- [ ] P0 bugs: 0
- [ ] P1 bugs: 0
- [ ] P2 bugs: < 5
- [ ] Crash rate: < 1%

---

**文件版本**: 1.0
**最後更新**: 2025-11-26
**維護者**: Development Team
**下次審查**: 每週一

**變更歷史**:
- 2025-11-26: 初版建立，完整的 Phase 1 檢查清單
