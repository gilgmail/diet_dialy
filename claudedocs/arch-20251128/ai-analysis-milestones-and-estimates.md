# AI 分析里程碑與時間/成本估算（依現況）

本文件根據現有功能/資料表與 Edge Functions 管線，規劃 IBD 飲食日誌 AI 分析的里程碑、交付物、時間與成本估算。所有估算皆為保守區間，實際取決於團隊配置與複雜度。

## 基本假設
- 代碼與資料現況：
  - 已有 `food_entries`、`diet_daily_foods`、`food_analysis_cache`、`food_analysis_refresh_queue`、`daily_symptom_entries`、`bowel_movement_entries` 等表與遷移。
  - 已部署 Edge Function：`supabase/functions/refresh-food-analysis/index.ts`，支援佇列處理與 AI 端點呼叫。
  - Admin 管理頁：`src/app/admin/food-knowledge/page.tsx` 可觀察佇列與快取狀態。
- 團隊配置（可調）：
  - Backend（BE）：1 人，負責 SQL/Migration/Edge Functions
  - Frontend（FE）：0.5 人，負責 Admin 與必要的 App UI
  - AI/Prompt（AI）：0.5 人，負責提示、評估、質量控制
- 時程單位：工作週（每週 5 個工作日）。
- 工時以「人週」標示，也提供「日」估算（1 週 ≈ 5 日）。
- 雲端/AI 成本以「公式 + 範例」呈現，最終依實際供應商費率與用量計算。

## 里程碑總覽 (最新優先順序)

### Phase A – 生活型態與藥物資料完備（優先處理）
1. **A1 藥物記錄升級**（1 週）
   - 擴充 `daily_symptom_entries.medications_taken` 結構或建立 `medication_entries` 表，支援劑量、頻率、變更日期。
   - UI：新增藥物清單、提醒使用者更新用藥變更；Admin 可檢視歷史。
   - 與 M0 資料儀表整合，確保缺漏快顯示。
2. **A2 睡眠與運動時間記錄**（1–1.5 週）
   - 依「睡眠與運動整合策略」實作 S1：新增 `sleep_duration_minutes`, `exercise_duration_minutes`, `exercise_intensity` 等欄位/表。
   - App UI：快捷輸入（slider/快捷按鈕），若有穿戴資料可預留匯入欄位。
   - 建立資料充足度儀表，僅當 ≥60% 日子有填寫時才啟用後續分析。
3. **A3 Reminders & QA**（0.5 週）
   - 通知用戶補資料（藥物/睡眠/運動缺漏 2 日以上）。
   - Admin dashboard 顯示「完整資料使用者數」「缺漏列表」。

> 完成 Phase A 後，才能提供醫生可用的全人資料。也為後續報告/AI 分析提供可靠輸入。預估 2.5–3 週（BE 1.5 週、FE 1 週、AI 0.5 週 for copy）。

### Phase B – 醫師報告與 AI 可選摘要
1. **B1 醫師版日報/週報（1–1.5 週）**
   - SQL 報表整合：飲食覆蓋率、症狀/大便趨勢、藥物變更、睡眠/運動統計。
   - 生成 PDF/網頁報告，可直接分享給醫療團隊（含時序圖 + 關鍵事件）
   - 報告內標註資料充足度，缺漏項目要提示。
2. **B2 AI 協助報告（可選，0.5 週）**
   - 允許在報告底部加上 AI 摘要，但僅在資料達標時開啟，並顯示「由 AI 生成，敬請確認」。
   - Prompt/模板沿用 `refresh-food-analysis` 架構，但 scope 為 `report_summary`。
3. **B3 醫師回饋與整合（0.5 週）**
   - 提供醫師輸入備註/建議的欄位，回寫到使用者日誌。

> Phase B 讓「資料 → 報告」流程先成熟，即使未導入完整 AI，也能交付價值；同時收集醫師意見改進後續模型。預估 2–3 週。

### Phase C – AI 深度導入（沿用既有 M0–M9，但按新順序）
- C1：建立個人化基線 + 單餐/每日分析（對應舊 M1–M5）。
- C2：飲食×症狀關聯與週報（舊 M6–M7），資料已包含藥物/睡眠/運動，可做多變量分析。
- C3：習慣變動分析 + 通知（舊 M8–M9），利用 Phase A/B 的事件與報告資料。
- 以上每階段仍需 AI/Prompt Ops 參與，但因 Phase A/B 已確保資料完整，AI 導入可專注在摘要與因果敘述，而非補資料。

> Phase C 所需時間仍約 6–8 週，但可視資源並行；建議 Phase A/B 完成後立即啟動。

### 圖示化概覽
```
A1 ─▶ A2 ─▶ A3 ─▶ B1 ─▶ B2 ─▶ B3 ─▶ C1 ─▶ C2 ─▶ C3
│藥物 │睡眠 │提醒 │醫師 │AI 報 │回饋 │AI Bas│關聯 │習慣
│記錄 │運動 │QA   │報告 │告摘要│整合 │eline│週報 │通知

（原 M0–M9 地圖保留於附錄，供後續 Phase C 詳細拆解。）
```

### 附錄：原 M0–M9 詳細拆解

| 里程碑 | 代表功能 | 可行性 | 主要依賴 |
| --- | --- | --- | --- |
| M0 | 資料覆蓋率儀表、缺漏提醒基礎 | ✅ 高：SQL 與現有表即可 | `food_entries`, `daily_symptom_entries` |
| M1 | IBD 個人化基線、風險分級模板 | ✅ 高：擴充 `user_settings` | 既有 migrations + Admin |
| M2 | 單食物 AI 分析一致化、佇列監控 | ✅ 高：延伸 `refresh-food-analysis` | refresh queue + cache |
| M3 | 單餐營養均衡/風險卡片 | ⚠️ 中：需餐次聚合與模板 | M0 視圖 + M1 基線 |
| M4 | 症狀/大便 → 健康指標 | ✅ 中高：演算法 + 視覺化 | `daily_symptom_entries`, `bowel_movement_entries` |
| M5 | 每日飲食摘要、缺口/風險 | ⚠️ 中：需 M3 完成 + AI 摘要 | M3 輸出 + AI 模板 |
| M6 | 飲食×症狀短期關聯、觸發警示 | ⚠️ 中：統計/樣本控制 | M4 指標 + M0/M3 聚合 |
| M7 | 每週趨勢、建議與分享 | ✅ 中高：定期批次 + 摘要 | M5/M6 結果 |
| M8 | 飲食習慣變動 vs 症狀改善 | ⚠️ 中：需新事件表與 pre/post 模型 | M4–M6 完整資料 |
| M9 | 通知與資料充足度回饋 | ✅ 高：以現有提醒流程擴充 | M0 指標 + Admin |

> ✅ = 高；⚠️ = 需注意依賴或資料量；里程碑越往後依賴越多，建議保持前段穩定後再推進。

1) M0 基礎就緒與資料品質儀表（0.5–1 週）
- 交付物：
  - 資料檢查 SQL/報表：連續日誌覆蓋率、缺漏天數、食物/症狀記錄密度。
  - Admin 顯示「資料充足度」與提醒條件。
  - 若缺少營養彙總視圖，建立每日/餐次營養彙總（materialized view 或 ETL）。
- 依賴：既有 `food_entries`、`daily_symptom_entries`。
- 工時：BE 2–3 日、FE 1 日、AI 0.5 日。
- 成本：僅 SQL/存取，雲端增量極低。

2) M1 IBD 個人化基線與風險框架（1–1.5 週）
- 交付物：
  - 基線 Schema/設定（若需要）：如 `user_settings` 擴充（IBD 型別、常見誘因、目標營養）。
  - AI 規則/提示模板：將 IBD 基線納入各分析的上下文，產生個人化敘述與風險分級。
  - Admin 檢視與手動覆寫基線。
- 依賴：`20250106_create_user_settings.sql`（若已存在則擴充）。
- 工時：BE 3–4 日、FE 1 日、AI 1–2 日。
- 成本：少量 AI Token 用於樣稿與迭代。

3) M2 單一食物 AI 分析 v2（1–1.5 週）
- 交付物：
  - 提升 `refresh-food-analysis` 輸出格式一致性（風險/建議/營養缺口欄位齊全）。
  - 新增測試資料與自動找缺失分析的函式（已存在 `20251117_find_missing_analysis_function.sql` 可沿用）。
  - Admin 提供重跑與差異比對（版本欄位/更新時間排程）。
- 依賴：既有 queue + cache。
- 工時：BE 3–4 日、FE 1 日、AI 1 日。
- 成本（AI 使用）：
  - 公式：每日花費 ≈ `分析次數/日 × 平均 tokens × 單位費率`。
  - 範例：若每日新/更新食物 200 件、每件 2,000 tokens、費率 $0.002/1K tokens → 約 $0.80/日。

4) M3 單餐分析（均衡度/營養充分/即時風險）（1.5–2 週）
- 交付物：
  - 餐次聚合（依時間窗聚合 `food_entries` → 宏量、纖維、鈉、刺激性標籤）。
  - 規則 + AI 輔助產生「均衡度分數」與「即時風險」。
  - 前端呈現餐次卡片（分數、缺口、建議）。
- 依賴：M0 的營養彙總；M1 的個人化基線。
- 工時：BE 4–5 日、FE 2 日、AI 2 日。
- 成本：以規則引擎為主，AI 僅摘要，成本低。

5) M4 症狀 & 大便狀態 → 健康狀態定位（1–1.5 週）
- 交付物：
  - 演算法將 `daily_symptom_entries` + `bowel_movement_entries` 轉為「日健康指標」（合成 0–100 或 5 級）。
  - 缺漏與異常數據處理（連續缺漏、突增）。
  - Admin 視覺化趨勢與原始點位。
- 依賴：既有症狀/大便表與欄位。
- 工時：BE 3–4 日、FE 1 日、AI 1 日。
- 成本：無顯著 AI 成本。

6) M5 每日飲食分析（均衡 vs. 風險食物）（1–1.5 週）
- 交付物：
  - 將單餐聚合為每日分數；輸出「關鍵缺口」「高風險出現」清單。
  - AI 產生當日摘要與可執行建議（可重用 M2/M3 模板）。
  - Admin 與 App 顯示「今日評語 + 建議」。
- 依賴：M3 完成；M1 基線。
- 工時：BE 3–4 日、FE 1–2 日、AI 1 日。
- 成本：摘要性 AI，依日活用量線性增加。

7) M6 飲食 × 症狀關聯（短期觸發偵測）（2–3 週）
- 交付物：
  - 窗口內（例如 T+48h）食物/標籤與症狀變化的簡化統計關聯（移動視窗、閾值）。
  - 假陽性控制（最低樣本天數、Benjamini–Hochberg 類型多重比較控制可先省略）。
  - 產出關聯卡片（關聯方向、強度、資料充足度/信心）。
- 依賴：M4 健康指標；M0/M3 聚合。
- 工時：BE 6–8 日、FE 3–4 日、AI 2 日。
- 成本：主要在批次計算；AI 僅敘述，成本低。

8) M7 每週/趨勢分析與飲食改善建議（1.5–2 週）
- 交付物：
  - 週報：分數趨勢、波動、最佳/最差日、上週 vs 本週改善率。
  - 個人化建議與「下週嘗試」清單；一鍵分享醫療團隊。
  - Admin 匯出/審核。
- 依賴：M5/M6 完成。
- 工時：BE 3–4 日、FE 2 日、AI 1–2 日。
- 成本：摘要性 AI；每週 1 次/人，成本非常低。

9) M8 飲食習慣變動 → 症狀改善（pre/post）（2–3 週）
- 交付物：
  - 新表/機制 `diet_change_events`（或擴充現有 patterns）：來源（使用者/系統偵測）、開始日期、假說標籤。
  - pre/post 視窗差異、effect size、信心分數；干擾因素提示（藥物/壓力/睡眠）。
  - AI 產出因果謹慎敘述與下一步建議；前端事件卡片。
- 依賴：參考 `claudedocs/diet-habit-change-symptom-improvement-feasibility.md`；M4–M6 完成度高較佳。
- 工時：BE 6–8 日、FE 3–4 日、AI 3–4 日。
- 成本：分析為 SQL/視圖，AI 只做解讀；成本中等。

10) M9 通知/提醒與資料充足度回饋（0.5–1 週）
- 交付物：
  - 缺漏提醒（連 3 天無症狀或飲食紀錄）；事件確認/撤銷流程。
  - 報告分享與「醫師備註」欄位（可後續迭代）。
- 依賴：M0；可並行於 M5–M8。
- 工時：BE 2–3 日、FE 1–2 日、AI 0.5 日。
- 成本：低。

> 粗略總時程（串行、1×BE/0.5×FE/0.5×AI）：約 10–14 週。可並行縮短至 6–9 週（風險：整合/迭代成本增加）。

## 睡眠與運動整合策略（先有初版再擴充）
- **S0 – 初版（即可上線）**：沿用 `daily_symptom_entries` 既有欄位 `sleep_quality`, `energy_level`, `activity_level`，在 M4/M5 健康指標與每日分析中顯示「主觀睡眠品質」與「活動量」對當日分數的影響，先提供觀察點與 AI 敘事。
- **S1 – 進階手動輸入**：在 App/Admin 新增睡眠時數與運動分鐘欄位（例如 `sleep_duration_minutes`, `exercise_duration_minutes`），寫入 `daily_symptom_entries` 或新 `wellness_metrics` 表。確保輸入體驗、驗證與缺漏提醒就緒後，再納入分析。
- **S2 – 擴充資料來源**：串接穿戴裝置、Apple Health、Google Fit 或 CSV 匯入，透過 background job 將原始資料轉為日層級統計（總時數、強度、心率負荷）。
- **S3 – 分析/AI 升級**：當 S1/S2 資料回填後，將睡眠/運動指標納入 M6/M8（關聯、pre/post）模型，回答「改善睡眠/運動是否與症狀改善相關」。
- **節奏控制**：每階段皆遵循「先交付可見初版 → 再新增欄位/資料來源 → 最後擴充 AI 功能與數據」的原則，避免因資料尚未充足導致整體延遲。

## 成本估算（可調參數）

1) 工程人力（範例）
- BE：$X/日 × 合計開發日
- FE：$Y/日 × 合計開發日
- AI/Prompt：$Z/日 × 合計開發日
- 以 M0–M9 合計（中位數）約：
  - BE ~ 35–45 日、FE ~ 14–18 日、AI ~ 12–16 日。

2) AI API Token 成本（公式）
- 成本/日 ≈ `請求數 × 平均 tokens × (費率/1K)`
- 範例 A（低量）：
  - 食物分析 100 次/日 × 2,000 tokens × $0.002/1K ≈ $0.40/日
  - 每日摘要 50 次/日 × 800 tokens × $0.002/1K ≈ $0.08/日
  - 合計 ≈ $0.48/日（$15/月）
- 範例 B（中量）：
  - 食物分析 500 次/日 × 2,000 tokens × $0.002/1K ≈ $2.00/日
  - 每日摘要 200 次/日 × 800 tokens × $0.002/1K ≈ $0.32/日
  - 合計 ≈ $2.32/日（$70/月）
- 每人每月（示意）：假設每位活躍使用者每日 1 次個人化摘要（1,200 tokens：輸入 700 + 輸出 500）與每週 1 次週報（2,000 tokens），則每月 token ≈ `(1,200 × 30) + (2,000 × 4)` = 44,000 tokens ≈ 44 × 1K tokens。以 $0.002/1K tokens 為例約 $0.088/人/月；若採高階模型 $0.01/1K tokens，約 $0.44/人/月。
- 食物重跑或事件分析可額外估算；建議為每位使用者設定「每月 token 上限」並在 Admin 顯示預估用量，避免成本失控。
> 請用實際供應商費率替換 `$0.002/1K` 與實際 token 平均值。

3) Supabase/基礎設施
- 以當前 Schema/函式為主，新增物化檢視與排程更新；成本主因為資料量與排程頻率。
- 建議先以 15–30 分鐘批次跑關聯與週報，觀察負載再調整。

## 風險與緩解
- 資料稀疏/不規律 → 顯示資料充足度、設定最小樣本門檻；提醒用戶補記錄。
- 關聯誤判 → 顯示信心水平與可解釋特徵；允許使用者確認/撤銷。
- 成本超標 → 先規則化、後摘要化；AI 批次離線生成、結果快取；限流與分級刷新。
- 整合複雜度 → 每個里程碑明確輸入/輸出 schema，提供 Admin 檢核畫面與回滾策略。
- Token 額度不足 → 過去曾遇到 token 不足導致分析中斷；需為 `food_analysis_refresh_queue` 加入「預估 token」欄位、呼叫前檢查供應商餘額、設定低餘額告警並在必要時降級模型/暫停非關鍵工作，同時保留重試與人工補齊流程。

## 建議排程（最小可用路線）
- 波段 1（2–3 週）：M0 → M1 → M2（強化單食物分析與資料品質）
- 波段 2（3–4 週）：M3 → M5（單餐/每日評語落地）
- 波段 3（3–4 週）：M4 → M6 → M7（健康指標、關聯、週報）
- 波段 4（2–3 週）：M8 → M9（習慣變動與通知）

## 相關檔案參考（落地點）
- Edge Functions：`supabase/functions/refresh-food-analysis/index.ts`
- Admin：`src/app/admin/food-knowledge/page.tsx`
- Schema：
  - `supabase/migrations/000_initial_schema.sql`
  - `supabase/migrations/001_daily_symptom_tracking.sql`
  - `supabase/migrations/007_add_bowel_movement_fields.sql`
  - `supabase/migrations/008_create_bowel_movement_entries.sql`
  - `supabase/migrations/20251109_create_food_analysis_cache.sql`
  - `supabase/migrations/20251110_create_food_analysis_refresh_queue.sql`
  - `supabase/migrations/20251117_find_missing_analysis_function.sql`
- 補充可行性：`claudedocs/diet-habit-change-symptom-improvement-feasibility.md`
