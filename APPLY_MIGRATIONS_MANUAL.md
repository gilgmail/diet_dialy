# 手動執行 Supabase Migrations

## 需要執行的 SQL 檔案

需要到 Supabase Dashboard SQL Editor 執行以下兩個檔案：

### 1. Auto-Enqueue Trigger
**檔案**: `supabase/migrations/20251117_auto_enqueue_food_analysis.sql`

**說明**: 當新增食物時，自動將其加入 AI 分析佇列

**步驟**:
1. 開啟 Supabase Dashboard: https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto
2. 點選左側 SQL Editor
3. 點選 "New query"
4. 複製貼上整個 SQL 檔案內容
5. 點選 "Run" 執行

### 2. Find Missing Analysis Function
**檔案**: `supabase/migrations/20251117_find_missing_analysis_function.sql`

**說明**: 建立函數來找出所有缺少 AI 分析的食物

**步驟**:
1. 同樣在 SQL Editor 建立新 query
2. 複製貼上整個 SQL 檔案內容
3. 點選 "Run" 執行

## 驗證是否成功

執行以下 SQL 確認函數和 trigger 已建立：

```sql
-- 檢查 trigger 是否存在
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_enqueue_food_analysis';

-- 檢查函數是否存在
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('auto_enqueue_food_analysis', 'find_foods_missing_analysis');

-- 測試 find_foods_missing_analysis 函數
SELECT * FROM find_foods_missing_analysis() LIMIT 5;
```

## Pi 建置完成後

等 Pi 上的 Docker 建置完成後（大約需要 10-15 分鐘），執行：

```bash
# 檢查容器狀態
ssh gilko@10.1.1.85 "docker ps | grep diet-daily-web"

# 查看 logs
ssh gilko@10.1.1.85 "docker logs diet-daily-web --tail 50"

# 測試 API
curl http://gilko.redirectme.net:3000/api/health
```

## 測試流程

1. 執行 SQL migrations（在 Supabase Dashboard）
2. 等待 Pi 建置完成
3. iOS app 測試：
   - 開啟設定頁面
   - 點選 "同步" 按鈕
   - 確認有食物被加入佇列
   - 點選 "處理" 按鈕
   - 等待處理完成
   - 點選 "刷新" 確認狀態

## 預期結果

- **Trigger**: 新增食物時自動加入佇列
- **Sync API**: 可以一次將所有缺失的食物加入佇列
- **iOS 按鈕**:
  - "同步" (綠色): 找出並加入所有缺失的食物
  - "處理" (藍色): 立即執行 Edge Function 處理佇列
  - "刷新" (藍色): 只重新載入狀態，不重新加入佇列
