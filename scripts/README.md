# Scripts 目錄說明

本目錄包含各種自動化腳本，用於開發、測試、部署和維護 Diet Daily 應用。

## Pi 部署相關腳本

### deploy-to-pi.sh
**用途**: 完整部署應用到 Raspberry Pi 5
**位置**: 符號連結到 `../pi_docker/deploy-to-pi.sh`
**使用方式**:
```bash
./scripts/deploy-to-pi.sh
# 或
./pi_docker/deploy-to-pi.sh
```

**功能**:
- ✅ SSH 連接檢查
- ✅ Docker 環境驗證
- ✅ 完整項目檔案同步
- ✅ 環境變數配置
- ✅ Docker 映像構建（包含環境變數注入）
- ✅ 容器啟動與健康檢查

**相關文檔**: [pi_docker/README_CONSOLIDATED.md](../pi_docker/README_CONSOLIDATED.md)

---

### update-pi5-pdf.sh
**用途**: 快速更新單個檔案到 Pi5（用於快速測試）
**使用方式**:
```bash
./scripts/update-pi5-pdf.sh <file_path>

# 例如：
./scripts/update-pi5-pdf.sh src/app/api/ai/weekly-ibd-analysis/route.ts
```

**功能**:
- 備份現有檔案
- 上傳新檔案到 Pi5
- 觸發 Docker 重新構建
- 驗證部署狀態

**注意**:
- ⚠️ 僅用於快速測試單個檔案變更
- 📦 完整部署請使用 `deploy-to-pi.sh`

---

### deploy-to-gil-golden.sh
**用途**: 部署到實體 iOS 測試設備
**使用方式**:
```bash
./scripts/deploy-to-gil-golden.sh
```

**功能**:
- iOS app 構建
- 實體設備安裝
- 自動啟動 app

---

## 測試相關腳本

### test-all.sh
**用途**: 執行完整測試套件
**使用方式**:
```bash
./scripts/test-all.sh
```

**包含測試**:
- Unit tests
- Integration tests
- E2E tests
- Type checking
- Linting

---

### test-ai-analysis.sh
**用途**: 測試 AI 分析功能
**使用方式**:
```bash
./scripts/test-ai-analysis.sh
```

**測試項目**:
- Claude API 連接
- 每週 IBD 分析
- PDF 報告生成
- JSON 格式驗證

---

### ci-test.sh
**用途**: CI/CD 環境測試腳本
**使用方式**:
```bash
./scripts/ci-test.sh
```

**特點**:
- 適用於 CI 環境
- 無互動模式
- 完整測試覆蓋率報告

---

### Realtime Sync 測試腳本

#### test-realtime-minimal.js（推薦先執行）
**用途**: 最小化 realtime 連接測試 - 只測試 subscription 連接

**使用方式**:
```bash
node scripts/test-realtime-minimal.js <user_id>

# 例如：
node scripts/test-realtime-minimal.js 22e990b6-a888-4beb-9ac6-c9a145731542
```

**功能**:
- ✅ 驗證 Realtime 服務是否正常
- ✅ 檢查 subscription 連接是否成功
- ✅ 可手動在 Supabase Dashboard 插入資料測試事件接收
- ✅ 監聽 30 秒，實時顯示收到的事件

**用途場景**:
- 首次驗證 Realtime 設定
- 診斷連接問題
- 測試 Supabase Dashboard 手動操作

---

#### test-insert-only.js
**用途**: 簡化的插入測試 - 只測試 INSERT 操作

**使用方式**:
```bash
node scripts/test-insert-only.js <user_id>

# 例如：
node scripts/test-insert-only.js 22e990b6-a888-4beb-9ac6-c9a145731542
```

**功能**:
- ✅ 驗證資料庫連接和權限
- ✅ 快速測試 INSERT 操作
- ✅ 支援 service role key

**用途場景**:
- 驗證資料庫連接
- 測試 RLS 政策
- 快速插入測試資料

---

#### test-realtime-sync.js
**用途**: 完整的 realtime sync 測試 - 測試所有 CRUD 操作的 realtime 事件

**使用方式**:
```bash
# 指定用戶 ID
node scripts/test-realtime-sync.js <user_id>

# 例如：
node scripts/test-realtime-sync.js 22e990b6-a888-4beb-9ac6-c9a145731542
```

**功能**:
- ✅ 自動測試 `food_entries` 表的 INSERT, UPDATE, DELETE 事件
- ✅ 自動測試 `daily_symptom_entries` 表的 INSERT, UPDATE, DELETE 事件
- ✅ 測量同步延遲時間
- ✅ 生成詳細的測試報告
- ✅ 驗證事件是否正確觸發
- ✅ 自動刷新過期的 JWT token

**注意事項**:
- ⚠️ **需要有效的用戶 access token**（不能使用 service role key）
- ⚠️ Service role key 不會觸發 realtime 事件（這是 Supabase 的設計）
- 💡 建議從實際的 Mobile/Web app 中測試 realtime sync

**如何獲取有效的 token**:

1. **從 Web app**:
   - 打開瀏覽器開發者工具
   - DevTools → Application → Cookies → `supabase.auth.token`
   - 更新 .env.local

2. **從 Mobile app**:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Access Token:', session?.access_token);
   console.log('Refresh Token:', session?.refresh_token);
   ```

3. **更新 .env.local**:
   ```bash
   TEST_ACCESS_TOKEN=<access_token>
   TEST_REFRESH_TOKEN=<refresh_token>
   ```

**前置條件**:
- `.env.local` 檔案包含 Supabase 配置
- 有效的用戶 access token（可選，但建議提供）
- 資料庫中有至少一個用戶

**測試標準**:
- 同步成功率 ≥ 98%
- 同步延遲 < 3 秒
- 所有事件類型都正常運作

**測試結果**: [claudedocs/realtime-sync-test-results.md](../claudedocs/realtime-sync-test-results.md)

**總結**:
- ✅ Realtime subscription 連接正常
- ✅ 資料庫操作正常
- ⚠️ Service role key 無法觸發 realtime 事件（預期行為）
- 💡 建議：從實際的 Mobile/Web app 測試 realtime sync 功能

---

## 數據庫相關腳本

### import_taiwan_foods_direct.sh
**用途**: 直接匯入台灣食物資料庫
**使用方式**:
```bash
./scripts/import_taiwan_foods_direct.sh
```

**數據來源**:
- 衛福部食品營養成分資料庫
- 常見食物營養資訊

---

### upload_supabase_foods.sh
**用途**: 上傳食物資料到 Supabase
**使用方式**:
```bash
./scripts/upload_supabase_foods.sh
```

**前置條件**:
- 需要設定 Supabase 連接資訊
- 需要 service role key

---

### export_supabase_foods.sh
**用途**: 從 Supabase 匯出食物資料
**使用方式**:
```bash
./scripts/export_supabase_foods.sh
```

**輸出格式**: JSON

---

### get_supabase_connection.sh
**用途**: 測試 Supabase 連接並顯示連接資訊
**使用方式**:
```bash
./scripts/get_supabase_connection.sh
```

---

## 維護相關腳本

### cleanup-console-logs.sh
**用途**: 清理代碼中的 console.log
**使用方式**:
```bash
./scripts/cleanup-console-logs.sh
```

**功能**:
- 掃描所有 .ts/.tsx 檔案
- 移除 console.log/debug/info 語句
- 保留 console.error/warn

**選項**:
```bash
# 預覽模式（不實際刪除）
./scripts/cleanup-console-logs.sh --dry-run

# 僅處理特定目錄
./scripts/cleanup-console-logs.sh src/app/api
```

---

## 環境變數配置

所有腳本都會自動從項目根目錄的 `.env` 檔案載入環境變數：

```bash
# .env 檔案範例
PI_HOST=10.1.1.85
PI_USER=gilko
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

## 腳本開發指南

### 新增腳本時的最佳實踐

1. **使用 shebang**:
```bash
#!/bin/bash
```

2. **啟用嚴格模式**:
```bash
set -e  # 遇到錯誤立即退出
```

3. **載入環境變數**:
```bash
if [ -f "$(dirname "$0")/../.env" ]; then
    set -a
    source "$(dirname "$0")/../.env"
    set +a
fi
```

4. **提供使用說明**:
```bash
if [ -z "$1" ]; then
    echo "Usage: $0 <argument>"
    exit 1
fi
```

5. **使用顏色輸出**:
```bash
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Success!${NC}"
echo -e "${RED}Error!${NC}"
```

6. **新增文檔**:
   - 在腳本開頭新增註解說明用途
   - 更新本 README.md
   - 如需詳細說明，建立獨立的 .md 檔案

### 腳本命名規範

- 使用小寫字母和連字符：`deploy-to-pi.sh`
- 動詞開頭：`test-`, `deploy-`, `update-`, `cleanup-`
- 描述性名稱：一看就知道功能

### 測試腳本

在提交前測試腳本：

```bash
# 檢查語法
bash -n script.sh

# 使用 shellcheck（如已安裝）
shellcheck script.sh

# 實際執行測試
./script.sh --dry-run  # 如支援 dry-run 模式
```

## 故障排除

### 權限問題

如果腳本無法執行：
```bash
chmod +x scripts/*.sh
```

### SSH 連接問題

測試 SSH 連接：
```bash
ssh gilko@10.1.1.85 "echo 'Connection OK'"
```

設定 SSH key（避免每次輸入密碼）：
```bash
ssh-keygen -t ed25519
ssh-copy-id gilko@10.1.1.85
```

### 環境變數未載入

檢查 .env 檔案：
```bash
cat .env | grep PI_HOST
```

手動載入環境變數：
```bash
set -a && source .env && set +a
```

## 相關文檔

- [Pi 部署完整指南](../pi_docker/README_CONSOLIDATED.md)
- [測試文檔](../README.md#testing)
- [開發指南](../README.md#development)

---

**最後更新**: 2025-10-29
**維護者**: Development Team
