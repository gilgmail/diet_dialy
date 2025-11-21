# 遊戲化 API 部署指南

## 問題
iOS app 呼叫 `/api/mobile/gamification/streak` 時返回 404 錯誤，因為新的 API 路由尚未部署到生產環境。

## 部署步驟

### 1. 在 pi5 服務器上拉取最新代碼

```bash
ssh gilko@10.1.1.85
cd /path/to/diet_dialy  # 替換為實際的專案路徑
git pull origin main
```

### 2. 重新建置 Docker 容器

```bash
# 在 pi5 上執行
cd /path/to/diet_dialy
docker-compose build
```

### 3. 重啟 Docker 容器

```bash
docker-compose restart diet-daily-web
# 或
docker-compose up -d --force-recreate diet-daily-web
```

### 4. 驗證部署

```bash
# 測試 API 端點（需要有效的 token）
curl -H "Authorization: Bearer <token>" \
  "https://gilko.redirectme.net/api/mobile/gamification/streak?userId=<userId>"
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

