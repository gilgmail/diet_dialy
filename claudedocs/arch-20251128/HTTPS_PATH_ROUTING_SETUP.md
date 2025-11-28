# HTTPS 路徑分流部署記錄

**部署日期**: 2025-10-27
**部署位置**: Raspberry Pi 5 (10.1.1.85 / gilko.redirectme.net)
**方案**: 路徑分流（n8n 和 Diet Daily 共用 443 端口）

---

## 📊 最終架構

```
https://gilko.redirectme.net/       → Diet Daily API (端口 3000)
https://gilko.redirectme.net/n8n/   → n8n Workflow (端口 5678)
```

### 架構圖

```
使用者請求
    ↓
Nginx (443 HTTPS - Let's Encrypt SSL)
    ├─ / (根路徑) → proxy_pass → http://127.0.0.1:3000 (Diet Daily)
    └─ /n8n/ (子路徑) → proxy_pass → http://127.0.0.1:5678 (n8n)
```

---

## 🔧 配置文件

### 1. Nginx 配置

**檔案位置**: `/etc/nginx/conf.d/n8n.conf`

```nginx
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name gilko.redirectme.net;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    return 301 https://$host$request_uri;
}

# HTTPS 路徑分流
server {
    listen 443 ssl http2;
    server_name gilko.redirectme.net;

    ssl_certificate     /etc/letsencrypt/live/gilko.redirectme.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gilko.redirectme.net/privkey.pem;

    # n8n 路由（子路徑）
    location /n8n/ {
        rewrite ^/n8n/(.*) /$1 break;

        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;

        proxy_set_header X-Forwarded-Prefix /n8n;
    }

    # Diet Daily 路由（主路徑）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;

        client_max_body_size 10M;
    }

    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

---

### 2. n8n Docker Compose 配置

**檔案位置**: `/home/gilko/docker-dns/docker-compose.yml`

```yaml
version: "3.8"

volumes:
  n8n_data:

services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      - TZ=Asia/Taipei

      # n8n 內部跑 HTTP:5678
      - N8N_PROTOCOL=http
      - N8N_PORT=5678

      # 重要：設定子路徑
      - N8N_PATH=/n8n/
      - N8N_PUBLIC_URL=https://gilko.redirectme.net/n8n/
      - WEBHOOK_URL=https://gilko.redirectme.net/
      - N8N_EDITOR_BASE_URL=https://gilko.redirectme.net/n8n/

      - N8N_HOST=gilko.redirectme.net

    volumes:
      - n8n_data:/home/node/.n8n
```

---

### 3. Diet Daily Docker Compose 配置

**檔案位置**: `/home/gilko/diet-daily/docker-compose.yml`

Diet Daily 容器運行在端口 3000，環境變數使用 `.env.production.pi`。

---

## 🚀 部署步驟

### 步驟 1: 更新 n8n 配置支援子路徑

```bash
# 編輯 docker-compose.yml
cd /home/gilko/docker-dns
sudo nano docker-compose.yml

# 添加以下環境變數：
# - N8N_PATH=/n8n/
# - N8N_PUBLIC_URL=https://gilko.redirectme.net/n8n/
# - N8N_EDITOR_BASE_URL=https://gilko.redirectme.net/n8n/

# 重啟 n8n
docker compose down
docker compose up -d
```

---

### 步驟 2: 更新 Nginx 配置

```bash
# 備份舊配置
sudo cp /etc/nginx/conf.d/n8n.conf /etc/nginx/conf.d/n8n.conf.backup

# 編輯配置（使用上方的 Nginx 配置）
sudo nano /etc/nginx/conf.d/n8n.conf

# 測試配置
sudo nginx -t

# 重新載入
sudo systemctl reload nginx
```

---

### 步驟 3: 驗證部署

```bash
# 測試 Diet Daily
curl -I https://gilko.redirectme.net

# 測試 n8n
curl -I https://gilko.redirectme.net/n8n/

# 檢查容器狀態
docker ps
```

---

## ✅ 驗證結果

**部署時間**: 2025-10-27 21:47

```bash
# Diet Daily (主路徑)
$ curl -I https://gilko.redirectme.net
HTTP/2 200
server: nginx
content-type: text/html; charset=utf-8
x-frame-options: DENY

# n8n (子路徑)
$ curl -I https://gilko.redirectme.net/n8n/
HTTP/2 200
server: nginx
content-type: text/html; charset=utf-8

# 容器狀態
$ docker ps
CONTAINER ID   IMAGE              STATUS          PORTS
e5a8049441c9   diet-daily-web     Up 3 days       0.0.0.0:3000->3000/tcp
docker-dns-n8n-1   n8nio/n8n:latest   Up 10 seconds   127.0.0.1:5678->5678/tcp
```

---

## 🔐 安全配置

### SSL 憑證
- **提供商**: Let's Encrypt
- **憑證路徑**: `/etc/letsencrypt/live/gilko.redirectme.net/`
- **自動更新**: 已啟用 (certbot.timer)
- **有效期**: 90 天自動更新

### 安全 Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (Diet Daily)
- `Referrer-Policy: strict-origin-when-cross-origin`

### 端口綁定
- n8n: `127.0.0.1:5678` (僅本地訪問)
- Diet Daily: `0.0.0.0:3000` (通過 Nginx 代理訪問)

---

## 📱 iOS App 配置

更新環境變數：

```env
# .env 或 app.config.js
EXPO_PUBLIC_API_URL=https://gilko.redirectme.net
```

重新 build 或更新配置後即可使用 HTTPS API。

---

## ⚠️ n8n Webhook 注意事項

### Webhook URL 格式

由於設定了 `WEBHOOK_URL=https://gilko.redirectme.net/`，n8n webhook 保持在**根路徑**：

```
✅ 正確: https://gilko.redirectme.net/webhook/xxxxx
❌ 錯誤: https://gilko.redirectme.net/n8n/webhook/xxxxx
```

### n8n 管理介面

訪問 n8n 編輯器需要使用 `/n8n/` 路徑：

```
https://gilko.redirectme.net/n8n/
```

---

## 🔧 管理指令

### 查看日誌

```bash
# Nginx 日誌
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# n8n 日誌
docker logs docker-dns-n8n-1 -f --tail 50

# Diet Daily 日誌
docker logs diet-daily-web -f --tail 50
```

### 重啟服務

```bash
# 重啟 Nginx
sudo systemctl reload nginx

# 重啟 n8n
cd /home/gilko/docker-dns
docker compose restart

# 重啟 Diet Daily
cd /home/gilko/diet-daily
docker compose restart
```

### 恢復備份配置

如果需要恢復到之前的配置：

```bash
# 恢復 Nginx 配置（n8n 在根路徑）
sudo cp /etc/nginx/conf.d/n8n.conf.backup /etc/nginx/conf.d/n8n.conf
sudo nginx -t
sudo systemctl reload nginx

# 恢復 n8n docker-compose
cd /home/gilko/docker-dns
sudo cp docker-compose.yml.backup docker-compose.yml
docker compose down
docker compose up -d
```

---

## 💰 成本分析

### 硬體成本
- Raspberry Pi 5 (8GB): $60-80（一次性）
- 電費: ~$2-3/月

### 軟體成本
- Nginx: 免費
- Let's Encrypt SSL: 免費
- Docker: 免費
- n8n: 免費（自託管）

### 總成本
- **第一年**: ~$84-104
- **之後每年**: ~$24

### 對比 Render
- Render Standard: $300/年
- **節省**: $216-276/年

---

## 📊 資源使用監控

### 當前資源配置

**Raspberry Pi 5 規格**:
- RAM: 8GB
- CPU: 4 核 ARM64
- 儲存: 足夠空間

**資源分配**:
- n8n: ~512MB RAM
- Diet Daily: ~1-1.5GB RAM
- 系統預留: ~1GB RAM
- **總使用**: ~3GB / 8GB (37.5%)

### 監控指令

```bash
# 查看整體資源使用
free -h
htop

# 查看 Docker 容器資源
docker stats

# 查看磁碟空間
df -h
```

---

## 🐛 故障排除

### 問題 1: n8n 無法載入

**症狀**: 訪問 `/n8n/` 超時或 404

**解決方案**:
1. 檢查 n8n 容器是否運行: `docker ps | grep n8n`
2. 檢查 n8n 環境變數: `docker inspect docker-dns-n8n-1 | grep N8N_PATH`
3. 檢查 Nginx 配置: `sudo nginx -t`
4. 查看 n8n 日誌: `docker logs docker-dns-n8n-1`

---

### 問題 2: SSL 憑證過期

**症狀**: 瀏覽器顯示 SSL 錯誤

**解決方案**:
```bash
# 檢查憑證狀態
sudo certbot certificates

# 手動更新憑證
sudo certbot renew

# 檢查自動更新 timer
sudo systemctl status certbot.timer
```

---

### 問題 3: Diet Daily API 無法訪問

**症狀**: 訪問根路徑 404 或錯誤

**解決方案**:
1. 檢查容器狀態: `docker ps | grep diet-daily`
2. 測試本地端口: `curl http://localhost:3000`
3. 檢查 Nginx 日誌: `sudo tail -f /var/log/nginx/error.log`
4. 重啟容器: `cd ~/diet-daily && docker compose restart`

---

## 📚 相關文檔

- [Nginx 反向代理文檔](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [n8n 環境變數文檔](https://docs.n8n.io/hosting/configuration/environment-variables/)
- [Let's Encrypt 文檔](https://letsencrypt.org/docs/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)

---

## 🔄 未來改進建議

### 短期（1-3 個月）

1. **監控設定**
   - 設定 Uptime 監控（如 UptimeRobot）
   - 配置資源使用警報

2. **備份策略**
   - 自動備份 n8n 工作流
   - 定期備份 Nginx 配置

3. **效能優化**
   - 啟用 Nginx gzip 壓縮
   - 配置靜態資源快取

### 長期（3-12 個月）

1. **高可用性**
   - 考慮 Render 作為備援（如果用戶增長）
   - 設定自動故障恢復

2. **安全加固**
   - 啟用 fail2ban
   - 定期安全更新
   - 配置防火牆規則

3. **擴展性**
   - 評估遷移到 Render 的時機
   - 準備資料庫分離方案

---

## 📝 變更歷史

### 2025-10-27 - 初始部署

- ✅ 實施路徑分流架構
- ✅ 配置 n8n 支援 `/n8n/` 子路徑
- ✅ 配置 Diet Daily 在根路徑 `/`
- ✅ 驗證 HTTPS 和 WebSocket 功能
- ✅ 清理不需要的 8443 端口配置

**部署時間**: ~40 分鐘
**停機時間**: ~2 分鐘（重啟服務）
**測試結果**: 所有功能正常 ✅

---

## 👤 聯絡資訊

**系統管理員**: gilko
**Pi 位置**: 10.1.1.85 (gilko.redirectme.net)
**部署環境**: Raspberry Pi 5 (8GB RAM, ARM64)

---

## ✅ 部署檢查清單

使用此清單確認部署完整性：

- [x] n8n 可通過 `https://gilko.redirectme.net/n8n/` 訪問
- [x] Diet Daily 可通過 `https://gilko.redirectme.net/` 訪問
- [x] SSL 憑證有效且自動更新已啟用
- [x] n8n 環境變數包含 `N8N_PATH=/n8n/`
- [x] Nginx 配置已測試 (`nginx -t`)
- [x] 兩個服務的 Docker 容器運行正常
- [x] WebSocket 連線正常（n8n 需要）
- [x] 圖片上傳功能正常（Diet Daily 需要）
- [x] HTTP 自動重定向到 HTTPS
- [x] 備份配置已保存
- [x] iOS App 環境變數已更新
- [x] 防火牆規則正確（80, 443 開放）

---

**部署狀態**: ✅ 成功
**最後更新**: 2025-10-27 21:47 CST
