# Pi 5 Supabase 本地測試環境設置完成

## 📋 安裝摘要

已成功在 Raspberry Pi 5 (10.1.1.85) 上完成 Supabase 本地開發環境安裝。

## ✅ 已安裝組件

- ✅ Docker: 26.1.5
- ✅ Docker Compose: v2.40.3
- ✅ Supabase CLI: 2.58.5
- ✅ 專案檔案已同步到 ~/diet_dialy

## 🔗 連線資訊

### API 端點
- **REST API**: http://10.1.1.85:54321
- **GraphQL**: http://10.1.1.85:54321/graphql/v1
- **Storage S3**: http://10.1.1.85:54321/storage/v1/s3

### 資料庫
- **PostgreSQL**: postgresql://postgres:postgres@10.1.1.85:54322/postgres
- **Host**: 10.1.1.85
- **Port**: 54322
- **Database**: postgres
- **User**: postgres
- **Password**: postgres

### 開發工具
- **Mailpit (測試郵件)**: http://10.1.1.85:54324

### API Keys
```bash
# Publishable Key (前端可用)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# Secret Key (僅後端使用)
SUPABASE_SECRET_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# S3 Credentials (Storage 使用)
S3_ACCESS_KEY=625729a08b95bf1b7ff351a663f3a23c
S3_SECRET_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
S3_REGION=local
```

## 📁 資料庫 Schema

已創建基礎 schema (migration 000):

### Tables
- **diet_daily_users**: 用戶表
  - id (UUID, PK)
  - email (TEXT, UNIQUE)
  - full_name (TEXT)
  - is_admin (BOOLEAN, DEFAULT FALSE)
  - created_at, updated_at

- **diet_daily_foods**: 食物主表
  - id (UUID, PK)
  - name (TEXT, UNIQUE)
  - category (TEXT)
  - description (TEXT)
  - created_at, updated_at

- **food_entries**: 用戶食物記錄
  - id (UUID, PK)
  - user_id (UUID, FK → diet_daily_users)
  - food_id (UUID, FK → diet_daily_foods)
  - food_name (TEXT)
  - portion_size (TEXT)
  - consumed_at (TIMESTAMPTZ)
  - created_at, updated_at

### Functions
- **update_updated_at_column()**: 自動更新 updated_at 欄位的觸發器函數

## 🛠️ 常用指令

### Supabase 服務管理
```bash
# SSH 登入 Pi
ssh gilko@10.1.1.85

# 切換到專案目錄
cd ~/diet_dialy

# 查看服務狀態
supabase status

# 啟動服務
supabase start

# 停止服務
supabase stop

# 重啟服務 (停止 + 啟動)
supabase stop && supabase start

# 重置資料庫 (清空資料並重新套用 migrations)
supabase db reset
```

### 資料庫操作
```bash
# 連線到 PostgreSQL
psql postgresql://postgres:postgres@localhost:54322/postgres

# 套用新的 migrations
supabase db push

# 查看 migration 歷史
supabase migration list

# 創建新 migration
supabase migration new <migration_name>
```

### 查看日誌
```bash
# 查看所有容器日誌
docker compose -f ~/diet_dialy/.supabase/docker-compose.yml logs

# 查看特定服務日誌
docker compose -f ~/diet_dialy/.supabase/docker-compose.yml logs <service_name>

# 實時跟蹤日誌
docker compose -f ~/diet_dialy/.supabase/docker-compose.yml logs -f
```

## 📝 環境變數配置

### 本地開發 (.env.local)
```bash
# Supabase 本地連線
NEXT_PUBLIC_SUPABASE_URL=http://10.1.1.85:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# 資料庫連線 (如需直連)
DATABASE_URL=postgresql://postgres:postgres@10.1.1.85:54322/postgres
```

## 🔄 Migration 管理

### 目前狀態
- ✅ 000_initial_schema.sql - 基礎 schema
- 📦 其他 migrations 已備份到 backup/ 目錄

### 恢復完整 migrations
如需恢復所有 migrations:
```bash
cd ~/diet_dialy/supabase/migrations
mv backup/*.sql ./
supabase db reset
```

### 添加新 migration
```bash
# 在 Pi 上創建新 migration
cd ~/diet_dialy
supabase migration new <description>

# 或從本機同步
scp /path/to/new_migration.sql gilko@10.1.1.85:~/diet_dialy/supabase/migrations/
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase db reset"
```

## 🧪 測試連線

### 測試 API 連線
```bash
# 從本機測試
curl http://10.1.1.85:54321/rest/v1/

# 從 Pi 測試
curl http://localhost:54321/rest/v1/
```

### 測試資料庫連線
```bash
# 使用 psql
psql postgresql://postgres:postgres@10.1.1.85:54322/postgres -c "SELECT version();"
```

## ⚠️ 注意事項

1. **網路存取**: 目前 Supabase 監聽在 localhost，需要通過 Pi 的 IP (10.1.1.85) 存取
2. **防火牆**: 確保 ports 54321, 54322, 54324 在防火牆中開放
3. **資料持久性**: 資料儲存在 Docker volumes 中，停止服務不會丟失資料
4. **效能**: Pi 5 的 ARM64 架構可能在大量查詢時效能較低
5. **Migrations**: 複雜 migrations 已備份，可根據需要逐步恢復

## 🚀 下一步

1. **測試基礎功能**:
   - 創建測試用戶
   - 插入測試資料
   - 驗證 API 連線

2. **逐步恢復 Migrations**:
   - 根據需要從 backup/ 恢復 migrations
   - 測試每個 migration 的相容性

3. **整合測試**:
   - 使用 Pi 的 Supabase 進行應用整合測試
   - 驗證行動應用連線

4. **監控和優化**:
   - 監控 Pi 的資源使用
   - 根據需要調整 Docker 資源限制

## 📞 故障排除

### 服務無法啟動
```bash
# 檢查 Docker 狀態
docker ps -a

# 查看錯誤日誌
supabase start --debug

# 重置所有容器
supabase stop
docker system prune -a
supabase start
```

### Migration 失敗
```bash
# 查看具體錯誤
supabase db reset --debug

# 暫時移除問題 migration
mv supabase/migrations/problematic_migration.sql supabase/migrations/backup/

# 重試
supabase db reset
```

### 無法連線
```bash
# 檢查服務是否運行
supabase status

# 檢查防火牆
sudo ufw status

# 測試 port 連通性
nc -zv 10.1.1.85 54321
```

---

**安裝時間**: 2025-11-13
**安裝腳本**: [scripts/setup_supabase_pi5.sh](../scripts/setup_supabase_pi5.sh)
**維護者**: gilko@10.1.1.85
