# 遊戲化 API 部署指南

## 問題
iOS app 呼叫 `/api/mobile/gamification/streak` 時返回 404 錯誤，因為新的 API 路由尚未部署到生產環境。

## 部署步驟

### 使用自動化部署腳本（推薦）

使用現有的 `deploy-to-pi.sh` 腳本進行部署：

```bash
# 在專案根目錄執行
./pi_docker/deploy-to-pi.sh
```

這個腳本會自動：
1. 檢查 SSH 連接
2. 使用 rsync 同步代碼到 pi5
3. 複製環境變數檔案
4. 建置並啟動 Docker 容器
5. 驗證部署狀態

### 手動部署（如果需要）

如果自動化腳本無法使用，可以手動執行：

```bash
# 1. SSH 到 pi5
ssh gilko@10.1.1.85

# 2. 進入專案目錄
cd /home/gilko/diet-daily  # 根據實際路徑調整

# 3. 拉取最新代碼（如果使用 git）
git pull origin main

# 4. 重新建置並重啟容器
cd pi_docker
docker compose build
docker compose up -d

# 5. 檢查日誌
docker compose logs --tail 50 | grep -E 'gamification|streak|error'
```

## 新增的 API 端點

- `GET /api/mobile/gamification/streak?userId=xxx`
  - 功能：取得使用者連續記錄天數
  - 認證：需要 Bearer token
  - 返回：`{ success: true, streak: { currentStreak, longestStreak, milestones } }`

## 注意事項

1. 確保資料庫 migration `019_create_gamification_tables.sql` 已執行
2. 確保環境變數 `EXPO_PUBLIC_API_URL` 在 iOS app 中設定為 `https://gilko.redirectme.net`
3. 部署後需要重新啟動 iOS app 才能使用新功能

