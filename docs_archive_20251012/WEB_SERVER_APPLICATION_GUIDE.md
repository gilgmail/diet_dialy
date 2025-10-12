# 網頁伺服申請與部署完整指南

## 1. 確認專案需求
- 明確服務類型：Next.js 前端、API 伺服器、資料庫等。
- 預估流量與峰值：每日請求量、同時線上人數、檔案下載需求。
- 資料合規要求：是否需符合 HIPAA、GDPR 或醫療資料保護規範。

## 2. 建立 Google Cloud 帳戶與專案
- 使用主要維運帳號註冊 Google Cloud，啟用 2FA。
- 進入 Google Cloud Console 建立新專案（Project），命名建議：`diet-daily-prod` 或 `diet-daily-staging`。
- 啟用計費並綁定信用卡，確保 Trial 期結束後服務不中斷。

## 3. 權限與安全控管
- 透過 IAM 建立角色：`Owner` 只給主維運，`Editor`/`Viewer` 給開發者。
- 啟用 Cloud Identity，強制使用者開啟 MFA。
- 設定 VPC Service Controls 與防火牆規則，限制 SSH、HTTP/HTTPS 入口。

## 4. 基礎資源規劃
- 選擇區域：以台灣/香港用戶為主可選 `asia-east1`（台北）或 `asia-northeast1`（東京）。
- 選擇服務：
  - **Compute Engine**：需完整控制 VM、Nginx、Docker。
  - **Cloud Run**：容器化部署，閒置時自動縮容，適合 Next.js SSR。
  - **App Engine**：Node.js 標準環境，免維運但彈性較小。

## 5. Compute Engine 建置流程
1. 開啟 Compute Engine，建立 VM：機型 `e2-medium (2vCPU/4GB)`，磁碟 30GB SSD。
2. 允許 HTTP/HTTPS 流量，設定外部靜態 IP。
3. 透過 SSH 連線並安裝依賴：
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs nginx git ufw
   ```
4. 佈署程式碼：
   ```bash
   git clone https://<repo>
   cd diet_dialy
   cp .env.example .env
   npm install
   npm run build
   npm install -g pm2
   pm2 start npm --name diet-daily -- start
   pm2 save && pm2 startup systemd
   ```
5. 設定 Nginx 反向代理：
   ```bash
   sudo tee /etc/nginx/sites-available/diet-daily <<'NGINX'
   server {
     listen 80;
     server_name dietdaily.example.com;
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     }
   }
   NGINX
   sudo ln -s /etc/nginx/sites-available/diet-daily /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 6. Cloud Run 申請流程（容器化）
1. 本機建立 `Dockerfile`：
   ```Dockerfile
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM node:20-alpine
   WORKDIR /app
   COPY --from=build /app .
   EXPOSE 8080
   CMD ["npm", "run", "start"]
   ```
2. 使用 Cloud Build 部署：
   ```bash
   gcloud auth login
   gcloud config set project diet-daily-prod
   gcloud builds submit --tag gcr.io/diet-daily-prod/diet-daily
   gcloud run deploy diet-daily \
     --image gcr.io/diet-daily-prod/diet-daily \
     --platform managed --region asia-east1 \
     --allow-unauthenticated --port 8080
   ```
3. 啟用最小實例數 = 0，最大實例數依流量估算（預設 100）。

## 7. 網域與 DNS 設定
- 到 Google Domains 或現有註冊商購買網域，例如 `dietdaily.health`。
- 新增 DNS 記錄：
  - `A` 記錄指向 Compute Engine 靜態 IP。
  - `CNAME` 記錄指向 Cloud Run 產生的自訂路由（透過 Cloud Load Balancing）。
- 若使用 Cloud DNS，可在 GCP 內部管理所有記錄，並方便設定多區負載平衡。

## 8. SSL/TLS 憑證申請
- Compute Engine：
  ```bash
  sudo snap install --classic certbot
  sudo certbot --nginx -d dietdaily.example.com
  ```
  記得設定自動更新：
  ```bash
  echo "0 3 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew
  ```
- Cloud Run：於負載平衡器或 Cloud Run 自訂網域設定頁啟用 Google Managed SSL。

## 9. 成本控管與監控
- 啟用 Cloud Billing Budget & Alert：設定每月上限（例如 USD 100），達 80% 觸發通知。
- 使用 Cloud Monitoring 建立儀表板，觀察 CPU、記憶體、HTTP 5xx。
- 啟用 Cloud Logging 並設定日誌保留政策。

## 10. 維運與備援
- 建立常規更新流程：每月套用安全更新、備份資料庫。
- 導入 IaC（Terraform/GitOps）記錄基礎建設設定。
- 規劃災難復原：備援區域快照、定期還原演練。

## 11. 附錄：常用 gcloud/操作指令
```bash
# 查詢可用服務與配額
gcloud services list --available

# 列出所有 VM
gcloud compute instances list

# 設定防火牆允許 HTTP/HTTPS
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 --target-tags=diet-daily --description="Allow HTTP"
```

此文檔涵蓋從需求分析、Google Cloud 申請、部署流程、網域配置到成本控管的完整步驟，可作為 Diet Daily 網頁服務上線的標準作業指引。
