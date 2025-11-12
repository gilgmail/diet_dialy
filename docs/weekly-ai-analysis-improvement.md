# 一週 AI 分析分段化改進紀錄（2025-11-09）

## 問題摘要
- 目前 `weekly-ibd-analysis.ts` 以單一 prompt 丟出 7 天完整飲食與症狀紀錄，資料量動輒 20-40k tokens。
- token 超量時後端直接失敗，前端沒有預警，也無法在小 token 模式取得部分結果。
- 報告主體（`daily_food_breakdown`）雖然詳細，但產出成本過高，造成 iOS Dashboard 上常見逾時或錯誤。

## 本次討論與決議
1. **分段輸入**  
   - 先將原始 `dailyBreakdown` 依 1-2 天劃分 chunk，逐段呼叫模型生成「日/雙日摘要」。
   - 每個 chunk 只輸入該日期的用餐與症狀，要求輸出固定 JSON（含 `daily_breakdown`、風險候選、支持候選等）。
2. **週報總結**  
   - 將 chunk 輸出的結構化資料 + 聚合統計（trackingSummary、foodImpacts 等）再丟給模型做最後總結。
   - 最後的 weekly prompt 不再傳原始明細，只附上 chunk highlights，大幅降低一次性 token。
   - `daily_food_breakdown` 由 chunk 結果合併後直接植入，週報 prompt 可專注在 summary / trend / action。
3. **token 預估與警示**  
   - 在送出 prompt 前，以 `JSON.length / 4` 近似計算 tokens，超過 `maxTokens * 0.7` 時自動切換 chunk 模式。
   - 若仍估計超過硬上限，直接回傳 `requires_more_tokens` 狀態給前端顯示提示（避免不必要扣費）。
4. **精簡模式**  
   - chunk 模式下，如使用者選擇「省 token」，可只輸出 1-2 天摘要 + 最終重點，並註記哪些欄位被省略。

## 待辦
- [x] 建立紀錄文件。
- [x] 在 Weekly IBD Analysis 服務中加入 token 估算、策略切換與 chunk workflow。
- [ ] 調整 Dashboard UI，在 `analysis_mode` 為 chunk / low-token 時呈現提示。
- [ ] 新增測試覆蓋 chunk merge 與警示邏輯。

> 以上內容後續若有新 insight 或執行結果，統一更新此文件以便追蹤。

## 後端食物資料庫分析策略（草案）

### 1. 刷新與觸發流程
- **週報查詢 → 先查快取**：Weekly IBD 分析組裝 payload 時，針對每個 `food_id` 先讀取 `food_analysis_cache`（或 `food_items` 新欄位）的最新分析資料。
- **觸發重算條件**：
  1. `analysis_updated_at` 距今超過 90 天（季度刷新）。
  2. `analysis_version` 落後於後端公布的最新模型/提示版本。
  3. `analysis_usage_count` 累積超過門檻（如 50 次），代表需求高、應優先刷新。
- **背景排程**：符合條件時，將 `food_id` 丟入 queue，由背景 worker 呼叫 AI 重新產生分析；避免在使用者請求中同步等待。

### 2. 必要欄位與計數
- `analysis_version`：識別採用的模型/提示版本（例：`food-v2025.01`）。
- `analysis_updated_at`：最近一次完成刷新時間。
- `analysis_usage_count`：各模組引用次數，每次讀取就自動 +1，做熱門排序或 refresh 優先級。
- `analysis_payload`：AI 輸出的主內容（JSON），內含營養摘要、風險等。
- `analysis_tokens`：紀錄每次刷新所花費的 input/output tokens，便於成本追蹤。
- `analysis_history`（可獨立表）：保留過去 N 次版本，以利回溯或人工覆寫。

### 3. 分析內容結構
- `nutrition_profile`
  - 宏量分佈（蛋白質/脂肪/碳水），重點微量元素（鐵、鈣、鎂、B12 等）。
  - FODMAP 分級、纖維類型（可溶/不溶）、加工方式（油炸/醃製/發酵）。
- `risk_profile`
  - 已知敏感成分（乳糖、麩質、辣椒素、高糖、高脂肪等）。
  - 常見症狀關聯（腹脹、腹瀉、腹痛等）與可信度說明。
  - 延遲反應窗口或劑量門檻（例如「>200ml 容易引發症狀」）。
- `supportive_attributes`
  - 抗發炎或腸道修復優點（Omega-3、膠原蛋白、益生菌等）。
  - 建議搭配或烹調方式（如「改用無乳糖牛奶」）。
- `serving_guidelines`
  - 建議份量、每週頻率，以及需搭配的監測指標。

### 4. 與 AI 週報的整合方式
1. **優先引用快取**：週報 prompt 僅傳入「本週實際食用日期/症狀 + 食物分析摘要」，減少重複背景敘述。
2. **缺少資料時即時補齊**：若判斷 `analysis_payload` 不存在，先以 fallback prompt 生成簡化版並寫入資料庫，下次即可直接使用。
3. **版本追蹤**：在 weekly result 的 `evidence_notes` 記錄引用的 `analysis_version`，讓使用者/系統知道是基於哪份資料庫版本。

### 5. 其他優化建議
1. **熱門食材批次刷新**：每日或每週背景 job 依 `analysis_usage_count` Top N 重新整理，確保常見食物永遠是最新版。
2. **Schema 驗證**：對 `analysis_payload` 做 JSON schema 驗證，避免 AI 回傳缺欄位或無效值衝擊上游流程。
3. **人工覆寫機制**：營養師可在後台調整分析內容，並標註「manual_override = true」，避免自動刷新覆蓋人工判斷。
4. **多資料來源融合**：若未來收集到跨使用者統計（眾包症狀回報），可將「觀察到的群體風險」與個人資料加權，提升建議可信度。
5. **成本監控**：彙總 `analysis_tokens` 產生月度報表，適時調整刷新頻率、模型等級，確保成本與精準度取得平衡。

## 測試方法與測試資料設計

### 1. 單元測試
- `FoodAnalysisCacheService`：以 Jest mock Supabase client，覆蓋 `fetchAnalyses()`（missing/stale/fresh）、`shouldRefreshFoodAnalysis()`（版本/時間邊界）、`incrementUsage()` RPC 失敗重試。
- `IBDWeeklyAnalysisAgent`：mock Supabase 資料集與 `FoodAnalysisCacheService` 回傳值，驗證 `foodKnowledgeBase` 有正確注入 prompt、chunk dataset 也帶著相同子集。

### 2. 整合測試（資料庫 / API）
- 建立 `seed_food_analysis_cache.sql`：插入 2 筆新鮮、1 筆過期、1 筆缺失資料，模擬不同狀態。
- 以 `npm run test:integration` 跑一個針對 `/api/ai/weekly-ibd-analysis` 的測試：mock Anthropic、指定 `FOOD_ANALYSIS_VERSION`，驗證回應包含 `analysis.token_strategy` 與 `foodKnowledgeBase` 的引用。

### 3. 測試資料建議
- 食物樣本：`奶茶`（高風險，高糖 + 乳糖）、`白飯`（supportive）、`泡菜`（中度風險，發酵 + 鹽分）。每筆附上 `nutrition_profile.*`、`risk_profile.triggers`、`serving_guidelines`。
- 飲食紀錄：7 天 x 3 餐 JSON fixture，以 `tests/fixtures/weekly-food-logs.json` 儲存供 agent 測試。
- 症狀紀錄：對應日期的 `DailySymptomEntry` fixture（含嚴重度、keySymptoms、related_food_entries）。

### 4. 驗證步驟
1. 匯入 seed SQL → 跑 `npm run test -- src/lib/ai/weekly-ibd-analysis.test.ts`。
2. 檢查輸出 JSON：`analysis.reasoning_trace` 需引用 food cache 版本資訊；`foods_to_monitor` 引用 `risk_profile` 的描述。
3. 由 CI 記錄快取命中率、缺漏與刷新計數，確保 pipeline 變更不會隱性破壞快取邏輯。

### 5. Queue Worker 與 UI 提示規劃
- **Queue 工作流程**：
  1. Weekly Analysis 在組 payload 時若發現 `missing/stale` 食物，寫入 `food_analysis_refresh_queue`（包含 food_id、版本、原因、priority）。
  2. 背景 Worker（Supabase Edge Function + cron / queue 消費者）定期撈取 queue，呼叫 GPT/Claude 生成新分析並透過 `FoodAnalysisCacheService.upsertAnalysis()` 更新。
  3. Worker 成功後更新 `analysis_version`、`analysis_updated_at`，並紀錄 token 成本到 `ai_usage_events`。
- **UI 提示**：
  - Dashboard 洞察區塊新增「Food Knowledge」提示，若本週分析使用過期資料則顯示黃色 banner：「3 項食物使用舊版快取，刷新中…」。
  - 提供 `Refresh now` 按鈕，僅將 food_id 丟入 queue，實際刷新仍由背景 Worker 處理，確保使用者體驗不被阻塞。
  - 若 queue 有 pending 項目，可在設定頁顯示狀態列表，供使用者查看刷新進度。

### 6. 進一步優化計畫
1. **Knowledge-based weighting**：將 `foodKnowledgeBase` 中的風險標籤與個人症狀關聯進行權重合併，建立 `risk_score = prior * 0.4 + personal_observation * 0.6` 模型，提供更穩定的 foods_to_monitor 排序。
2. **Prompt 壓縮**：將 `supportive_attributes` 與 `risk_profile` 轉換為短代碼（如 `FODMAP_HIGH`、`LACTOSE`），AI 端再對照表解析，可進一步節省 token。
3. **Cache 健康指標**：在 Admin 儀表建立命中率、過期率、queue backlog 等 KPI，異常時自動提醒 DevOps。***
