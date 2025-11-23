# Streak API 404 錯誤修復指南

## 問題描述
iOS app 呼叫 `/api/mobile/gamification/streak` 時返回 HTTP 404 錯誤，因為 API 路由尚未部署到生產環境（pi5）。

## 解決方案

### 方法 1: 使用 VPN 部署腳本（推薦）

如果已連接到 VPN：

```bash
# 確保 VPN 連接正常
./pi_docker/deploy-to-pi1.sh
```

如果 VPN IP 不同，可以設定環境變數：

```bash
export PI_HOST_VPN="your-vpn-ip"
./pi_docker/deploy-to-pi1.sh
```

### 方法 2: 使用標準部署腳本

如果可以直接連接到 pi5（非 VPN）：

```bash
./pi_docker/deploy-to-pi.sh
```

### 方法 3: 手動部署

如果自動化腳本無法使用，可以手動部署：

```bash
# 1. SSH 到 pi5
ssh gilko@10.1.1.85  # 或使用 VPN IP

# 2. 進入專案目錄
cd /home/gilko/diet-daily

# 3. 拉取最新代碼
git pull origin main

# 4. 重新建置並重啟容器
cd pi_docker
docker compose build
docker compose restart

# 5. 檢查日誌確認部署成功
docker compose logs --tail 50 | grep -E 'gamification|streak|error'
```

### 方法 4: 檢查並驗證部署

部署後，可以測試 API 端點：

```bash
# 在本地測試（需要有效的 access token）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://gilko.redirectme.net/api/mobile/gamification/streak?userId=YOUR_USER_ID"
```

## 需要部署的文件

- `src/app/api/mobile/gamification/streak/route.ts` - API 路由處理器
- 相關的資料庫 migration（`019_create_gamification_tables.sql`）應該已經執行

## 驗證步驟

1. **確認 API 路由存在**：
   ```bash
   # 在 pi5 上檢查
   ls -la /home/gilko/diet-daily/src/app/api/mobile/gamification/streak/route.ts
   ```

2. **檢查 Docker 容器狀態**：
   ```bash
   docker compose ps
   ```

3. **查看應用程式日誌**：
   ```bash
   docker compose logs --tail 100 | grep -i streak
   ```

4. **測試 API 端點**：
   在 iOS app 中重新載入「進度」頁面，檢查是否仍出現 404 錯誤。

## 注意事項

1. 部署後需要重新啟動 Docker 容器才能載入新的 API 路由
2. 確保資料庫 migration `019` 已執行（用戶已確認）
3. 確保環境變數 `EXPO_PUBLIC_API_URL` 在 iOS app 中設定為 `https://gilko.redirectme.net`
4. 如果使用 VPN，確保 VPN 連接穩定

## 故障排除

如果部署後仍然出現 404：

1. **檢查 Next.js 路由**：
   - 確認文件路徑正確：`src/app/api/mobile/gamification/streak/route.ts`
   - 確認文件已同步到 pi5

2. **檢查 Docker 建置**：
   ```bash
   docker compose logs | grep -i "error\|fail"
   ```

3. **檢查 Nginx 配置**：
   - 確認 `/api` 路徑正確代理到 Next.js 應用程式

4. **清除快取**：
   ```bash
   docker compose restart
   ```

