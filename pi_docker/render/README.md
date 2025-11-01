# Render 部署指南

本資料夾提供將 Diet Daily API/前端部署到 [Render](https://render.com/) 所需的設定檔與步驟。部署時建議使用 **Standard** 方案以確保服務 24x7 不會自動休眠。

## 1. 前置準備

1. Fork 或複製此專案到您 GitHub 帳號下（範例目標 repo：`gilko0725/diet-daily`）。
2. 確保專案根目錄包含完整的 Next.js 原始碼 (`package.json`, `next.config.js`, `src/` 等)。
3. 在 Render 建立帳號並綁定 GitHub。

## 2. 建立環境變數

Render 部署不會讀取 `.env` 檔案，請將必要變數複製到 Render 的 Environment Group：

1. 前往 Render Dashboard → **Environment Groups** → **New Environment Group**。
2. 名稱建議使用 `diet-daily-config`。
3. 依照 [`pi_docker/.env.render.example`](../.env.render.example) 或下列清單新增變數：

| Key | 說明 |
| --- | --- |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | 對外網址（Render 會自動提供） |
| `PORT` | `3000` |
| `NEXT_TELEMETRY_DISABLED` | `1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開金鑰 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 金鑰 |
| `NEXTAUTH_URL` | 同 `NEXT_PUBLIC_APP_URL` |
| `NEXTAUTH_SECRET` | 隨機安全字串 |
| `EXPO_PUBLIC_API_URL` | 供行動裝置連線的 API URL |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 等 | 視需求填寫 |

> 建議先在 Render 建立環境變數，再將環境群組套用到服務，部署會輕鬆許多。

## 3. 使用 `render.yaml` 建立服務

1. 在 Render Dashboard 選擇 **Blueprints** → **New Blueprint Instance**。
2. 指定 repo URL（例如 `https://github.com/gilko0725/diet-daily`）。
3. Render 會讀取 [`pi_docker/render/render.yaml`](render.yaml)，自動建立：
   - 一個 `type: web` 的 Docker 服務
   - 使用 `pi_docker/Dockerfile` 來建置
   - 健康檢查路徑為 `/api/health`
   - 套用 `diet-daily-config` 環境群組
4. 確認方案選擇 **Standard**（避免睡眠），部署完成後即可取得公開網址。

## 4. 手動建立（可選）

若偏好手動操作：

1. Render Dashboard → **New** → **Web Service**。
2. 選擇對應 Git repo 與分支。
3. 環境選擇 `Docker`，`Dockerfile path` 輸入 `pi_docker/Dockerfile`。
4. `Docker Build Context` 填 `.`（即專案根目錄）。
5. 於 **Advanced** 設定中指定：
   - Start Command：預設即可（取決於 Dockerfile `CMD`）。
   - Health Check Path：`/api/health`
   - Environment → Attach 剛才建立的 `diet-daily-config` Environment Group。
6. 建立後 Render 會自動建置與部署。

## 5. 部署後檢查

- 透過 Render Logs 確認 build / run 無錯誤。
- 打開服務網址（或 `/api/health`）確認 HTTP 200。
- 如需自訂網域，可於 Render → Custom Domains 進行綁定。

## 6. 維護注意事項

- 修改程式碼後推送到 GitHub，Render 會自動觸發重新部署（若未開啟可手動 Deploy）。
- 若需要環境調整，請直接編輯 Environment Group，Render 會啟動 rolling deploy。
- 請勿將真實密鑰留在 repo；使用 Environment Group 或 Render Secret Storage 管理。

---

完成以上步驟即可在 Render 上穩定運行 Diet Daily API。若要轉向其他雲服務，可以以此 Dockerfile 與環境設定為基礎再行調整。
