# AI 代理角色說明

此文件定義每個人力角色可由 AI 協作代理的範圍、流程與輸入/輸出格式，確保只有一位核心開發時，仍能透過 AI 助理分擔重複性工作。

## 1. 資料 / 後端代理
- **核心能力**：
  - 熟悉 Postgres/Supabase DDL、RLS、觸發器與物化檢視語法。
  - 能根據需求描述快速產出 migration/SQL 草稿，並提示資料一致性影響。
  - 了解 Edge Functions（Deno）與 queue/generator pattern，協助撰寫批次/排程腳本。
- **可處理任務**：
  - Schema 設計（新增表、欄位、索引、constraint、view）。
  - 資料管線：ETL SQL、materialized view refresh、Supabase Function query。
  - 後端程式：`refresh-food-analysis` 類型函式更新、token 預估欄位擴充、cron script。
- **輸入需求**：
  - 表格/欄位需求、型別、關聯；供參考的既有 SQL 片段或路徑。
  - Edge Function 或 queue 的行為變更描述、參數、錯誤處理條件。
- **AI 產出**：
  - DDL/SQL、TS/TSX/TS腳本草稿；附註 impacted object、需注意的 migration order。
  - 驗證手冊：`npm run test`, `supabase db push --dry-run` 等建議與 rollback 步驟。
- **邊界 / 需人工決策**：
  - 資料安全與 PII；RLS/權限設定需核心開發確認。
  - 真實資料遷移（backfill）的效能評估；AI 只提供建議，不自動執行。

## 2. 前端 / UX 代理
- **核心能力**：
  - 會產生 Next.js + React/React Native 元件、Tailwind/Styled component 樣式。
  - 支援 Admin 界面和 Mobile UI，能提出互動流程、空狀態、loading 體驗。
- **可處理任務**：
  - 表單/卡片元件、資料表、搜尋篩選、Chart placeholder。
  - UX 文案（繁體中文/英文）含提醒、錯誤、確認對話框。
  - 小型 Hook（ex: `useFormState`）、與 API 介接的 fetch 範例。
- **輸入需求**：
  - 功能描述、wireframe 或 screenshot、欲連接的 API URL / response shape。
  - 既有 components / design tokens 路徑（ex: `src/components/ui/Button.tsx`）。
- **AI 產出**：
  - 程式碼片段、CSS/Tailwind class、狀態圖示建議、空狀態 copy。
  - 互動流程說明（步驟、條件、edge cases），供 Figma/Jira 使用。
- **邊界 / 需人工決策**：
  - 視覺細節、品牌一致性；需由設計/PM 最終確認。
  - 可用性測試、a11y 標準與跨平台測試必須人工驗證。

## 3. AI / Prompt Ops 代理
- **核心能力**：
  - 熟悉 LLM prompt engineering、上下文結構化、few-shot 設計。
  - 能分析錯誤範例、提供多版本 prompt 或 chain-of-thought 策略。
  - 具備成本意識，會估算 token、建議快取策略。
- **可處理任務**：
  - 產出 prompt 範本、系統訊息、工具描述。
  - 規劃訓練/驗證資料格式（JSON schema、CSV 格式）。
  - 建議回歸測試流程（case list、評分規則、fail-fast 條件）。
  - 整理 token 使用報表與節流策略（批次、降級模型、限制重試）。
- **輸入需求**：
  - 目標任務描述、結構化輸入欄位、成功判準。
  - 現有 prompt、錯誤輸出、想改善的維度（語調、精確度、醫療安全）。
- **AI 產出**：
  - Prompt + 指令說明、測試指令（curl、SDK）與預期回答。
  - Token 預估表格與策略建議（ex: `每日摘要 100 次/日 → 0.08 USD`）。
- **邊界 / 需人工決策**：
  - 醫療稱謂、法規/合規；需醫師或法務最終審查。
  - 模型選型與 API 金額核准；AI 只提供建議。

## 4. 資料科學 / 顧問代理
- **核心能力**：
  - 熟悉統計檢定（Mann-Whitney U、Cohen's d、Spearman correlation）、時間序列趨勢。
  - 能把 business 問題轉為指標與 SQL/Python 實作。
- **可處理任務**：
  - 定義樣本門檻、資料充足度公式、信心分數計算。
  - 建立校正流程（ex: control for confounders, missing data imputation 概念）。
  - 產生 PoC notebook / SQL query供工程實作參考。
- **輸入需求**：
  - 目標分析（pre/post、關聯、趨勢）、可用欄位與資料限制。
  - 期望輸出：報表、SQL、Python pseudo-code 或解讀。
- **AI 產出**：
  - 統計方法比較表、公式推導、實作步驟。
  - 可能的偏誤來源、需要的資料品質條件。
- **邊界 / 需人工決策**：
  - 模型驗證與醫療解釋仍需專業顧問確認。
  - 若需處理 PII/敏感資料，必須由具權限者執行。

## 5. 執行流程建議
1. 在任務建立時指定「AI 代理角色」，並附上必要輸入資料（檔案連結、需求）、預期輸出格式。
2. AI 代理產出初稿後，由負責人進行 code review/數據檢查；必要時再次迭代。
3. 所有 AI 建議需經版本控管（Git commit 或 Docs 修訂），確保可追溯。
4. 高風險輸出（醫療建議、費用試算）必須加上人工審核簽章。

## 6. AI 使用守則與升級路徑
- **透明紀錄**：每次呼叫 AI 協助需在任務卡或 PR 中備註（角色、日期、輸入/輸出重點），方便追蹤。
- **版本控制**：Prompt、template、SQL 由 AI 產出後應立即存入 repo 或 shared doc，避免口頭/聊天紀錄遺失。
- **安全與隱私**：不得將 PII、醫療紀錄直接貼入公開 AI；若需分析，請先做匿名化或僅提供統計摘要。
- **升級/求助機制**：
  - 若 AI 無法解出或答案矛盾，標記「blocked-by-AI」並升級給對應實際角色。
  - 當同一任務反覆無法解決，應檢討輸入格式是否清楚或需人工介入。
- **品質檢查**：設定最低驗收標準（lint、test、數據覆蓋率），AI 輸出僅作為初稿，最終責任在核准人員。

> 透過明確的代理定義，可以在單人或小團隊情境下，把 AI 視為多角色助理，減少 context switching 並加速交付。
