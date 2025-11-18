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

### pi-dev-sync.sh
**用途**: 針對開發模式，將 `src/app` 的 Git 變更快速同步到 Pi，並確保 dev server 容器啟動
**使用方式**:
```bash
./scripts/pi-dev-sync.sh
```

**功能**:
- 掃描 `src/app` 目錄的新增/修改/刪除
- 透過 `rsync --relative` 僅同步變更檔案並刪除舊檔
- 在 Pi 上執行 `docker compose -f docker-compose.dev.yml up -d`，啟動掛載原始碼的 dev 容器

**注意**:
- Dev 模式使用 `pi_docker/docker-compose.dev.yml`，會將整個 repo 掛載到容器並使用 `npm run dev`
- 預設啟動於 `PI_DEV_PORT`（預設 3100），可在 `.env` 設定
- 適合快速驗證頁面/API，不會重新 build production 映像

---

### pi-dev-init.sh
**用途**: 一次性將 `pi_docker/docker-compose.dev.yml` 上傳到 Pi，讓 dev 模式可運作
**使用方式**:
```bash
./scripts/pi-dev-init.sh
```

**注意**:
- 必須先執行一次（或在 dev compose 有變更時再次執行），之後才能用 `pi-dev-sync.sh`
- 依賴 `.env` 中的 `PI_USER / PI_HOST / PI_DIR` 設定

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
