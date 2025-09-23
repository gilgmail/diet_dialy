# SQL Scripts Directory

此資料夾包含所有與台灣食物資料庫相關的SQL檔案。

## 📁 檔案分類

### 🍜 批次匯入檔案 (21個)
- `taiwan_foods_batch_01.sql` ~ `taiwan_foods_batch_21.sql`
- 已清理重複項目，總計959個唯一台灣食物
- 每個批次包含約45-50個食物項目

### 🔄 備份檔案 (15個)
- `taiwan_foods_batch_*_backup.sql`
- 重複清理前的原始檔案備份
- 用於恢復或比較用途

### 🛠️ 管理腳本
- `taiwan_foods_comprehensive_database.sql` - 完整資料庫建立腳本
- `taiwan_foods_database_cleanup.sql` - 一般資料庫清理腳本
- `taiwan_foods_duplicate_cleanup_database.sql` - 重複項目清理腳本
- `cleanup_taiwan_foods.sql` - 簡單清理腳本

## 📊 統計資訊

| 項目 | 數量 |
|------|------|
| 總檔案數 | 51個 |
| 批次檔案 | 21個 |
| 備份檔案 | 26個 |
| 管理腳本 | 4個 |
| 總食物項目 | 959個 |

## 🚀 使用順序

### 1. 初次匯入
```bash
# 依序匯入所有批次
for i in {01..21}; do
  echo "匯入 taiwan_foods_batch_${i}.sql"
done
```

### 2. 清理重複項目
```sql
-- 執行重複清理腳本
\i taiwan_foods_duplicate_cleanup_database.sql
```

### 3. 一般維護
```sql
-- 執行資料庫清理
\i taiwan_foods_database_cleanup.sql
```

## ⚠️ 重要注意事項

1. **備份**: 執行任何清理腳本前請先備份資料庫
2. **順序**: 請按照檔案編號順序匯入批次檔案
3. **測試**: 建議先在測試環境執行
4. **恢復**: 如需恢復，使用對應的 `*_backup.sql` 檔案

## 📈 檔案狀態

- ✅ 所有批次檔案已清理重複項目
- ✅ 備份檔案完整保存
- ✅ 管理腳本已優化
- ✅ 準備就緒可匯入生產環境

---
**最後更新**: 2025-09-22
**狀態**: 重複清理完成，準備匯入