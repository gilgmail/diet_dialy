# 部署 Supabase Edge Function 指南

## 問題

iOS App 顯示錯誤：
```
WARN [FoodKnowledgeService] processor trigger failed: 404
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

**原因**: `refresh-food-analysis` Edge Function 尚未部署到 Supabase。

## 解決方案

### 方法 1: 使用 Supabase CLI（推薦）

#### 步驟 1: 安裝/更新 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或更新現有版本
brew upgrade supabase
```

#### 步驟 2: 登入 Supabase

```bash
cd supabase
npx supabase login
```

這會開啟瀏覽器進行授權。

#### 步驟 3: Link 專案

```bash
# 使用互動式選擇
npx supabase link

# 或直接指定專案 ref
npx supabase link --project-ref YOUR_PROJECT_REF
```

**如何找到 PROJECT_REF**:
1. 開啟 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇你的專案
3. 專案 URL 格式: `https://YOUR_PROJECT_REF.supabase.co`
4. 或在 Settings → API → Project URL 查看

#### 步驟 4: 部署 Function

```bash
npx supabase functions deploy refresh-food-analysis
```

**預期輸出**:
```
Deploying function (custom)...
Created new function refresh-food-analysis on project YOUR_PROJECT_REF
version: 1
  ✓ Deployed function refresh-food-analysis (0.5s)

  Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-food-analysis
```

#### 步驟 5: 設定環境變數

```bash
# 設定 function 所需的環境變數
npx supabase secrets set \
  FOOD_ANALYSIS_VERSION=queue-auto \
  FOOD_ANALYSIS_MAX_BATCH=5
```

#### 步驟 6: 驗證部署

```bash
# 測試 function
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**預期回應**:
```json
{
  "success": true,
  "processed": 0
}
```
（如果沒有待處理項目）

---

### 方法 2: 使用 Supabase Dashboard 手動部署

#### 步驟 1: 建立 Function

1. 開啟 https://supabase.com/dashboard
2. 選擇你的專案
3. 左側選單 → Edge Functions
4. 點擊「Create a new function」
5. Function name: `refresh-food-analysis`
6. 點擊「Create function」

#### 步驟 2: 上傳程式碼

複製 [`supabase/functions/refresh-food-analysis/index.ts`](../supabase/functions/refresh-food-analysis/index.ts) 的內容到編輯器：

```typescript
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const defaultVersion = Deno.env.get('FOOD_ANALYSIS_VERSION') ?? 'queue-auto'
const MAX_BATCH = Number(Deno.env.get('FOOD_ANALYSIS_MAX_BATCH') ?? '5')

// ... 完整程式碼見原始檔案
```

#### 步驟 3: 設定環境變數

在 Edge Functions 頁面：
1. 選擇 `refresh-food-analysis` function
2. 點擊「Settings」或「Configure」
3. 新增環境變數：
   - `FOOD_ANALYSIS_VERSION` = `queue-auto`
   - `FOOD_ANALYSIS_MAX_BATCH` = `5`

#### 步驟 4: 部署

1. 點擊「Deploy」按鈕
2. 等待部署完成
3. 記錄 Function URL

---

## 驗證部署成功

### 測試 1: 使用 curl

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 測試 2: 從 iOS App

1. 開啟 iOS App
2. 進入「設定」頁面
3. 滾動到「AI 食物知識庫」
4. 點擊「立即處理」按鈕

**預期結果**:
- 如果有待處理項目: 「成功處理了 X 個項目」
- 如果沒有項目: 「目前沒有待處理的項目」

### 測試 3: 檢查 Logs

在 Supabase Dashboard:
1. Edge Functions → refresh-food-analysis
2. 點擊「Logs」或「Invocations」
3. 查看最近的執行記錄

---

## 故障排除

### 錯誤 1: 404 NOT_FOUND

**原因**: Function 尚未部署
**解決**: 按照上述步驟部署 function

### 錯誤 2: 401 Unauthorized

**原因**: Authorization header 不正確
**解決**: 確認使用正確的 `ANON_KEY`

```typescript
// 檢查 mobile app 的環境變數
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 錯誤 3: 500 Internal Server Error

**可能原因**:
1. 環境變數未設定
2. Supabase 權限問題
3. Function 程式碼錯誤

**解決方法**:
1. 檢查 Edge Function logs
2. 確認 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 已自動注入
3. 確認資料表權限正確

### 錯誤 4: Timeout

**原因**: Function 執行時間過長
**解決**: 減少 `FOOD_ANALYSIS_MAX_BATCH` 值

---

## Function 環境變數說明

### 自動注入（由 Supabase 提供）

- `SUPABASE_URL` - 專案 URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key（完整權限）

### 需要手動設定

- `FOOD_ANALYSIS_VERSION` (可選) - 分析版本標籤，預設 `queue-auto`
- `FOOD_ANALYSIS_MAX_BATCH` (可選) - 每次處理的最大項目數，預設 `5`

**建議值**:
```
FOOD_ANALYSIS_VERSION=queue-auto
FOOD_ANALYSIS_MAX_BATCH=5
```

---

## 設定自動執行（可選）

部署成功後，可以設定 pg_cron 定時執行：

```sql
-- 在 Supabase SQL Editor 執行
SELECT cron.schedule(
  'process-food-analysis-queue',
  '*/10 * * * *',  -- 每 10 分鐘執行一次
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings', true)::json->>'supabase_url' || '/functions/v1/refresh-food-analysis',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings', true)::json->>'anon_key',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**注意**: 需要 Supabase Pro 方案才能使用 pg_cron。

---

## 檢查部署狀態

### CLI 方式

```bash
cd supabase
npx supabase functions list
```

**預期輸出**:
```
┌────────────────────────┬──────────┬─────────┬─────────────────┐
│ NAME                   │ STATUS   │ VERSION │ UPDATED AT      │
├────────────────────────┼──────────┼─────────┼─────────────────┤
│ refresh-food-analysis  │ ACTIVE   │ 1       │ 2025-11-13 ... │
└────────────────────────┴──────────┴─────────┴─────────────────┘
```

### Dashboard 方式

1. 開啟 Supabase Dashboard
2. Edge Functions
3. 應該看到 `refresh-food-analysis` 顯示為 "Active"

---

## 部署後測試流程

### 完整測試

1. **建立測試資料**:
   ```sql
   -- 在 Supabase SQL Editor 執行
   INSERT INTO food_analysis_refresh_queue (food_id, reason, status, priority)
   VALUES
     ('test-food-1', 'missing', 'pending', 9),
     ('test-food-2', 'stale', 'pending', 5);
   ```

2. **觸發 Function**（使用任一方式）:
   - iOS App: 點擊「立即處理」
   - 或 curl:
     ```bash
     curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-food-analysis" \
       -H "Authorization: Bearer YOUR_ANON_KEY" \
       -d '{}'
     ```

3. **驗證結果**:
   ```sql
   SELECT * FROM food_analysis_refresh_queue
   WHERE food_id IN ('test-food-1', 'test-food-2');
   ```

   應該看到 `status` 變成 `completed` 或 `failed`（如果食物不存在）。

4. **清理測試資料**:
   ```sql
   DELETE FROM food_analysis_refresh_queue
   WHERE food_id IN ('test-food-1', 'test-food-2');
   ```

---

## 相關檔案

- [Edge Function 原始碼](../supabase/functions/refresh-food-analysis/index.ts)
- [使用指南](./food-knowledge-manual-processor-guide.md)
- [系統設計文件](./food-knowledge-system-design.md)

## 總結

✅ **部署完成後**:
- iOS App 可以成功觸發處理器
- 佇列項目會被自動處理
- 食物分析快取會被更新

📝 **記得**:
- 部署後測試 function 可正常運作
- 考慮設定 pg_cron 自動執行
- 監控 function logs 確保無錯誤
