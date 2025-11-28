# Diet Daily - Raspberry Pi 5 部署指南

本資料夾包含所有在 Raspberry Pi 5 上部署 Diet Daily Web 應用所需的配置檔案和腳本。

## 📁 檔案說明

```
pi_docker/
├── README.md                    # 本說明文件
├── Dockerfile                   # Docker 映像建置配置
├── docker-compose.yml           # Docker Compose 編排配置
├── .dockerignore               # Docker 建置時排除的檔案
├── .env.production.pi          # 生產環境變數配置（Raspberry Pi）
├── .env.render.example         # Render 部署所需環境變數樣板
├── deploy-to-pi.sh             # 自動化部署腳本
├── render/                     # Render 雲端部署設定
│   ├── README.md               # Render 部署教學
│   └── render.yaml             # Render Blueprint 設定檔
└── DEPLOYMENT.md               # 詳細部署文檔（故障排除等）
```

## 🚀 快速部署

### 前置需求

**本地機器**：
- SSH 客戶端
- rsync（macOS/Linux 內建）
- 可以 SSH 連線到 Raspberry Pi

**Raspberry Pi 5**：
- IP: 10.1.1.85
- 使用者: gilko
- Raspberry Pi OS（64-bit 推薦）
- 至少 4GB RAM
- SSH 已啟用

### 一鍵部署

1. **編輯環境變數**（首次部署必須）：

```bash
cd pi_docker
nano .env.production.pi
```

填入您的實際配置：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 公開金鑰
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服務金鑰
- 其他 API 金鑰（如 ANTHROPIC_API_KEY、OPENAI_API_KEY）

2. **執行部署腳本**：

```bash
chmod +x deploy-to-pi.sh
./deploy-to-pi.sh
```

3. **訪問應用**：

```
http://10.1.1.85:3000
http://gilko.redirectme.net:3000
```

## 📝 詳細步驟

### Render 雲端部署

若需要在雲端（Render）長時間穩定執行，可參考 `render/README.md` 內的說明：

1. 建立 GitHub Repo（例如 `diet-daily`）並推送本目錄。
2. 依 `.env.render.example` 建立 Render Environment Group。
3. 透過 `render/render.yaml` Blueprint 或手動方式在 Render 建立 Web Service。
4. 選擇 Standard 方案確保服務不會睡眠。

部署完成後，記得更新行動 App 的 `EXPO_PUBLIC_API_URL` 指向 Render 產生的網址。

### 步驟 1：配置環境變數

複製並編輯環境配置：

```bash
cd pi_docker
cp .env.production.pi .env.production.pi.local  # 可選：建立本地備份
nano .env.production.pi
```

**必填項目**：
```env
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 認證（建議更改）
NEXTAUTH_SECRET=your_random_secret_string
```

**選填項目**：
```env
# AI 服務（如需使用 AI 分析功能）
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Google OAuth（如需使用 Google 登入）
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 步驟 2：執行部署

**自動部署（推薦）**：

```bash
./deploy-to-pi.sh
```

腳本會自動：
- ✓ 檢查 SSH 連線
- ✓ 安裝 Docker 和 Docker Compose（如需要）
- ✓ 同步專案檔案
- ✓ 建置 Docker 映像
- ✓ 啟動容器
- ✓ 驗證部署狀態

**手動部署**：

```bash
# 1. 複製所有檔案到 Pi
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ../ gilko@10.1.1.85:~/diet-daily/

# 2. 複製環境配置
scp .env.production.pi gilko@10.1.1.85:~/diet-daily/.env.production.pi

# 3. 複製 Docker 配置
scp Dockerfile docker-compose.yml .dockerignore gilko@10.1.1.85:~/diet-daily/

# 4. SSH 到 Pi 並建置
ssh gilko@10.1.1.85
cd ~/diet-daily
docker compose build
docker compose up -d
```

## 🔧 管理指令

### 查看狀態

```bash
# 查看容器狀態
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose ps'

# 查看即時日誌
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose logs -f'

# 查看最近 50 行日誌
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose logs --tail=50'
```

### 控制應用

```bash
# 重啟應用
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose restart'

# 停止應用
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose down'

# 啟動應用
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose up -d'

# 重新建置並重啟
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose down && docker compose build && docker compose up -d'
```

### 更新應用

當您修改了程式碼後：

```bash
# 方法 1：使用部署腳本（推薦）
./deploy-to-pi.sh

# 方法 2：手動更新
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ../ gilko@10.1.1.85:~/diet-daily/
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose build && docker compose up -d'
```

### 清理資源

```bash
# 停止並移除容器
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose down'

# 清理未使用的映像
ssh gilko@10.1.1.85 'docker system prune -a'

# 完全清除（包含資料）
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose down -v && rm -rf ~/diet-daily'
```

## 🐛 故障排除

### 應用無法啟動

**檢查日誌**：
```bash
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose logs'
```

**常見問題**：

1. **環境變數錯誤**：
```bash
# 檢查環境變數
ssh gilko@10.1.1.85 'cat ~/diet-daily/.env.production.pi'
```

2. **端口被占用**：
```bash
# 檢查 3000 端口
ssh gilko@10.1.1.85 'lsof -i:3000'

# 殺掉占用端口的進程
ssh gilko@10.1.1.85 'lsof -ti:3000 | xargs kill -9'
```

3. **Docker 未運行**：
```bash
# 啟動 Docker 服務
ssh gilko@10.1.1.85 'sudo systemctl start docker'

# 設定開機自啟
ssh gilko@10.1.1.85 'sudo systemctl enable docker'
```

### SSH 連線問題

**測試連線**：
```bash
# 測試 SSH
ssh -v gilko@10.1.1.85

# 測試網路
ping 10.1.1.85
```

**設定 SSH 金鑰**（首次設定）：
```bash
# 生成 SSH 金鑰（如果還沒有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 複製公鑰到 Pi
ssh-copy-id gilko@10.1.1.85
```

### 建置失敗

**清除快取重建**：
```bash
ssh gilko@10.1.1.85 'cd ~/diet-daily && docker compose build --no-cache'
```

**檢查磁碟空間**：
```bash
ssh gilko@10.1.1.85 'df -h'
```

**記憶體不足**：
```bash
# 增加 swap 空間
ssh gilko@10.1.1.85 '
sudo dphys-swapfile swapoff
sudo sed -i "s/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/" /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
'
```

### 無法訪問應用

1. **檢查容器狀態**：
```bash
ssh gilko@10.1.1.85 'docker ps'
```

2. **測試本地訪問**：
```bash
ssh gilko@10.1.1.85 'curl -I http://localhost:3000'
```

3. **檢查防火牆**：
```bash
# 允許 3000 端口
ssh gilko@10.1.1.85 'sudo ufw allow 3000'
```

## ⚙️ 配置說明

### Dockerfile

- **基礎映像**：Node.js 18 Alpine（輕量級）
- **多階段建置**：減少最終映像大小
- **非 root 使用者**：提高安全性
- **Standalone 輸出**：最佳化生產部署

### docker-compose.yml

- **端口映射**：3000:3000
- **自動重啟**：`unless-stopped`
- **健康檢查**：每 30 秒檢查一次
- **網路隔離**：專用網路 `diet-daily-network`

### 環境變數優先級

1. `.env.production.pi`（Pi 專用配置）
2. `.env.production`（通用生產配置）
3. `.env`（預設配置）

## 📊 效能優化

### 針對 Raspberry Pi 5 的優化

**記憶體限制**（編輯 `docker-compose.yml`）：
```yaml
services:
  web:
    mem_limit: 2g
    mem_reservation: 1g
```

**連線池優化**（編輯 `.env.production.pi`）：
```env
DB_POOL_SIZE=10
MAX_MEMORY_CACHE_SIZE=500
```

**建置加速**：
```bash
# 使用 BuildKit
export DOCKER_BUILDKIT=1
```

## 🔐 安全建議

1. **更改預設密碼**：
```bash
ssh gilko@10.1.1.85
passwd
```

2. **防火牆設定**：
```bash
ssh gilko@10.1.1.85 '
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 3000
'
```

3. **定期更新**：
```bash
ssh gilko@10.1.1.85 'sudo apt update && sudo apt upgrade -y'
```

4. **使用 HTTPS**（推薦使用 Nginx 反向代理）：
參考 `DEPLOYMENT.md` 中的進階配置章節

## 📚 相關文檔

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 完整部署文檔
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Documentation](https://docs.docker.com/)
- [Raspberry Pi Documentation](https://www.raspberrypi.com/documentation/)

## 🆘 支援

如遇問題：
1. 查看 `DEPLOYMENT.md` 的故障排除章節
2. 檢查 Docker 日誌
3. 檢查 Pi 系統日誌：`/var/log/syslog`

## 📝 版本記錄

- **v1.0.0** (2025-10-23)
  - 初始版本
  - 支援 Raspberry Pi 5 (ARM64)
  - Docker + Docker Compose 部署
  - 自動化部署腳本
  - 健康檢查和自動重啟
