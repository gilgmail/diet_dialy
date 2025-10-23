# 部署到 Raspberry Pi 5 指南

本文檔說明如何將 Diet Daily Web 應用部署到 Raspberry Pi 5 (IP: gilko.redirectme.net)。

## 前置需求

### 本地機器
- SSH 客戶端
- rsync (macOS/Linux 內建)
- SSH 金鑰或密碼存取 Pi

### Raspberry Pi 5
- Raspberry Pi OS (64-bit 推薦)
- 至少 4GB RAM
- 網路連接 (IP: gilko.redirectme.net)
- SSH 已啟用
- 至少 10GB 可用儲存空間

## 快速部署

### 1. 設定環境變數

編輯 `.env.production.pi` 檔案，填入您的實際配置：

```bash
nano .env.production.pi
```

**必填項目：**
- `NEXT_PUBLIC_SUPABASE_URL` - 您的 Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名金鑰
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服務角色金鑰

**選填項目：**
- `ANTHROPIC_API_KEY` - 如果使用 AI 分析功能
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - 如果使用 Google OAuth
- `NEXTAUTH_SECRET` - 建議使用強隨機字串

### 2. 執行部署腳本

```bash
# 設定 Pi 使用者名稱 (預設為 'pi')
export PI_USER=pi

# 執行部署
./scripts/deploy-to-pi.sh
```

部署腳本會自動：
1. 檢查 SSH 連線
2. 安裝 Docker 和 Docker Compose (如果未安裝)
3. 複製專案檔案到 Pi
4. 建置 Docker 映像
5. 啟動應用程式
6. 驗證部署狀態

### 3. 訪問應用

部署成功後，在瀏覽器訪問：

```
http://gilko.redirectme.net:3000
```

## 手動部署步驟

如果自動部署腳本遇到問題，可以手動執行以下步驟：

### 1. 準備 Raspberry Pi

```bash
# SSH 連接到 Pi
ssh pi@gilko.redirectme.net

# 更新系統
sudo apt-get update && sudo apt-get upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi

# 登出再登入以套用 Docker 群組
exit
```

### 2. 複製專案檔案

```bash
# 在本地機器上執行
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ./ pi@gilko.redirectme.net:~/diet-daily/
```

### 3. 複製環境配置

```bash
scp .env.production.pi pi@gilko.redirectme.net:~/diet-daily/.env.production.pi
```

### 4. 在 Pi 上建置和啟動

```bash
# SSH 連接到 Pi
ssh pi@gilko.redirectme.net

# 進入專案目錄
cd ~/diet-daily

# 建置並啟動
docker compose build
docker compose up -d

# 檢查狀態
docker compose ps
docker compose logs -f
```

## 管理應用

### 查看日誌

```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && docker compose logs -f'
```

### 重啟應用

```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && docker compose restart'
```

### 停止應用

```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && docker compose down'
```

### 更新應用

重新執行部署腳本即可：

```bash
./scripts/deploy-to-pi.sh
```

### 查看容器狀態

```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && docker compose ps'
```

### 進入容器

```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && docker compose exec web sh'
```

## 效能優化建議

### 針對 Raspberry Pi 5 的優化

1. **記憶體限制**：在 `docker-compose.yml` 中設定記憶體限制

```yaml
services:
  web:
    mem_limit: 2g
    mem_reservation: 1g
```

2. **使用 Swap**：確保 Pi 有足夠的 swap 空間

```bash
ssh pi@gilko.redirectme.net
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # 設定 CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

3. **建置快取**：使用 BuildKit 快取加速建置

```bash
export DOCKER_BUILDKIT=1
```

## 故障排除

### 應用無法啟動

1. 檢查日誌：
```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && docker compose logs'
```

2. 檢查環境變數：
```bash
ssh pi@gilko.redirectme.net 'cd ~/diet-daily && cat .env.production.pi'
```

3. 檢查 Docker 狀態：
```bash
ssh pi@gilko.redirectme.net 'docker ps -a'
```

### 無法連接到 Supabase

確認 `.env.production.pi` 中的 Supabase 配置正確，並且 Pi 可以訪問外網：

```bash
ssh pi@gilko.redirectme.net 'curl -I https://supabase.com'
```

### 記憶體不足

如果遇到記憶體問題：

1. 增加 swap 空間 (見上方優化建議)
2. 減少並發連線數 (編輯 `.env.production.pi`)
3. 考慮使用外部資料庫而非本地

### SSH 連線失敗

1. 確認 Pi 的 IP 位址：
```bash
ping gilko.redirectme.net
```

2. 確認 SSH 服務運行：
```bash
ssh -v pi@gilko.redirectme.net
```

3. 檢查防火牆設定

### 建置太慢

在本地建置映像，然後推送到 Pi：

```bash
# 在本地建置 ARM64 映像
docker buildx build --platform linux/arm64 -t diet-daily:latest .

# 儲存映像
docker save diet-daily:latest | gzip > diet-daily.tar.gz

# 傳輸到 Pi
scp diet-daily.tar.gz pi@gilko.redirectme.net:~/

# 在 Pi 上載入
ssh pi@gilko.redirectme.net 'docker load < ~/diet-daily.tar.gz'
```

## 安全性建議

1. **更改預設密碼**：確保 Pi 的預設密碼已更改
2. **防火牆設定**：只開放必要的端口
3. **SSL/TLS**：考慮使用 Nginx 反向代理並配置 HTTPS
4. **定期更新**：定期更新系統和 Docker 映像
5. **備份**：定期備份資料和配置

## 進階配置

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name gilko.redirectme.net;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 設定自動啟動

Docker Compose 配置已包含 `restart: unless-stopped`，容器會在系統重啟後自動啟動。

### 監控設定

安裝 Portainer 進行容器管理：

```bash
ssh pi@gilko.redirectme.net
docker volume create portainer_data
docker run -d -p 9000:9000 -p 9443:9443 \
  --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

訪問 `http://gilko.redirectme.net:9000` 進行容器管理。

## 支援

如遇問題，請檢查：
1. 專案文檔
2. Docker 日誌
3. Raspberry Pi 系統日誌 (`/var/log/syslog`)

## 參考資源

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker on Raspberry Pi](https://docs.docker.com/engine/install/debian/)
- [Raspberry Pi Documentation](https://www.raspberrypi.com/documentation/)
