# 台灣1000種食物匯入指南
# Taiwan 1000 Foods Import Guide

## 🚨 匯入失敗原因

批量匯入腳本失敗是因為Supabase的Row Level Security (RLS)政策阻止了資料插入。最安全的方式是直接在Supabase Dashboard執行SQL檔案。

## 🎯 推薦匯入方式

### 方法1: Supabase Dashboard SQL Editor (推薦)

1. **登入Supabase Dashboard**
   ```
   https://supabase.com/dashboard/projects
   ```

2. **進入您的專案**
   - 選擇 diet-daily 專案
   - 點擊左側選單的 "SQL Editor"

3. **執行SQL檔案**
   ```sql
   -- 複製並貼上以下檔案內容到SQL Editor：
   taiwan_1000_foods_database.sql
   ```

4. **點擊 "Run" 執行**
   - 等待執行完成 (約1-2分鐘)
   - 檢查是否有錯誤訊息

### 方法2: 分段執行 (如果檔案太大)

如果完整SQL檔案太大，可以分段執行：

1. **先執行Schema更新**
   ```sql
   -- 確保資料表有所有必要欄位
   ALTER TABLE diet_daily_foods ADD COLUMN IF NOT EXISTS authenticity_verified BOOLEAN DEFAULT FALSE;
   ```

2. **分批插入資料** (每次100-200筆)
   - 複製SQL檔案的前200個INSERT語句
   - 執行並確認成功
   - 繼續下一批

### 方法3: 使用psql指令 (進階用戶)

如果您有PostgreSQL客戶端：

```bash
# 使用psql連接並執行SQL檔案
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f taiwan_1000_foods_database.sql
```

## 📊 驗證匯入結果

執行匯入後，使用以下SQL驗證：

```sql
-- 檢查台灣食物總數
SELECT COUNT(*) as total_taiwan_foods
FROM diet_daily_foods
WHERE taiwan_origin = true;

-- 按分類統計
SELECT
    category,
    COUNT(*) as food_count,
    verification_status
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY category, verification_status
ORDER BY food_count DESC;

-- 檢查是否有問題食物
SELECT name, verification_status, verification_notes
FROM diet_daily_foods
WHERE taiwan_origin = true
  AND verification_status IN ('flagged_non_taiwan', 'needs_correction');
```

預期結果：
- **總計**: 1,020種台灣食物
- **分類**: 13個不同分類
- **狀態**: 大部分為 'admin_approved'

## 🔧 如果遇到問題

### 常見錯誤與解決方案

#### 1. "Column does not exist" 錯誤
```sql
-- 先執行Schema更新
ALTER TABLE diet_daily_foods
ADD COLUMN IF NOT EXISTS authenticity_verified BOOLEAN DEFAULT FALSE;
```

#### 2. "Duplicate key value" 錯誤
```sql
-- 清理重複資料
DELETE FROM diet_daily_foods a USING diet_daily_foods b
WHERE a.id < b.id
  AND a.name = b.name
  AND a.taiwan_origin = true;
```

#### 3. "Row Level Security" 錯誤
- 需要在Supabase Dashboard執行
- 或暫時停用RLS：`ALTER TABLE diet_daily_foods DISABLE ROW LEVEL SECURITY;`

### 回復方案

如果匯入出現問題，可以清理並重新開始：

```sql
-- 清理台灣食物資料 (保留原有的基礎資料)
DELETE FROM diet_daily_foods
WHERE taiwan_origin = true
  AND created_at > '2025-09-22';

-- 重新執行匯入
```

## 📋 匯入後處理

### 1. 執行真實性清理
```sql
-- 執行authenticity cleanup
\i taiwan_foods_database_cleanup.sql
```

### 2. 更新索引
```sql
-- 重建索引以提升效能
REINDEX TABLE diet_daily_foods;
```

### 3. 更新統計資料
```sql
-- 更新查詢優化器統計
ANALYZE diet_daily_foods;
```

## 🎉 匯入成功確認

執行匯入後，您應該看到：

✅ **1,020種台灣食物** 成功匯入
✅ **13個食物分類** 完整覆蓋
✅ **多疾病評分** 全部就緒
✅ **營養資訊** 完整準確

### 測試查詢

```sql
-- 測試多疾病搜尋
SELECT name, category, condition_scores->'ibd'->>'general_safety' as ibd_score
FROM diet_daily_foods
WHERE taiwan_origin = true
  AND (condition_scores->'ibd'->>'general_safety')::int >= 4
LIMIT 10;

-- 測試台灣特色食物
SELECT name, category, tags
FROM diet_daily_foods
WHERE taiwan_origin = true
  AND category IN ('夜市小吃', '傳統點心', '地方特色')
LIMIT 10;
```

## 💡 後續建議

1. **在前端整合** - 使用 `MultiConditionFoodsService` 查詢台灣食物
2. **建立搜尋功能** - 支援中文名稱模糊搜尋
3. **加入篩選器** - 按分類、疾病適宜性篩選
4. **建立推薦系統** - 基於患者檔案推薦台灣食物

---

**如果您按照方法1在Supabase Dashboard執行，應該可以成功匯入所有1,020種台灣食物！**