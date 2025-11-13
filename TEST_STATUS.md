# 測試狀態報告

## 測試資料更新

### 更新內容
已更新 `supabase/seed_test_data_v2.sql`，新增：
1. **修正 diet_daily_foods 欄位** - 雲端資料庫 `category` 為 NOT NULL，已補回 category 和 updated_at 欄位
2. **新增 food_entries 測試資料** - 為測試用戶 (e7c62e70-7e95-40e3-84c6-f27c84ede44e) 在測試日期範圍 (2024-11-06 ~ 2024-11-12) 建立 8 筆飲食記錄

### 測試資料明細

#### Food Entries (食物攝取記錄)
| 日期 | 時間 | 餐次 | 食物 | 快取狀態 |
|------|------|------|------|---------|
| 2024-11-07 | 07:30 | 早餐 | SEED_白飯 | ✅ 正常 (2天前) |
| 2024-11-07 | 07:30 | 早餐 | SEED_雞胸肉 | ❌ 過期 (45天前) |
| 2024-11-07 | 12:00 | 午餐 | SEED_白飯 | ✅ 正常 (2天前) |
| 2024-11-07 | 12:00 | 午餐 | SEED_青花菜 | ⚠️ 即將過期 (25天前) |
| 2024-11-08 | 08:00 | 早餐 | SEED_香蕉 | ❌ 無快取 |
| 2024-11-09 | 12:30 | 午餐 | SEED_白飯 | ✅ 正常 (2天前) |
| 2024-11-09 | 12:30 | 午餐 | SEED_雞胸肉 | ❌ 過期 (45天前) |
| 2024-11-09 | 12:30 | 午餐 | SEED_青花菜 | ⚠️ 即將過期 (25天前) |
| 2024-11-10 | 18:00 | 晚餐 | SEED_雞胸肉 | ❌ 過期 (45天前) |

總計：**8 筆食物記錄**，涵蓋 4 種不同快取狀態的測試食物

## 需要執行的操作

### 0. ✅ 測試用戶 ID 已更新
**當前測試用戶 ID：** `153d4a58-8406-4304-b5b1-1fd9ee433aa6`

此 ID 已在 `seed_test_data_v2.sql` 中更新，可以直接使用。

### 1. 檢查表結構（如果遇到 category NOT NULL 錯誤）
如果執行 SQL 時出現 `category violates not-null constraint` 錯誤，請先執行：

```sql
-- 檢查 diet_daily_foods 表結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'diet_daily_foods'
ORDER BY ordinal_position;
```

如果發現 `category` 欄位的 `is_nullable = 'NO'` 但沒有 default 值，可能需要手動設置：

```sql
-- 暫時移除 NOT NULL 約束（如果需要）
ALTER TABLE diet_daily_foods ALTER COLUMN category DROP NOT NULL;
```

### 2. 在 Supabase Studio 執行更新的 SQL
```bash
# 檔案位置
supabase/seed_test_data_v2.sql
```

**執行步驟：**
1. 開啟 Supabase Studio → SQL Editor
2. 複製整個 `seed_test_data_v2.sql` 內容
3. 貼上並執行
4. 確認執行成功（應該會有 BEGIN, DELETE, INSERT, COMMIT 輸出）

**如果還是失敗，嘗試分段執行：**
```sql
-- 步驟 1: 只清理資料
BEGIN;
DELETE FROM food_analysis_refresh_queue
WHERE food_id IN (
  'aaaa1111-2222-3333-4444-555555555501',
  'aaaa1111-2222-3333-4444-555555555502',
  'aaaa1111-2222-3333-4444-555555555503',
  'aaaa1111-2222-3333-4444-555555555504'
);
DELETE FROM food_analysis_cache WHERE food_id IN (...);
DELETE FROM food_entries WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6' AND food_name LIKE 'SEED_%';
DELETE FROM diet_daily_foods WHERE name LIKE 'SEED_%';
COMMIT;

-- 步驟 2: 手動插入單一食物測試
INSERT INTO diet_daily_foods (id, name, category, created_at, updated_at)
VALUES ('aaaa1111-2222-3333-4444-555555555501', 'SEED_白飯', 'staple', NOW(), NOW());

-- 如果成功，再執行完整的 seed_test_data_v2.sql
```

### 2. 驗證資料
執行後可以用以下查詢驗證：

```sql
-- 檢查食物記錄數量
SELECT COUNT(*) FROM food_entries
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
  AND consumed_at BETWEEN '2024-11-06' AND '2024-11-13'
  AND food_name LIKE 'SEED_%';
-- 預期結果: 8

-- 檢查測試食物
SELECT name FROM diet_daily_foods WHERE name LIKE 'SEED_%';
-- 預期結果: SEED_白飯, SEED_雞胸肉, SEED_青花菜, SEED_香蕉

-- 檢查快取記錄
SELECT food_id, analysis_version,
       EXTRACT(DAY FROM (NOW() - analysis_updated_at)) as days_old
FROM food_analysis_cache
WHERE food_id IN (
  SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%'
);
-- 預期結果: 3 筆 (白飯 2天, 雞胸肉 45天, 青花菜 25天)

-- 檢查刷新佇列
SELECT f.name, q.reason, q.status
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON q.food_id = f.id
WHERE f.name LIKE 'SEED_%';
-- 預期結果: 2 筆 (香蕉 missing, 雞胸肉 stale)
```

## API 測試

### 當前測試結果
**API 端點：** `POST /api/ai/weekly-ibd-analysis`

**測試參數：**
```json
{
  "userId": "153d4a58-8406-4304-b5b1-1fd9ee433aa6",
  "startDate": "2024-11-06",
  "endDate": "2024-11-12"
}
```

**當前狀態：** ❌ 失敗
- **錯誤原因：** 資料不足 (0 筆飲食記錄)
- **原因：** 尚未執行包含 food_entries 的更新 SQL

**預期結果（執行 SQL 後）：**
- ✅ 成功找到 8 筆飲食記錄
- ✅ 偵測到 2 個缺失/過期快取項目 (香蕉、雞胸肉)
- ✅ API 回應包含：
  - `analysis.food_knowledge.missingFoods: ["SEED_香蕉"]`
  - `analysis.food_knowledge.staleFoods: ["SEED_雞胸肉"]`
  - `analysisStatus.foodKnowledge` 狀態資訊
  - `token_strategy.warnings` 包含快取提示

## 下一步測試項目

### 執行 SQL 後
1. ✅ 重新測試 Weekly AI Analysis API
2. ⏳ 測試 Food Knowledge Status API
   ```bash
   GET /api/food-knowledge/status?userId=153d4a58-8406-4304-b5b1-1fd9ee433aa6
   ```
3. ⏳ 測試 Food Knowledge Refresh API
   ```bash
   POST /api/food-knowledge/refresh
   Body: { "userId": "...", "foodIds": [...] }
   ```
4. ⏳ 驗證 Mobile UI 整合 (可選)

### 測試通過後
- Commit 更新的測試資料
- 標記測試完成

## 檔案變更

### 已修改
- [supabase/seed_test_data_v2.sql](supabase/seed_test_data_v2.sql:36) - 新增 food_entries 測試資料

### 待驗證
所有檔案變更需要在測試通過後 commit。
