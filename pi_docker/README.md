# Diet Daily - Raspberry Pi 5 部署指南

完整的 Raspberry Pi 5 部署文檔，整合所有部署流程和故障排除資訊。

## 目錄

- [快速開始](#快速開始)
- [系統需求](#系統需求)
- [部署流程](#部署流程)
- [配置說明](#配置說明)
- [故障排除](#故障排除)
- [維護操作](#維護操作)
- [相關文檔](#相關文檔)

## 快速開始

### 一鍵部署

```bash
# 從項目根目錄執行
./pi_docker/deploy-to-pi.sh
```

### 前置條件檢查

```bash
# 1. SSH 連接測試
ssh gilko@10.1.1.85 "echo 'Connection OK'"

# 2. 檢查 .env.production.pi 是否存在
ls -la pi_docker/.env.production.pi

# 3. 驗證環境變數
grep SUPABASE pi_docker/.env.production.pi
```

## 系統需求

### 硬體需求
- **裝置**: Raspberry Pi 5 (4GB+ RAM 推薦)
- **儲存**: 32GB+ microSD 卡或 SSD
- **網路**: 有線網路連接 (推薦) 或穩定的 WiFi

### 軟體需求
- **OS**: Raspberry Pi OS (64-bit) 或 Ubuntu Server 22.04+ for ARM64
- **Docker**: 20.10+
- **Docker Compose**: v2.0+
- **Node.js**: 18+ (在 Docker 容器中)

### Pi 5 設定
```bash
# SSH 到 Pi5
ssh gilko@10.1.1.85

# 檢查 Docker 版本
docker --version
docker compose version

# 如需安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

## 部署流程

### 1. 環境配置

確保 `.env.production.pi` 檔案已正確配置：

```bash
# 檢查必要的環境變數
cat pi_docker/.env.production.pi | grep -E "SUPABASE|ANTHROPIC"
```

必要變數：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名金鑰
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服務角色金鑰
- `ANTHROPIC_API_KEY` - Claude AI API 金鑰

### 2. 執行部署

```bash
# 從項目根目錄
./pi_docker/deploy-to-pi.sh
```

部署腳本會自動：
1. ✅ 檢查 SSH 連接
2. ✅ 驗證 Docker 安裝
3. ✅ 複製項目檔案到 Pi5
4. ✅ 複製環境配置
5. ✅ 構建 Docker 映像 (包含環境變數)
6. ✅ 啟動容器
7. ✅ 執行健康檢查

### 3. 驗證部署

```bash
# 檢查容器狀態
ssh gilko@10.1.1.85 "cd ~/diet-daily/pi_docker && docker compose ps"

# 查看日誌
ssh gilko@10.1.1.85 "cd ~/diet-daily/pi_docker && docker compose logs -f"

# 測試 API
curl http://10.1.1.85:3000/api/health
curl https://gilko.redirectme.net/api/health
```

## 配置說明

### Docker 配置

#### Dockerfile
- **多階段構建**: 優化映像大小
- **環境變數注入**: Build args → ENV → Runtime
- **Node.js 18**: Alpine 基礎映像，輕量化

#### docker-compose.yml
```yaml
services:
  web:
    build:
      context: ..              # 項目根目錄
      dockerfile: pi_docker/Dockerfile
      args:                    # 構建時環境變數
        - NEXT_PUBLIC_SUPABASE_URL
        - SUPABASE_SERVICE_ROLE_KEY
        - ANTHROPIC_API_KEY
    env_file:
      - .env.production.pi     # 運行時環境變數
```

### 網路配置

#### 內部網路 (10.1.1.85:3000)
- 用於開發測試
- 直接訪問 Pi5

#### 外部網路 (gilko.redirectme.net:3000)
- DDNS + 路由器端口轉發
- HTTPS 支援（通過 Nginx 反向代理）
- 用於 iOS app 和遠端訪問

## 故障排除

### 常見問題

#### 1. 環境變數未載入

**症狀**:
```
Error: getaddrinfo ENOTFOUND your-project-ref.supabase.co
```

**原因**: Next.js 構建時未正確載入環境變數

**解決方案**:
```bash
# 檢查 .env.production.pi
cat ~/diet-daily/pi_docker/.env.production.pi | grep SUPABASE

# 手動重新構建
cd ~/diet-daily/pi_docker
set -a && source .env.production.pi && set +a
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 2. package-lock.json 找不到

**症狀**:
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**原因**: Docker build context 不正確

**解決方案**:
```bash
# 檢查 build context 設定
grep -A 3 "build:" pi_docker/docker-compose.yml
# 應該看到: context: ..

# 確認 package-lock.json 存在
ls -la ~/diet-daily/package-lock.json
```

#### 3. 容器名稱衝突

**症狀**:
```
Error: Conflict. The container name "/diet-daily-web" is already in use
```

**解決方案**:
```bash
# 移除舊容器
docker rm -f diet-daily-web

# 或使用 docker compose 清理
cd ~/diet-daily/pi_docker
docker compose down
docker compose up -d
```

#### 4. 健康檢查失敗

**症狀**: 容器狀態顯示 `unhealthy`

**診斷步驟**:
```bash
# 1. 查看容器日誌
docker logs diet-daily-web

# 2. 檢查容器內部
docker exec -it diet-daily-web sh
wget -O- http://localhost:3000/api/health

# 3. 檢查端口
lsof -i :3000
```

### 調試技巧

#### 查看構建過程
```bash
cd ~/diet-daily/pi_docker
docker compose build --progress=plain --no-cache 2>&1 | tee build.log
```

#### 檢查環境變數
```bash
# 在容器中
docker exec diet-daily-web env | grep SUPABASE

# 構建時
docker inspect pi_docker-web | jq '.[0].Config.Env'
```

#### 測試 API 連接
```bash
# 測試 Supabase 連接
docker exec diet-daily-web node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
client.from('food_entries').select('count').then(r => console.log(r));
"
```

## 維護操作

### 日常維護

#### 查看日誌
```bash
# 實時日誌
ssh gilko@10.1.1.85 'cd ~/diet-daily/pi_docker && docker compose logs -f'

# 最近日誌
ssh gilko@10.1.1.85 'cd ~/diet-daily/pi_docker && docker compose logs --tail=100'

# 只看錯誤
ssh gilko@10.1.1.85 'cd ~/diet-daily/pi_docker && docker compose logs | grep -i error'
```

#### 重啟服務
```bash
# 平滑重啟
ssh gilko@10.1.1.85 'cd ~/diet-daily/pi_docker && docker compose restart'

# 完全重建
ssh gilko@10.1.1.85 'cd ~/diet-daily/pi_docker && docker compose down && docker compose up -d'
```

#### 更新代碼
```bash
# 方法 1: 使用部署腳本（推薦）
./pi_docker/deploy-to-pi.sh

# 方法 2: 手動更新
rsync -avz --exclude-from='pi_docker/.dockerignore' \
    --exclude='.git' --exclude='node_modules' --exclude='.next' \
    ./ gilko@10.1.1.85:~/diet-daily/

ssh gilko@10.1.1.85 'cd ~/diet-daily/pi_docker && \
    set -a && source .env.production.pi && set +a && \
    docker compose down && docker compose build && docker compose up -d'
```

### 清理操作

#### 清理 Docker 資源
```bash
# 清理未使用的映像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理全部未使用資源
docker system prune -a --volumes
```

#### 磁碟空間檢查
```bash
# 檢查磁碟使用
df -h

# 檢查 Docker 空間
docker system df
```

### 備份與恢復

#### 備份環境配置
```bash
# 備份 .env 檔案
scp gilko@10.1.1.85:~/diet-daily/pi_docker/.env.production.pi \
    ./backups/.env.production.pi.$(date +%Y%m%d)
```

#### 備份 Docker 映像
```bash
# 導出映像
ssh gilko@10.1.1.85 "docker save pi_docker-web > ~/diet-daily-backup.tar"

# 下載到本地
scp gilko@10.1.1.85:~/diet-daily-backup.tar ./backups/

# 恢復映像
docker load < backups/diet-daily-backup.tar
```

## 性能優化

### Pi 5 特定優化

#### 1. 記憶體管理
```bash
# 檢查記憶體使用
docker stats diet-daily-web

# 調整容器記憶體限制（docker-compose.yml）
services:
  web:
    mem_limit: 2g
    mem_reservation: 1g
```

#### 2. CPU 優化
```yaml
# docker-compose.yml
services:
  web:
    cpus: '2.0'  # Pi 5 有 4 核心
```

#### 3. 快取優化
- 使用 SSD 而非 microSD 卡
- 啟用 Docker BuildKit
- 使用多階段構建

## 相關文檔

### 核心文檔
- [QUICK_START.md](./QUICK_START.md) - 快速開始指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 詳細部署文檔
- [TEST_RESULTS.md](./TEST_RESULTS.md) - 測試結果記錄

### 專題文檔
- [HTTPS_PATH_ROUTING_SETUP.md](./HTTPS_PATH_ROUTING_SETUP.md) - HTTPS 路由設定
- [IOS_DEPLOYMENT_SUMMARY.md](./IOS_DEPLOYMENT_SUMMARY.md) - iOS 部署總結
- [UPDATE_PDF_ON_PI5.md](./UPDATE_PDF_ON_PI5.md) - PDF 功能更新記錄

### 腳本文件
- `deploy-to-pi.sh` - 主要部署腳本
- `update-pi5-pdf.sh` - PDF 功能更新腳本
- `test-all.sh` - 測試腳本

## 技術架構

```
┌─────────────────────────────────────┐
│         iOS App / Web Browser        │
│   (gilko.redirectme.net:3000)       │
└──────────────┬──────────────────────┘
               │ HTTPS/HTTP
               │
┌──────────────▼──────────────────────┐
│      Router + DDNS                   │
│   (Port Forward 3000 → Pi5)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Raspberry Pi 5 (10.1.1.85)       │
│                                      │
│  ┌────────────────────────────┐    │
│  │   Docker Container          │    │
│  │                             │    │
│  │  ┌──────────────────────┐  │    │
│  │  │  Next.js 15 App       │  │    │
│  │  │  (Node 18)           │  │    │
│  │  │                      │  │    │
│  │  │  - API Routes        │  │    │
│  │  │  - Static Pages      │  │    │
│  │  │  - Server Actions    │  │    │
│  │  └──────────────────────┘  │    │
│  └────────────────────────────┘    │
└──────────────┬──────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────┐
│        External Services             │
│                                      │
│  • Supabase (PostgreSQL + Storage)  │
│  • Anthropic Claude AI              │
│  • Google OAuth                      │
└──────────────────────────────────────┘
```

## 版本歷史

### v1.0.10 (2025-10-29)
- ✅ 修復環境變數載入問題
- ✅ 優化 Docker 構建流程
- ✅ 修正 build context 路徑
- ✅ 改善部署腳本

### v1.0.9 (2025-10-28)
- iOS app 版本
- PDF 功能優化

## 授權與支援

- **專案**: Diet Daily - IBD 飲食追蹤應用
- **維護**: Internal Development Team
- **支援**: 查看 GitHub Issues 或聯繫開發團隊

---

**最後更新**: 2025-10-29
**維護者**: Development Team
