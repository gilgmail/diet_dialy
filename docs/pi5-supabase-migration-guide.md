# Pi5 Supabase Migration 同步指南

## 📋 重要說明

### ❌ 不需要搬移 API Keys

**本地 Supabase 和生產環境是兩個獨立的實例**：

- **生產環境**: `https://lbjeyvvierxcnrytuvto.supabase.co`
  - 有自己的 API keys（在 Dashboard 中管理）
  - 用於生產環境

- **Pi5 本地**: `https://gilko.redirectme.net/supabase`
  - 有自己的 API keys（自動生成）
  - 用於開發和測試

**Pi5 本地 API Keys**（已自動生成）：
```bash
# Publishable Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# Secret Key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

### ✅ 需要同步 Migrations

雖然 API keys 不需要搬移，但**資料庫結構（migrations）需要同步**，這樣本地和生產環境的資料庫結構才會一致。

---

## 🔄 同步 Migrations

### 方法 1: 使用自動同步腳本（推薦）

```bash
# 從項目根目錄運行
./scripts/sync-migrations-to-pi5.sh
```

這個腳本會：
1. ✅ 檢查本地 migrations
2. ✅ 備份 Pi5 上的現有 migrations
3. ✅ 同步所有 migrations 到 Pi5
4. ✅ 可選：立即套用 migrations

### 方法 2: 手動同步

```bash
# 1. 同步 migrations
rsync -avz supabase/migrations/*.sql \
  gilko@10.1.1.85:~/diet_dialy/supabase/migrations/

# 2. SSH 到 Pi5 並套用
ssh gilko@10.1.1.85
cd ~/diet_dialy
supabase db reset
```

### 方法 3: 使用 Git 同步

如果 Pi5 上的代碼是通過 Git 同步的：

```bash
# 在 Pi5 上
ssh gilko@10.1.1.85
cd ~/diet_dialy
git pull
supabase db reset
```

---

## 📊 當前狀態

### 本地 Migrations

```bash
# 查看本地 migrations
ls -la supabase/migrations/*.sql | wc -l
# 應該有 39 個 migrations
```

### Pi5 Migrations

```bash
# 查看 Pi5 上的 migrations
ssh gilko@10.1.1.85 "cd ~/diet_dialy && ls -la supabase/migrations/*.sql | wc -l"
# 目前只有 1 個基礎 migration (000_initial_schema.sql)
```

---

## 🚀 完整設置流程

### 步驟 1: 同步 Migrations

```bash
./scripts/sync-migrations-to-pi5.sh
```

### 步驟 2: 驗證 Migrations 已套用

```bash
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase migration list"
```

### 步驟 3: 檢查資料庫結構

```bash
ssh gilko@10.1.1.85 << 'EOF'
cd ~/diet_dialy
supabase db execute -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
"
EOF
```

### 步驟 4: 啟用 Realtime（如果需要）

```bash
ssh gilko@10.1.1.85 << 'EOF'
cd ~/diet_dialy
supabase db execute << 'SQL'
-- 啟用 food_entries 的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;

-- 啟用 daily_symptom_entries 的 Realtime（如果表存在）
ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
SQL
EOF
```

### 步驟 5: 運行測試

```bash
# 更新環境變數（如果還沒更新）
./scripts/update-env-for-pi5-supabase.sh

# 運行 Realtime 測試
node scripts/test-realtime-sync.js <user_id>
```

---

## 🔍 驗證設置

### 檢查 API Keys

```bash
# Pi5 本地 keys（不需要從生產環境搬移）
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase status | grep -E 'anon key|service_role key'"
```

### 檢查資料庫結構

```bash
# 比較本地和 Pi5 的表結構
ssh gilko@10.1.1.85 << 'EOF'
cd ~/diet_dialy
supabase db execute -c "
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('food_entries', 'daily_symptom_entries')
ORDER BY table_name, ordinal_position;
"
EOF
```

### 檢查 Realtime 設置

```bash
ssh gilko@10.1.1.85 << 'EOF'
cd ~/diet_dialy
supabase db execute -c "
SELECT tablename 
FROM pg_publication_tables 
WHERE tablename IN ('food_entries', 'daily_symptom_entries');
"
EOF
```

---

## ⚠️ 注意事項

1. **API Keys 獨立**: 本地和生產環境的 API keys 是獨立的，不需要同步
2. **資料庫結構同步**: 使用 migrations 同步資料庫結構
3. **測試數據**: 如果需要測試數據，可以運行 seed 腳本
4. **備份**: 同步前會自動備份 Pi5 上的現有 migrations

---

## 🐛 故障排除

### 問題 1: Migration 失敗

```bash
# 查看錯誤詳情
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase db reset --debug"

# 恢復備份
ssh gilko@10.1.1.85 "cd ~/diet_dialy && ls -la supabase/migrations/backup_*/"
```

### 問題 2: 表不存在

```bash
# 檢查 migrations 是否已套用
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase migration list"

# 手動套用特定 migration
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase db push"
```

---

**最後更新**: 2025-11-27
**相關文檔**: 
- [Pi5 Supabase Setup](./pi5-supabase-setup.md)
- [Pi5 Supabase HTTPS Setup](./pi5-supabase-https-setup.md)

