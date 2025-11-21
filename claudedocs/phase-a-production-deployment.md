# Phase A 生產環境部署指南

## 部署環境資訊

- **Web 應用**: https://gilko.redirectme.net
- **部署位置**: Raspberry Pi 5
- **Supabase 專案**: https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/

## 問題診斷

### 當前問題
iOS app 在呼叫 `/api/mobile/data-coverage` 時回傳 404 錯誤。

### 可能原因
1. **Next.js 應用未重新部署**：新的 API 路由檔案可能還沒有部署到 pi5
2. **Docker 容器未重新啟動**：即使檔案已部署，容器可能需要重新啟動
3. **iOS app API URL 配置錯誤**：可能還在使用 localhost 或舊的 URL

## 解決步驟

### 步驟 1: 確認 iOS app 環境變數配置

**檔案位置**: `mobile/react-native-starter-kit/DietDailyMobile/.env`

```env
EXPO_PUBLIC_API_URL=https://gilko.redirectme.net
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://lbjeyvvierxcnrytuvto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

**重要**：
- ✅ 使用 `https://` 而不是 `http://`
- ✅ 不要包含端口號（Nginx 會處理）
- ✅ 不要包含 `/api` 後綴（DashboardService 會自動加上）

### 步驟 2: 部署新的 API 路由到 pi5

#### 方法 1: 使用 Git 部署（推薦）

```bash
# 在本地確認變更已 commit
cd /Users/gilko/Documents/claude-code/diet_dialy
git status

# 推送到遠端
git push

# 在 pi5 上拉取更新
ssh pi5
cd /home/gilko/diet-daily
git pull

# 重新建置 Docker 容器
docker compose build
docker compose up -d

# 檢查容器狀態
docker ps
docker logs diet-daily-web -f --tail 50
```

#### 方法 2: 直接複製檔案

```bash
# 在本地
cd /Users/gilko/Documents/claude-code/diet_dialy

# 複製 API 路由檔案到 pi5
scp -r src/app/api/mobile pi5:/home/gilko/diet-daily/src/app/api/

# 在 pi5 上重新啟動容器
ssh pi5
cd /home/gilko/diet-daily
docker compose restart
```

### 步驟 3: 驗證 API 端點

使用測試腳本：

```bash
# 在本地測試
./scripts/test-production-api-endpoints.sh <userId>
```

或在瀏覽器中直接訪問：
- https://gilko.redirectme.net/api/mobile/data-coverage?userId=test
- 應該看到 JSON 回應（可能是 400 或 401，但不應該是 404）

### 步驟 4: 重新建置 iOS app

如果 API URL 配置有變更：

```bash
cd mobile/react-native-starter-kit/DietDailyMobile

# 清除快取
npx expo start --clear

# 或重新建置
npm run ios
```

## 驗證清單

### API 端點驗證
- [ ] `https://gilko.redirectme.net/api/mobile/data-coverage` 可訪問（不是 404）
- [ ] `https://gilko.redirectme.net/api/mobile/data-coverage/alerts` 可訪問（不是 404）
- [ ] 其他 API 端點正常（例如 `/api/foods`）

### iOS app 驗證
- [ ] `EXPO_PUBLIC_API_URL=https://gilko.redirectme.net` 已設定
- [ ] Console 日誌顯示正確的 API URL
- [ ] 資料覆蓋率卡片顯示
- [ ] 缺漏提醒卡片顯示（如果有缺漏）

### 伺服器日誌驗證
在 pi5 上檢查 Next.js 日誌：

```bash
docker logs diet-daily-web -f --tail 50
```

應該看到：
```
[MobileDataCoverage] GET request received: ...
```

## 常見問題

### Q: 為什麼會出現 404？
A: 最可能的原因是：
1. Next.js 應用未重新部署（新的 API 路由檔案不存在）
2. Docker 容器未重新啟動（舊的程式碼還在運行）

### Q: 如何確認 API 路由已部署？
A: 在 pi5 上檢查：

```bash
ssh pi5
ls -la /home/gilko/diet-daily/src/app/api/mobile/data-coverage/
```

應該看到 `route.ts` 檔案。

### Q: iOS app 如何知道使用哪個 API URL？
A: 透過環境變數 `EXPO_PUBLIC_API_URL`。在 Expo 中，這個變數需要在建置時設定，或在 `.env` 檔案中設定。

### Q: 需要重新建置 iOS app 嗎？
A: 如果只更改了 API URL 配置，通常只需要：
1. 更新 `.env` 檔案
2. 重新啟動 Expo 開發伺服器（`npx expo start --clear`）

如果更改了程式碼，可能需要重新建置。

## 快速修復命令

```bash
# 1. 在本地確認變更已 commit
cd /Users/gilko/Documents/claude-code/diet_dialy
git status
git add -A
git commit -m "feat: Phase A mobile API endpoints"

# 2. 推送到遠端
git push

# 3. 在 pi5 上部署（SSH 到 pi5）
ssh pi5
cd /home/gilko/diet-daily
git pull
docker compose build
docker compose up -d

# 4. 驗證部署
curl -I https://gilko.redirectme.net/api/mobile/data-coverage?userId=test

# 5. 檢查日誌
docker logs diet-daily-web -f --tail 50
```

