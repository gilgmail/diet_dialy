# 🚀 測試資料準備完成

## ✅ 已解決的所有問題

### 問題 #1: category NOT NULL 約束
- **錯誤：** `null value in column "category" violates not-null constraint`
- **解決：** 加回 category 和 updated_at 欄位，並設置正確的類別值

### 問題 #2: 用戶 ID 外鍵約束
- **錯誤：** `violates foreign key constraint "food_entries_user_id_fkey"`
- **解決：** 使用真實存在的用戶 ID: `153d4a58-8406-4304-b5b1-1fd9ee433aa6`

### 問題 #3: 缺少 food_entries 測試資料
- **錯誤：** API 回傳 0 筆飲食記錄
- **解決：** 新增 8 筆 food_entries 測試資料

## 📁 準備就緒的檔案

### 主要測試資料
✅ **[supabase/seed_test_data_v2.sql](supabase/seed_test_data_v2.sql)**
- 完整的測試資料 SQL
- 包含用戶驗證邏輯
- 使用正確的用戶 ID
- 可以直接執行

### 測試指南
✅ **[TEST_STATUS.md](TEST_STATUS.md)**
- 完整的測試步驟說明
- 資料驗證 SQL 查詢
- API 測試參數
- 疑難排解指南

### 輔助工具
✅ **[find_user_id.sql](find_user_id.sql)** - 查找有效用戶 ID（已不需要）
✅ **[check_table_structure.sql](check_table_structure.sql)** - 檢查表結構（可選）

## 🎯 立即執行步驟

### 1. 執行測試資料 SQL
```bash
# 在 Supabase Studio SQL Editor 中：
# 1. 開啟 seed_test_data_v2.sql
# 2. 複製全部內容
# 3. 貼上並執行
# 4. 確認輸出包含 "✅ 測試用戶已確認存在"
```

### 2. 驗證資料載入
```sql
-- 應該回傳 8
SELECT COUNT(*) FROM food_entries
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
  AND consumed_at BETWEEN '2024-11-06' AND '2024-11-13'
  AND food_name LIKE 'SEED_%';

-- 應該回傳 4 筆食物
SELECT name FROM diet_daily_foods WHERE name LIKE 'SEED_%';

-- 應該回傳 3 筆快取
SELECT COUNT(*) FROM food_analysis_cache
WHERE food_id IN (SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%');

-- 應該回傳 2 筆佇列項目
SELECT COUNT(*) FROM food_analysis_refresh_queue
WHERE food_id IN (SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%');
```

### 3. 測試 API
```bash
curl -X POST https://gilko.redirectme.net/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "153d4a58-8406-4304-b5b1-1fd9ee433aa6",
    "startDate": "2024-11-06",
    "endDate": "2024-11-12"
  }'
```

### 4. 預期結果
- ✅ API 成功回應（不再是 0 筆記錄錯誤）
- ✅ 找到 8 筆飲食記錄
- ✅ 偵測到缺失/過期的快取：
  - `missingFoods`: ["SEED_香蕉"]
  - `staleFoods`: ["SEED_雞胸肉"]
- ✅ 回應包含 `food_knowledge` 狀態資訊

## 📊 測試資料概覽

### 食物 & 快取狀態
| 食物 | 類別 | 快取狀態 | 攝取次數 | 測試目的 |
|------|------|----------|----------|----------|
| SEED_白飯 | staple | ✅ 正常 (2天前) | 3次 | 正常快取 |
| SEED_雞胸肉 | protein | ❌ 過期 (45天前) | 4次 | 過期快取偵測 |
| SEED_青花菜 | vegetable | ⚠️ 即將過期 (25天前) | 2次 | 快過期提示 |
| SEED_香蕉 | fruit | ❌ 無快取 | 1次 | 缺失快取偵測 |

### 飲食記錄時間表
- **2024-11-07** 早餐: 白飯 + 雞胸肉
- **2024-11-07** 午餐: 白飯 + 青花菜
- **2024-11-08** 早餐: 香蕉（無快取測試）
- **2024-11-09** 午餐: 白飯 + 雞胸肉 + 青花菜
- **2024-11-10** 晚餐: 雞胸肉

**總計：** 8 筆記錄，涵蓋 4 天，4 種食物，4 種快取狀態

## 🔧 如果遇到問題

### 執行失敗
1. 檢查錯誤訊息
2. 參考 [TEST_STATUS.md](TEST_STATUS.md) 的疑難排解章節
3. 嘗試分段執行（先清理，再插入）

### API 測試失敗
1. 確認資料已成功載入（執行驗證 SQL）
2. 檢查 API 錯誤訊息
3. 確認用戶 ID 正確

### 需要清理測試資料
```sql
-- 快速清理所有測試資料
DELETE FROM food_analysis_refresh_queue
WHERE food_id IN (SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%');

DELETE FROM food_analysis_cache
WHERE food_id IN (SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%');

DELETE FROM food_entries
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
  AND food_name LIKE 'SEED_%';

DELETE FROM diet_daily_foods WHERE name LIKE 'SEED_%';
```

## 📝 Commit 記錄

所有改進已提交到 Git：
- ✅ test: add food_entries to test data for API testing
- ✅ fix: add category field back to diet_daily_foods insert
- ✅ fix: improve test data SQL with conflict handling
- ✅ fix: handle auth.users foreign key constraint
- ✅ feat: update test data with valid user ID

**準備就緒！現在可以執行測試資料並驗證 API 功能了！** 🎉
