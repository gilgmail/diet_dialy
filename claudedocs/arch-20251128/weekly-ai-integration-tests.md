# Weekly AI Analysis Integration Tests

本文件提供針對「一週 AI 分析 + 食物知識庫快取」的整合測試流程，確保 API、佇列、Edge Function 與前端 UI 能協同運作。

## 1. 測試環境準備
1. 匯入最新資料表
   ```bash
   supabase db reset
   supabase db push
   ```
2. 匯入測試用食物與快取資料
   ```bash
   psql $SUPABASE_DB_URL -f tests/fixtures/seed_food_analysis_cache.sql
   ```
3. 啟動 Next.js / Expo / Supabase Local：
   ```bash
   npm run dev
   supabase start
   ```

## 2. 端到端流程
1. 透過 `POST /api/ai/weekly-ibd-analysis` 觸發分析，確認回傳 JSON 內含：
   - `analysis.food_knowledge.missingFoods` / `staleFoods`
   - `analysisStatus.foodKnowledge`
   - `token_strategy.warnings` 提示快取狀態
2. 查詢 `GET /api/food-knowledge/status?userId=<uid>`，確認缺資料/過期食物已出現在佇列摘要。
3. 呼叫 Edge Function：
   ```bash
   supabase functions serve refresh-food-analysis
   curl -X POST http://127.0.0.1:54321/functions/v1/refresh-food-analysis
   ```
   驗證 `food_analysis_cache` 已更新，佇列 `status` 變為 `completed`。
4. 重新開啟 Dashboard / Settings（或透過 `useDashboard` hook 重新載入）：
   - Dashboard 出現提醒 banner，顯示缺資料/過期項數。
   - Settings 頁中的「AI 食物知識庫」區塊同步顯示佇列進度，並可手動觸發刷新。

## 3. Mock 與自動化建議
- 若需避免實際呼叫 Edge Function，可在 Jest 中 mock `fetch` 指向 `refresh-food-analysis`，檢查佇列狀態變更。
- 建議新增 Playwright 測試腳本：
  1. 造訪 Dashboard 檢查 banner。
  2. 點擊「前往設定」→ 驗證 Settings 區塊顯示待更新項目。
  3. 點擊「立即刷新」→ Mock API 回傳成功 → 驗證提醒消失。

## 4. Debug Checklist
- `food_analysis_refresh_queue` 是否存在 `pending` 條目？
- `supabase/functions/refresh-food-analysis` 是否取得 `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`？
- API 是否回傳 `analysisStatus.foodKnowledge`？如無，確認 `IBDWeeklyAnalysisAgent` 是否有產生 `food_knowledge`。
- Dashboard `useDashboard` hook 是否最新？如仍無 banner，請清除 Expo cache 再試。

## 5. 雲端環境備註
- 目前以 **雲端 Supabase 專案** 為主，允許直接在該環境放入測試資料（food_analysis_cache、queue 等），方便團隊共享。可透過 `clone_supabase_project.sh` 腳本把現有 schema/data 遷移到新專案，未來再評估是否切回本機環境或 Pi 測試。
- 若需清理測試資料，可先備份後直接在雲端執行 `truncate food_analysis_cache cascade; truncate food_analysis_refresh_queue cascade;`，或重新部署一個 staging 專案。

### 範例環境變數（取自 `.env`）
- REST / API Base：`NEXT_PUBLIC_API_URL="https://gilko.redirectme.net"`  
  呼叫 `https://gilko.redirectme.net/api/...` 即可對雲端 Supabase 專案發 requests。
- Database URL：  
  `DATABASE_URL="postgresql://postgres:uuLBq4S4MpsArwYL@db.lbjeyvvierxcnrytuvto.supabase.co:5432/postgres"`  
  可用於 `supabase db pull/push --db-url "$DATABASE_URL"` 或 `psql "$DATABASE_URL" -f seed.sql`。

> 若要針對這個雲端專案執行 integration test：  
> 1. 設定 `OLD_DB_URL`/`NEW_DB_URL`（若要建立 staging 複本）。  
> 2. 在 `.env.local` 或部署環境中同步更新 `NEXT_PUBLIC_API_URL`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。  
> 3. 測試資料可直接寫入雲端資料庫；完成後再用上述 SQL 或 `clone_supabase_project.sh` 清理/搬遷。***
