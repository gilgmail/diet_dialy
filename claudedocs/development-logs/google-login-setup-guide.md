# 🔐 Google 個人帳號登入和 Google Sheets 同步設置指南

## 📋 概述

本指南將協助您設置 Google 個人帳號登入功能，並使用個人的 Google Sheets 作為食物歷史記錄的儲存平台。

## 🚀 功能特色

✅ **安全的 Google OAuth 認證**
- 使用官方 Google OAuth 2.0 流程
- 安全的 token 加密存儲
- 自動 token 刷新機制

✅ **個人 Google Sheets 整合**
- 自動創建專屬的飲食記錄試算表
- 實時同步食物歷史、症狀記錄和醫療檔案
- 完整的中文介面支持

✅ **隱私保護**
- 資料僅存儲在用戶的個人 Google 帳號中
- 應用程式不會儲存任何醫療資料
- 隨時可撤銷存取權限

## 🔧 設置步驟

### 步驟 1: Google Cloud Console 設置

1. **前往 Google Cloud Console**
   - 訪問 https://console.cloud.google.com/
   - 登入您的 Google 開發者帳號

2. **創建新專案或選擇現有專案**
   ```
   專案名稱建議: Diet-Daily-Personal
   ```

3. **啟用必要的 API**
   - Google Sheets API
   - Google Drive API

   **注意**: OAuth 2.0 用戶登入功能是內建的，不需要額外啟用 API

4. **創建 OAuth 2.0 憑證**
   - 前往「憑證」頁面
   - 點擊「建立憑證」→「OAuth 用戶端 ID」
   - 應用程式類型：網路應用程式
   - 授權 JavaScript 來源：`http://localhost:3000`
   - 授權重新導向 URI：`http://localhost:3000/api/auth/google/callback`

### 步驟 2: 環境變數設置

1. **更新 `.env.local` 文件**
   ```bash
   # Google OAuth Configuration
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_google_client_id.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

2. **重新啟動開發伺服器**
   ```bash
   npm run dev
   ```

### 步驟 3: 使用 Google 登入功能

1. **訪問 Google 同步頁面**
   ```
   http://localhost:3000/google-sync
   ```

2. **點擊「Connect Google Account」按鈕**
   - 系統會重定向到 Google 認證頁面
   - 選擇您的 Google 帳號
   - 授權應用程式存取權限

3. **授權所需權限**
   - ✅ 查看您的基本個人資料資訊
   - ✅ 查看您的電子郵件地址
   - ✅ 在 Google 雲端硬碟中查看和管理試算表
   - ✅ 查看和管理 Google 雲端硬碟中的檔案

## 📊 Google Sheets 設置

### 自動創建試算表

1. **登入成功後點擊「創建 Google Sheets」**
   - 系統會自動在您的 Google Drive 中創建專屬試算表
   - 試算表名稱格式：`Diet Daily - 飲食記錄 - YYYY-MM-DD`

2. **試算表結構**
   ```
   工作表 1: 食物歷史
   - 日期、時間、食物ID、食物名稱、食物類別
   - 份量、單位、醫療評分、風險等級、過敏警告
   - 症狀前、症狀後、嚴重度、備註、位置

   工作表 2: 症狀記錄
   - 日期、時間、症狀類型、嚴重度、評分
   - 持續時間、觸發因子、相關食物、備註、活動影響

   工作表 3: 醫療檔案
   - 更新日期、主要條件、次要條件、已知過敏
   - 個人觸發因子、當前階段、乳糖不耐、纖維敏感
   - IBS 亞型、FODMAP 耐受性
   ```

### 手動同步資料

1. **同步食物記錄**
   - 點擊「同步食物記錄」按鈕
   - 系統會將本地的食物歷史同步到 Google Sheets
   - 同步完成後會顯示成功訊息

2. **查看同步結果**
   - 點擊「在 Google Sheets 中開啟」連結
   - 直接在瀏覽器中查看您的食物記錄

## 🔍 API 端點說明

### 認證相關 API

1. **Token 交換 API**
   ```
   POST /api/auth/google/token
   Body: { "code": "authorization_code" }
   ```

2. **Token 刷新 API**
   ```
   POST /api/auth/google/refresh
   Body: { "refresh_token": "refresh_token" }
   ```

3. **OAuth 回調處理**
   ```
   GET /api/auth/google/callback?code=...&state=...
   ```

### 同步相關 API

1. **Google Sheets 同步 API**
   ```
   POST /api/google-sheets/sync
   Body: {
     "access_token": "your_access_token",
     "spreadsheetId": "your_spreadsheet_id",
     "syncType": "food_history",
     "data": [...]
   }
   ```

## 🧪 測試功能

### 測試認證流程

1. **訪問 Google 同步頁面**
   ```bash
   curl -s http://localhost:3000/google-sync
   ```

2. **檢查 API 端點**
   ```bash
   # 檢查 Token 交換 API
   curl -X GET http://localhost:3000/api/auth/google/token

   # 檢查同步 API
   curl -X GET http://localhost:3000/api/google-sheets/sync
   ```

### 測試同步功能

1. **模擬食物記錄同步**
   ```javascript
   // 在瀏覽器控制台中執行
   fetch('/api/google-sheets/sync', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       access_token: 'your_access_token',
       spreadsheetId: 'your_spreadsheet_id',
       syncType: 'food_history',
       data: [
         {
           consumedAt: new Date().toISOString(),
           foodId: 'apple',
           foodData: { name_zh: '蘋果', category: '水果' },
           portion: { amount: 150, unit: '克' },
           medicalScore: { score: 8.5, level: '低風險' },
           notes: '健康選擇'
         }
       ]
     })
   })
   .then(response => response.json())
   .then(data => console.log('同步結果:', data));
   ```

## 🛡️ 安全性考量

### 資料保護

1. **Token 加密存儲**
   - 所有 Google OAuth tokens 都經過 AES-256-GCM 加密
   - 加密金鑰存儲在瀏覽器的安全存儲中

2. **CSRF 防護**
   - 使用 state 參數防止 CSRF 攻擊
   - 每次認證都會生成新的隨機 state

3. **Session 管理**
   - Token 自動過期管理
   - 24 小時 session 超時設置

### 隱私政策

1. **資料存儲位置**
   - ✅ 您的資料僅存儲在您的個人 Google 帳號中
   - ❌ 我們不會將您的資料儲存在我們的伺服器上

2. **存取權限控制**
   - 您可以隨時在 Google 帳號設置中撤銷應用程式存取權限
   - 應用程式只能存取您明確授權的資料

## ❓ 常見問題

### Q: 如何撤銷應用程式的 Google 帳號存取權限？

**A**: 前往 Google 帳號設置 → 安全性 → 第三方應用程式存取權限，找到 Diet Daily 應用程式並撤銷存取權限。

### Q: 我的食物記錄會被其他人看到嗎？

**A**: 不會。您的食物記錄僅存儲在您的個人 Google Sheets 中，只有您可以存取。

### Q: 如果我刪除了 Google Sheets，資料會怎樣？

**A**: 如果您刪除了 Google Sheets，資料會永久遺失。建議定期備份重要的醫療資料。

### Q: 同步失敗怎麼辦？

**A**: 請檢查：
1. 網路連接是否正常
2. Google 帳號是否仍然授權
3. Google Sheets 是否存在
4. 瀏覽器控制台是否有錯誤訊息

## 🎯 下一步

設置完成後，您可以：

1. **在食物歷史頁面添加食物記錄**
   - 訪問 `http://localhost:3000/history`
   - 添加您的日常飲食記錄

2. **定期同步到 Google Sheets**
   - 返回 Google 同步頁面
   - 定期點擊同步按鈕備份資料

3. **在 Google Sheets 中分析資料**
   - 使用 Google Sheets 的圖表功能
   - 創建個人化的健康儀表板

## 📞 技術支援

如果您在設置過程中遇到任何問題，請：

1. 檢查瀏覽器控制台的錯誤訊息
2. 確認 Google Cloud Console 的設置正確
3. 驗證環境變數配置無誤
4. 查看開發伺服器的日誌輸出

---

**重要提醒**: 這是個人醫療資料管理系統，請妥善保護您的 Google 帳號安全，定期更新密碼並開啟兩步驟驗證。