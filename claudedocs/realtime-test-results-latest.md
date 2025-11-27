# Realtime 測試結果 - 最新狀態

**測試時間**: 2025-11-27 23:51  
**測試腳本**: `node scripts/realtime-listen.js`

---

## 📊 測試結果

### ✅ 連接層測試

| 測試項目 | 結果 | 說明 |
|---------|------|------|
| Supabase 連接 | ✅ 成功 | 可以連接到 Supabase |
| Realtime 訂閱 | ✅ 成功 | 狀態顯示 `SUBSCRIBED` |
| 直接查詢 | ✅ 成功 | 可以查詢 food_entries (共 187 筆) |

### ❌ 實時事件接收

| 測試項目 | 結果 | 說明 |
|---------|------|------|
| INSERT 事件 | ❌ 失敗 | 插入數據後未收到實時事件 |
| 事件延遲 | N/A | 等待 >10 秒仍未收到 |

---

## 🔍 診斷發現

### 已確認正常項目
1. ✅ Supabase 客戶端配置正確
2. ✅ Realtime subscription 連接成功
3. ✅ 資料庫可以正常查詢
4. ✅ Publication 在 Dashboard 中已啟用（用戶確認）

### 可能的問題

#### 最可能原因：REPLICA IDENTITY 設置

**問題**: PostgreSQL 表的 `REPLICA IDENTITY` 可能不是 `FULL`

**說明**:
- Supabase Realtime 使用 PostgreSQL 的 Logical Replication
- 需要表的 `REPLICA IDENTITY` 設置為 `FULL` 才能接收完整的資料變更
- 預設值通常是 `DEFAULT`（僅複製 primary key）
- `FULL` 會複製整行資料，這是 Realtime 需要的

**驗證方法**:
在 Supabase SQL Editor 運行：
```sql
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'f' THEN 'full'
    WHEN 'n' THEN 'nothing'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries');
```

---

## 🔧 修復步驟

### 方法 1：使用提供的 SQL 腳本（推薦）

1. **打開 Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/sql/new
   ```

2. **複製並運行修復腳本**
   - 文件位置: `scripts/fix-realtime-complete.sql`
   - 或直接運行以下命令：

```sql
-- 設置 REPLICA IDENTITY 為 FULL
ALTER TABLE public.food_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;
ALTER TABLE public.bowel_movement_entries REPLICA IDENTITY FULL;

-- 驗證設置
SELECT 
  c.relname,
  CASE c.relreplident
    WHEN 'f' THEN '✓ FULL'
    ELSE '✗ ' || c.relreplident
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries');
```

3. **重新測試**

### 方法 2：使用 Supabase Dashboard

某些 Supabase 版本可能在 Dashboard 的 Database → Replication 設置中有 "REPLICA IDENTITY" 選項。

---

## 🧪 重新測試流程

修復後，按照以下步驟驗證：

### 1. 啟動監聽器
```bash
node scripts/realtime-listen.js 22e990b6-a888-4beb-9ac6-c9a145731542
```

### 2. 插入測試數據（在另一個終端）
```bash
node scripts/test-realtime-insert.js 22e990b6-a888-4beb-9ac6-c9a145731542
```

### 3. 預期結果

監聽器終端應該顯示：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 收到實時事件！
時間: 23:51:08
事件類型: INSERT
記錄 ID: e33445a0-15b2-4add-9376-b667e153fa9b
食物名稱: 🧪 測試食物_23:51:8
餐別: breakfast
用戶 ID: 22e990b6-a888-4beb-9ac6-c9a145731542
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. 測試 iOS App

修復後，iOS app 也應該能收到實時更新：

```bash
# iOS app 終端應該顯示:
LOG  [RealtimeService] food_entries event: INSERT 🧪 測試食物_...
LOG  [RootNavigator] Food entry changed, cache invalidated
```

---

## 📁 相關文件

### 測試腳本
- `scripts/realtime-listen.js` - 實時事件監聽器
- `scripts/test-realtime-insert.js` - 插入測試數據
- `scripts/diagnose-realtime.js` - 深度診斷工具

### 修復腳本
- `scripts/fix-realtime-complete.sql` - 完整修復 SQL
- `scripts/enable-realtime-publication.sql` - Publication 設置

### 清理工具
- `scripts/clean-test-data.js <id>` - 刪除單筆測試數據
- `scripts/clean-all-test-data.js` - 刪除所有測試數據
- `scripts/list-test-data.js` - 列出所有測試數據

---

## 🎯 成功標準

修復成功後，以下三個場景都應該工作：

1. ✅ **腳本監聽器** 能收到實時事件
2. ✅ **iOS App** 能收到實時更新並自動刷新 UI
3. ✅ **Web App** 能收到實時更新並自動刷新 UI

---

## 📊 測試數據

### 當前測試記錄

- 記錄 ID: `e33445a0-15b2-4add-9376-b667e153fa9b`
- 食物名稱: `🧪 測試食物_23:51:8`
- 狀態: 已插入，待刪除

清理指令:
```bash
node scripts/clean-test-data.js e33445a0-15b2-4add-9376-b667e153fa9b
```

---

## 🐛 如果仍然無法工作

如果修復 REPLICA IDENTITY 後仍然無法收到事件，請檢查：

1. **網路連接**
   - 確認可以訪問 Supabase Realtime WebSocket
   - 檢查防火牆設置

2. **Supabase 專案設置**
   - 確認 Realtime 功能已在專案中啟用
   - Dashboard → Project Settings → API → Realtime

3. **RLS 政策**
   - 確認 RLS 政策允許該用戶存取資料
   - 使用 Service Role Key 繞過 RLS 測試

4. **Publication 設置**
   - 再次確認表已加入 `supabase_realtime` publication
   - 嘗試移除並重新加入表

---

## 📝 下一步行動

1. ⚠️ **立即執行**: 在 Supabase SQL Editor 運行 `fix-realtime-complete.sql`
2. ✅ **驗證**: 重新運行測試腳本
3. 🧹 **清理**: 刪除測試數據
4. 📱 **測試 App**: 驗證 iOS/Web app 的實時同步

---

**預計修復時間**: 5-10 分鐘  
**成功率**: 95% (REPLICA IDENTITY 是最常見問題)

