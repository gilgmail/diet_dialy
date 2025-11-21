# Phase A iOS App 404 錯誤除錯指南

## 問題描述
iOS app 在呼叫 `/api/mobile/data-coverage` 和 `/api/mobile/data-coverage/alerts` 時回傳 404 錯誤。

## 錯誤訊息
```
ERROR [TodayScreen] Data Coverage error: [Error: HTTP 404: <!DOCTYPE html>...]
ERROR [TodayScreen] Missing Alerts error: [Error: HTTP 404: <!DOCTYPE html>...]
```

## 可能原因

### 1. Next.js 開發伺服器需要重新啟動
**最可能的原因**：Next.js 在開發模式下需要重新啟動才能識別新的 API 路由。

**解決方法**：
```bash
# 停止當前的 Next.js 開發伺服器 (Ctrl+C)
# 然後重新啟動
npm run dev
```

### 2. API URL 配置錯誤
檢查 iOS app 的環境變數配置：
- `EXPO_PUBLIC_API_URL` 應該指向 Next.js 開發伺服器
- 開發環境：`http://localhost:3000` 或 `http://<your-ip>:3000`
- 生產環境：你的部署 URL

**檢查方法**：
在 iOS app 的 Console 中應該看到：
```
[DashboardService] Fetching data coverage from: http://localhost:3000/api/mobile/data-coverage?userId=...
```

如果沒有看到這個日誌，表示：
- `EXPO_PUBLIC_API_URL` 沒有配置
- 或者 API URL 配置錯誤

### 3. 路由檔案路徑問題
確認路由檔案存在且路徑正確：
- `src/app/api/mobile/data-coverage/route.ts`
- `src/app/api/mobile/data-coverage/alerts/route.ts`

**檢查方法**：
```bash
find src/app/api/mobile -name "route.ts" -type f
```

應該看到：
```
src/app/api/mobile/data-coverage/alerts/route.ts
src/app/api/mobile/data-coverage/route.ts
```

### 4. Next.js 路由快取問題
Next.js 可能會快取路由配置。

**解決方法**：
```bash
# 清除 Next.js 快取
rm -rf .next
npm run dev
```

## 除錯步驟

### 步驟 1: 檢查 Next.js 是否正在運行
```bash
# 應該看到類似 "Ready on http://localhost:3000" 的訊息
```

### 步驟 2: 檢查 API 路由是否可訪問
在瀏覽器中訪問：
- `http://localhost:3000/api/mobile/data-coverage?userId=test`
- 應該看到 JSON 回應（可能是 400 或 401，但不應該是 404）

### 步驟 3: 檢查 iOS app 的 API URL 配置
在 iOS app 的 Console 中查看：
```
[DashboardService] Fetching data coverage from: <URL>
```

確認 URL 是否正確。

### 步驟 4: 檢查 Next.js 伺服器日誌
在 Next.js 開發伺服器的終端中應該看到：
```
[MobileDataCoverage] GET request received: { url: '...', method: 'GET', ... }
```

如果沒有看到這個日誌，表示請求沒有到達 API 端點。

## 快速修復

1. **重新啟動 Next.js 開發伺服器**：
   ```bash
   # 停止伺服器 (Ctrl+C)
   npm run dev
   ```

2. **清除 Next.js 快取**：
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **確認 API URL 配置**：
   檢查 iOS app 的 `.env` 或環境變數配置：
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

4. **重新載入 iOS app**：
   在 iOS app 中重新載入或重新啟動 app。

## 驗證

修復後，應該看到：
1. iOS app Console 中：
   ```
   [DashboardService] Fetching data coverage from: http://localhost:3000/api/mobile/data-coverage?userId=...
   [DashboardService] Data coverage response: { status: 200, ... }
   ```

2. Next.js 伺服器日誌中：
   ```
   [MobileDataCoverage] GET request received: ...
   ```

3. iOS app 中顯示資料覆蓋率卡片和缺漏提醒。

