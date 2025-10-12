# 台灣食物資料庫分批匯入指南

## 📋 執行步驟

您需要在Supabase Dashboard的SQL Editor中按順序執行以下21個檔案：

### 第1批 (50種食物)
1. 複製 `taiwan_foods_batch_01.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第1批已完成"
5. 繼續下一批

### 第2批 (50種食物)
1. 複製 `taiwan_foods_batch_02.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第2批已完成"
5. 繼續下一批

### 第3批 (50種食物)
1. 複製 `taiwan_foods_batch_03.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第3批已完成"
5. 繼續下一批

### 第4批 (50種食物)
1. 複製 `taiwan_foods_batch_04.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第4批已完成"
5. 繼續下一批

### 第5批 (50種食物)
1. 複製 `taiwan_foods_batch_05.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第5批已完成"
5. 繼續下一批

### 第6批 (50種食物)
1. 複製 `taiwan_foods_batch_06.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第6批已完成"
5. 繼續下一批

### 第7批 (50種食物)
1. 複製 `taiwan_foods_batch_07.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第7批已完成"
5. 繼續下一批

### 第8批 (50種食物)
1. 複製 `taiwan_foods_batch_08.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第8批已完成"
5. 繼續下一批

### 第9批 (50種食物)
1. 複製 `taiwan_foods_batch_09.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第9批已完成"
5. 繼續下一批

### 第10批 (50種食物)
1. 複製 `taiwan_foods_batch_10.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第10批已完成"
5. 繼續下一批

### 第11批 (50種食物)
1. 複製 `taiwan_foods_batch_11.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第11批已完成"
5. 繼續下一批

### 第12批 (50種食物)
1. 複製 `taiwan_foods_batch_12.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第12批已完成"
5. 繼續下一批

### 第13批 (50種食物)
1. 複製 `taiwan_foods_batch_13.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第13批已完成"
5. 繼續下一批

### 第14批 (50種食物)
1. 複製 `taiwan_foods_batch_14.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第14批已完成"
5. 繼續下一批

### 第15批 (50種食物)
1. 複製 `taiwan_foods_batch_15.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第15批已完成"
5. 繼續下一批

### 第16批 (50種食物)
1. 複製 `taiwan_foods_batch_16.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第16批已完成"
5. 繼續下一批

### 第17批 (50種食物)
1. 複製 `taiwan_foods_batch_17.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第17批已完成"
5. 繼續下一批

### 第18批 (50種食物)
1. 複製 `taiwan_foods_batch_18.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第18批已完成"
5. 繼續下一批

### 第19批 (50種食物)
1. 複製 `taiwan_foods_batch_19.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第19批已完成"
5. 繼續下一批

### 第20批 (50種食物)
1. 複製 `taiwan_foods_batch_20.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第20批已完成"
5. 繼續下一批

### 第21批 (19種食物)
1. 複製 `taiwan_foods_batch_21.sql` 的內容
2. 貼上到Supabase SQL Editor
3. 點擊 "Run" 執行
4. 確認顯示 "第21批已完成"
5. 繼續下一批

## ✅ 驗證完成

執行所有批次後，運行以下查詢驗證：

```sql
-- 檢查總數
SELECT COUNT(*) as total_taiwan_foods
FROM diet_daily_foods
WHERE taiwan_origin = true;
-- 應該顯示: 1019 (實際食物數量)

-- 按分類統計
SELECT category, COUNT(*) as count
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY category
ORDER BY count DESC;
```

## 🚨 如果遇到錯誤

- **欄位不存在**: 先執行schema建立語句
- **重複插入**: 清理後重新執行該批次
- **權限問題**: 確保在Supabase Dashboard執行

完成所有批次後，您將擁有完整的台灣1000種食物資料庫！
