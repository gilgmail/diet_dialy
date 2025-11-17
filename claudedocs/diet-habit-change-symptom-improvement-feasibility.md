# 飲食習慣變動與症狀改善關聯：可行性評估

## TL;DR
- **可行但需先補齊事件標記與資料品質**：已有 `food_entries` 與 `daily_symptom_entries` 基礎資料，足以做趨勢分析，但缺「飲食習慣變動事件」標記與餐次營養指標，否則 AI 只能做推測。
- **建議三階段落地**：① 儀表層面蒐集（使用者自報、AI 推測、醫師標記）② SQL/Edge Functions 做 pre/post 差異計算與顯著性評估③ 由既有 AI 分析管線（`refresh-food-analysis` + Admin page）生成自然語言與提醒。
- **風險主要在資料稀疏與誤判**：需要資料可信度、信心分數與提醒使用者補充記錄，並設計 fail-safe（如沒有足夠樣本就提示「資料不足」）。

---

## 背景與產品目標
IBD 使用者常需反覆嘗試飲食調整（減少乳製品、增加可溶性纖維等）以觀察症狀是否改善。現有 AI 食物分析偏向單次餐點或單品風險說明，缺乏「在做出 A 改變後，症狀有沒有改善」的長期回饋。新功能要回答：

1. **習慣層級**：例如「最近 2 週大幅降低辣椒攝取」，系統能標記並追蹤。
2. **症狀趨勢**：比較變動前後的腹痛、腹瀉、血便、Bristol stool、整體健康分數。
3. **可信度評估**：標示樣本天數、症狀變異幅度、潛在干擾因素（藥物、壓力、睡眠）。

## 成功條件與量測
- **資料層**：90% 飲食記錄至少含食物名稱＋餐次時間；70% 症狀日誌有連續 7 天資料。
- **分析層**：能產出 pre/post 差異（平均、變異、趨勢方向）與統計信心（例如 Mann-Whitney U 或簡化的 effect size）。
- **產品層**：使用者能清楚看到「改變 → 結果 → 建議」鏈結，並可分享給醫療團隊。

## 現有資料與缺口

### 食物 / 飲食資料
- ✅ `food_entries`：具 user_id、食物、份量文字、時間戳記，可做餐次聚合。
- ✅ `diet_daily_foods` + `food_analysis_cache`：已有 AI 針對單品產出營養與風險評估，可引用做「此習慣屬於哪類營養變動」。
- ⚠️ 缺少「飲食習慣事件」表（如使用者勾選「開始低 FODMAP」），需新增表格或在 `user_settings` / `user_journal_events` 記錄。
- ⚠️ 無標準化宏量/微量計算：需建 ETL 將 `food_entries` + `diet_daily_foods` 萃取成日/週層級統計（蛋白質、纖維、脂肪、刺激性標籤等）。

### 症狀 / 腸胃資料
- ✅ `daily_symptom_entries`：含 overall_health、腹痛、腹瀉、血便、脹氣、附註、相關食物。
- ✅ `bowel_movement_entries`（007-010 系列 migration）：提供 Bristol stool、血便細節，可合併評估。
- ✅ `symptom_patterns` / `symptom_food_correlations`：可作為存放趨勢與關聯的既有架構。
- ⚠️ 需要缺漏檢查與自動補齊提醒（若 3 天無紀錄，需要 UI 推播，確保分析窗口內資料足夠）。

### AI / Pipeline
- ✅ Edge Function `supabase/functions/refresh-food-analysis` 已建立 AI 呼叫流程，可擴充為「habit change insight」新端點，沿用 queue + cache 模型。
- ⚠️ 目前僅針對單一食物。若要推論「飲食習慣」，需新增 `habit_analysis_cache` 或擴增現有 `food_analysis_cache` schema（例如新增 `analysis_scope = 'habit'`、`time_window` 等欄位）。

## 整體流程建議
1. **定義習慣變動事件**
   - 使用者自訂（UI：在某餐或設定頁標記「開始嘗試 XX 飲食」）。
   - 系統偵測：當 7 天內某類食物攝取量下降 60% 以上、或 AI 偵測關鍵字（如多蔬菜、少乳製品）。
   - 寫入 `diet_change_events`（建議新表 `id, user_id, label, detection_method, start_date, hypothesis_tags`）。

2. **pre/post 視窗建模**
   - 預設使用 ±7 天（可依資料量動態調整）。
   - SQL 產出各症狀平均值、標準差、極值、missing day count。
   - 計算 effect size（(mean_post - mean_pre) / pooled_std）與信心水平（輸出 0-1）。

3. **干擾因素控制**
   - 從 `medications_taken`, `sleep_quality`, `stress_level` 等欄位判斷是否同時計畫其他變因。
   - 若變因過多，回報「可能因其他因素影響，建議繼續觀察」。

4. **AI 解讀與建議**
   - 將 SQL 結果 + 重要事件餵給 AI（類似現有刷新流程）產出自然語言：改善幅度、症狀、風險、下一步建議。
   - 產出 tokens 須控制，可設定摘要模板並讓 AI 只補足 contextual 建議。

5. **前端呈現**
   - 每個事件一張卡片，顯示：變動描述、症狀趨勢（迷你圖）、信心指標、建議行動。
   - 提供「回報結果」按鈕，收集主觀感受以改進模型。

## 實作路線圖
| 階段 | 內容 | 主要交付物 |
| --- | --- | --- |
| Phase 0 – 需求對齊 | 定義習慣類型 taxonomy、事件檢測規則、UI wireframe | 批准的 PRD、Figma、migration 草稿 |
| Phase 1 – 資料儀表 | 建立 `diet_change_events`（或擴充 `symptom_patterns`）、新增記錄 UI、排程檢查 missing data | Migration、API/Hook、Reminders |
| Phase 2 – 分析引擎 | 寫計算 SQL / Supabase Function，產出 pre/post 統計與 effect size；新增 cache 表 | `habit_analysis_cache`、雲端函式、測試 SQL |
| Phase 3 – AI & UX | 串既有 `refresh-food-analysis` pipeline 或新增 `refresh-habit-analysis`；前端卡片與分享報告 | Edge function、Admin 與 App UI、copywriting |

## 風險、成本與緩解
- **資料稀疏 / 不規律**：導致統計噪音。→ 設定最少 5 天資料門檻，並顯示資料充足度條。
- **習慣偵測誤差**：AI 誤判短期波動。→ 允許使用者確認或刪除事件；提供 undo。
- **運算成本**：長期使用者可能有大量窗口。→ 使用物化檢視或 cache 表，僅在資料變動時更新。
- **法規與醫療責任**：需明確聲明非醫療診斷，並允許使用者分享給醫師評估。

## 推薦下一步
1. 與產品／醫師顧問對齊「習慣變動定義」及必備資料欄位，規劃 `diet_change_events` schema。
2. 建立 PoC SQL（以 `food_entries` + `daily_symptom_entries`）跑歷史資料，驗證是否能得出足夠樣本。
3. 決定 AI 端點策略：沿用 `refresh-food-analysis`（加 scope 參數）或新增專用 Edge Function。
4. 規劃提醒與 UI 通知，確保資料持續輸入，否則分析結果將無法產出。
