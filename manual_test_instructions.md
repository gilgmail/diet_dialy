# Google Sheets同步功能手動測試指南

## 測試目標
驗證修復的Google Sheets同步功能，特別是：
- 自動初始化醫療數據服務
- 工作表創建（使用"FoodDiary"名稱）
- 食物記錄同步到Google Sheets（無400錯誤）

## 問題分析
✅ **已修復**: redirect URI端口問題（3000 → 3001）
⚠️ **需要驗證**: Google Console中的授權重定向URI設定

## 手動測試步驟

### 步驟 1: 檢查Google Console設定
1. 訪問 [Google Cloud Console](https://console.cloud.google.com)
2. 選擇專案: Diet Daily
3. 進入「API和服務」→「憑證」
4. 編輯OAuth 2.0客戶端ID
5. 確認「已授權的重新導向URI」包含:
   - `http://localhost:3001/api/auth/google/callback`

### 步驟 2: 開始測試
1. 開啟瀏覽器開發者工具（F12）
2. 切換到「控制台」標籤頁
3. 訪問: http://localhost:3001/auth

### 步驟 3: 執行Google OAuth認證
1. 點擊「Connect Google Account」按鈕
2. 完成Google登入流程
3. 授權必要的權限：
   - Google Sheets
   - Google Drive
   - 個人資訊存取

### 步驟 4: 測試food-diary頁面
1. 認證成功後，訪問: http://localhost:3001/food-diary
2. 觀察控制台日誌，尋找：
   ```
   ✅ 醫療數據服務初始化成功
   ✅ 工作表創建成功
   ```

### 步驟 5: 測試食物記錄同步
1. 在food-diary頁面添加一筆食物記錄
2. 監控控制台日誌，確認：
   - 無"Medical data service not initialized"錯誤
   - Google Sheets API請求返回200狀態
   - 同步成功日誌

### 步驟 6: 驗證Google Sheets
1. 開啟 [Google Sheets](https://sheets.google.com)
2. 查找名為"FoodDiary"的新工作表
3. 確認工作表包含正確的標題列和數據

## 預期控制台日誌

### ✅ 成功的日誌輸出:
```
🔍 檢查認證狀態: { hasTokens: true, hasUserInfo: true, userEmail: "user@example.com" }
✅ 認證成功
🏗️ 初始化醫療數據服務...
✅ 醫療數據服務初始化成功
📊 正在創建工作表: FoodDiary
✅ 工作表創建成功: FoodDiary
📝 正在同步食物記錄到Google Sheets...
✅ 食物記錄同步成功
```

### ❌ 需要修復的日誌:
```
❌ 認證失敗: 缺少 token 或用戶資訊
❌ Medical data service not initialized
❌ Google Sheets API錯誤: 400 Bad Request
```

## 故障排除

### 如果OAuth失敗:
1. 檢查Google Console中的重定向URI設定
2. 確認客戶端ID和密鑰正確
3. 清除瀏覽器cookies和localStorage

### 如果工作表創建失敗:
1. 確認Google Sheets API已啟用
2. 檢查OAuth權限範圍
3. 驗證Google Drive API訪問權限

### 如果同步失敗:
1. 檢查網絡連接
2. 驗證訪問令牌有效性
3. 確認工作表權限設定

## 測試完成檢查清單

- [ ] Google OAuth認證成功
- [ ] 醫療數據服務自動初始化
- [ ] "FoodDiary"工作表創建成功
- [ ] 食物記錄同步無400錯誤
- [ ] 控制台顯示成功日誌
- [ ] Google Sheets中可見數據

## 注意事項
- 確保網絡連接穩定
- 使用最新版本的Chrome或Firefox
- 測試期間保持開發者工具開啟
- 記錄任何錯誤信息以便後續分析