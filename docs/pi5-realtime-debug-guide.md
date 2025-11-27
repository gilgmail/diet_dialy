# Pi5 Supabase Realtime Debug 指南

## 🎯 為什麼在 Pi5 上 Debug Realtime？

### 優勢

1. **完整的日誌訪問**
   - 可以直接查看 Supabase Realtime 服務的日誌
   - 可以檢查資料庫觸發器和函數
   - 可以監控 WebSocket 連接狀態

2. **完全控制配置**
   - 可以修改 Realtime 配置
   - 可以啟用/禁用特定表的 Realtime
   - 可以調整 Realtime 參數

3. **更快的調試循環**
   - 本地連接，無網路延遲
   - 可以快速重啟服務
   - 可以快速重置資料庫

4. **隔離測試環境**
   - 不影響生產環境
   - 可以隨意測試和修改
   - 可以快速恢復狀態

---

## 📋 Pi5 Supabase 配置

### 當前設置

根據 `docs/pi5-supabase-setup.md`：

- **API URL**: `http://10.1.1.85:54321`
- **Studio URL**: `http://10.1.1.85:54323`
- **PostgreSQL**: `postgresql://postgres:postgres@10.1.1.85:54322/postgres`

### API Keys

```bash
# Publishable Key (前端可用)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# Secret Key (僅後端使用)
SUPABASE_SECRET_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

---

## 🔧 設置本地開發環境

### 步驟 1: 更新 .env.local

在項目根目錄的 `.env.local` 文件中：

```bash
# 使用 Pi5 的 Supabase（本地開發）
NEXT_PUBLIC_SUPABASE_URL=http://10.1.1.85:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# 註釋掉遠端 Supabase（如果需要切換）
# NEXT_PUBLIC_SUPABASE_URL=https://lbjeyvvierxcnrytuvto.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 步驟 2: 確保 Pi5 Supabase 運行

```bash
# SSH 到 Pi5
ssh gilko@10.1.1.85

# 檢查 Supabase 狀態
cd ~/diet_dialy
supabase status

# 如果未運行，啟動它
supabase start
```

### 步驟 3: 驗證連接

```bash
# 從本地機器測試
curl http://10.1.1.85:54321/rest/v1/

# 應該返回 API 資訊
```

---

## 🐛 Realtime Debug 步驟

### 1. 檢查 Realtime 服務狀態

在 Pi5 上：

```bash
# SSH 到 Pi5
ssh gilko@10.1.1.85

# 查看 Supabase 服務狀態
cd ~/diet_dialy
supabase status

# 查看 Realtime 服務日誌
docker compose -f ~/.supabase/docker-compose.yml logs realtime -f
```

### 2. 檢查資料表 Realtime 設置

在 Pi5 上連接到資料庫：

```bash
# 連接到 PostgreSQL
psql postgresql://postgres:postgres@localhost:54322/postgres

# 檢查 food_entries 表的 Realtime 設置
SELECT 
  schemaname,
  tablename,
  attname as column_name
FROM pg_publication_tables
WHERE tablename IN ('food_entries', 'daily_symptom_entries');

# 如果沒有結果，表示表未啟用 Realtime
# 需要啟用：
ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
```

### 3. 查看 Realtime 連接

```bash
# 在 Pi5 上查看 Realtime 連接數
docker compose -f ~/.supabase/docker-compose.yml exec postgres psql -U postgres -c "
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity
WHERE application_name LIKE '%realtime%';
"
```

### 4. 監控 Realtime 事件

```bash
# 在 Pi5 上實時查看 Realtime 日誌
docker compose -f ~/.supabase/docker-compose.yml logs -f realtime

# 或查看所有 Supabase 服務日誌
docker compose -f ~/.supabase/docker-compose.yml logs -f
```

### 5. 測試 Realtime 功能

使用本地測試腳本：

```bash
# 在本地機器上運行（使用 Pi5 的 Supabase）
node scripts/test-realtime-sync.js <user_id>
```

---

## 🔍 常見問題排查

### 問題 1: Realtime 事件未收到

**檢查步驟**:

1. **確認表已啟用 Realtime**:
```sql
-- 在 Pi5 的 PostgreSQL 中執行
SELECT * FROM pg_publication_tables 
WHERE tablename IN ('food_entries', 'daily_symptom_entries');
```

2. **如果沒有結果，啟用 Realtime**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
```

3. **檢查 Realtime 服務日誌**:
```bash
docker compose -f ~/.supabase/docker-compose.yml logs realtime | tail -50
```

### 問題 2: Subscription 無法連接

**檢查步驟**:

1. **確認 Realtime 服務運行**:
```bash
supabase status
# 應該看到 realtime 服務是 "healthy"
```

2. **檢查防火牆**:
```bash
# 在 Pi5 上
sudo ufw status
# 確保 port 54321 開放
```

3. **測試連接**:
```bash
# 從本地機器
curl http://10.1.1.85:54321/rest/v1/
```

### 問題 3: RLS 政策問題

**檢查步驟**:

1. **查看 RLS 政策**:
```sql
-- 在 Pi5 的 PostgreSQL 中
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('food_entries', 'daily_symptom_entries');
```

2. **測試 RLS**:
```sql
-- 以特定用戶身份測試
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "your-user-id"}';
SELECT * FROM food_entries; -- 應該只看到該用戶的資料
```

---

## 🛠️ 實用命令

### 在 Pi5 上

```bash
# 查看所有 Supabase 服務狀態
supabase status

# 重啟 Supabase 服務
supabase stop && supabase start

# 查看 Realtime 日誌
docker compose -f ~/.supabase/docker-compose.yml logs realtime -f

# 查看資料庫日誌
docker compose -f ~/.supabase/docker-compose.yml logs postgres -f

# 重置資料庫（清空資料並重新套用 migrations）
supabase db reset

# 連接到資料庫
psql postgresql://postgres:postgres@localhost:54322/postgres
```

### 在本地機器上

```bash
# 測試 Pi5 Supabase 連接
curl http://10.1.1.85:54321/rest/v1/

# 運行 Realtime 測試（使用 Pi5 的 Supabase）
node scripts/test-realtime-sync.js <user_id>

# 檢查配置
node scripts/check-env-config.js
```

---

## 📊 監控和調試工具

### Supabase Studio

訪問 Pi5 的 Supabase Studio：

```
http://10.1.1.85:54323
```

功能：
- 查看資料表
- 執行 SQL 查詢
- 查看 API 文檔
- 檢查認證用戶
- 查看日誌

### 直接資料庫查詢

```sql
-- 查看 Realtime 連接
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%realtime%';

-- 查看最近的事件（如果有事件日誌表）
SELECT * FROM realtime_events ORDER BY created_at DESC LIMIT 10;

-- 檢查表的 Realtime 設置
SELECT * FROM pg_publication_tables WHERE tablename = 'food_entries';
```

---

## 🎯 Debug Realtime 的最佳實踐

1. **使用 Pi5 Supabase 進行開發和測試**
   - 更快的調試循環
   - 完整的日誌訪問
   - 不影響生產環境

2. **使用生產 Supabase 進行最終驗證**
   - 確保配置與生產一致
   - 測試真實網路環境
   - 驗證性能

3. **逐步排查**
   - 先確認基本連接
   - 再檢查 Realtime 配置
   - 最後測試事件傳遞

---

## 📝 快速切換腳本

創建一個腳本來快速切換 Supabase 配置：

```bash
#!/bin/bash
# scripts/switch-to-pi5-supabase.sh

echo "🔄 切換到 Pi5 Supabase..."

# 備份當前配置
cp .env.local .env.local.backup

# 更新配置
sed -i.bak 's|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=http://10.1.1.85:54321|' .env.local
sed -i.bak 's|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH|' .env.local
sed -i.bak 's|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz|' .env.local

echo "✅ 已切換到 Pi5 Supabase"
echo "📝 運行測試: node scripts/test-realtime-sync.js <user_id>"
```

---

**最後更新**: 2025-01-12
**相關文檔**: 
- [Pi5 Supabase Setup](../docs/pi5-supabase-setup.md)
- [Realtime Sync Testing](../claudedocs/REALTIME_SYNC_TESTING.md)

