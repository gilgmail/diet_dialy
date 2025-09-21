# Google Sheets同步功能測試報告

## 🎯 測試目標
驗證修復的Google Sheets同步功能，重點檢查：
1. 自動初始化醫療數據服務成功
2. 工作表創建成功（使用新的"FoodDiary"名稱，無空格）
3. 食物記錄同步到Google Sheets成功（不再出現400錯誤）
4. 控制台顯示成功的同步日誌

## 🔍 發現的問題與修復

### ✅ 已修復問題
1. **Redirect URI端口不匹配**:
   - 問題: `.env.local`中配置為port 3000，但服務器運行在3001
   - 修復: 更新`NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback`

### 🧩 系統架構分析

#### OAuth認證流程:
```
/auth → GoogleAuthButton → Google OAuth → /api/auth/google/callback → /google-sync
```

#### 關鍵發現:
1. **認證頁面**: `/auth` - 顯示Google登入按鈕
2. **OAuth回調**: `/api/auth/google/callback` - 處理Google認證回調
3. **同步頁面**: `/google-sync` - 實際的Google Sheets同步功能頁面
4. **食物日記**: `/food-diary` - 需要認證後才能正常使用

## 📋 完整測試流程

### 步驟 1: 服務器狀態確認
- ✅ Next.js開發服務器成功啟動在 http://localhost:3001
- ✅ 環境變量配置已修復端口匹配問題
- ✅ `/auth`和`/food-diary`頁面均可正常訪問 (HTTP 200)

### 步驟 2: 控制台日誌分析
**當前狀態**（未認證時的日誌）:
```
🔍 檢查認證狀態: { hasTokens: false, hasUserInfo: false, userEmail: undefined }
❌ 認證失敗: 缺少 token 或用戶資訊
```

這是正常的，因為用戶尚未進行Google OAuth認證。

### 步驟 3: 手動測試指南

#### A. Google OAuth認證測試
1. **訪問認證頁面**: http://localhost:3001/auth
   - 預期: 顯示"Connect Google Account"按鈕
   - 實際: ✅ 頁面正常載入

2. **執行OAuth流程**:
   - 點擊Google登入按鈕
   - 完成Google授權
   - 預期重定向到: `/google-sync`

#### B. Google Sheets同步測試
1. **訪問同步頁面**: http://localhost:3001/google-sync
   - 預期: 顯示認證狀態和Google Sheets創建選項
   - 功能: 創建包含"食物歷史"、"症狀記錄"、"醫療檔案"的工作表

2. **測試工作表創建**:
   - 點擊"創建 Google Sheets"按鈕
   - 預期創建標題: `Diet Daily - 飲食記錄 - YYYY-MM-DD`
   - 預期工作表結構: 3個分頁，完整的標題行

#### C. 食物記錄同步測試
1. **訪問食物日記**: http://localhost:3001/food-diary
   - 預期: 認證後可正常使用，無"Medical data service not initialized"錯誤
   - 預期: 添加食物記錄時自動同步到Google Sheets

## 🔧 需要Google Console配置確認

### 重要提醒
Google Cloud Console中的OAuth客戶端設定必須包含:
```
已授權的重新導向URI:
- http://localhost:3001/api/auth/google/callback
```

如果包含舊的3000端口，需要更新為3001或添加3001端口的URI。

## 📊 預期測試結果

### ✅ 成功指標:
```javascript
// 認證成功後的控制台日誌
🔍 檢查認證狀態: { hasTokens: true, hasUserInfo: true, userEmail: "user@example.com" }
✅ 認證成功
🏗️ 初始化醫療數據服務...
✅ 醫療數據服務初始化成功
📊 正在創建工作表...
✅ Google Sheets 創建成功: [spreadsheet_id]
📝 正在同步食物記錄到Google Sheets...
✅ 食物記錄同步成功
```

### ❌ 失敗指標（需要修復）:
```javascript
❌ 認證失敗: 缺少 token 或用戶資訊
❌ Medical data service not initialized
❌ Google Sheets API錯誤: 400 Bad Request
```

## 🧪 具體測試步驟

### 立即可執行的測試:
1. **基本連接測試**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/auth
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/google-sync
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/food-diary
   ```
   預期結果: 全部返回200

2. **手動OAuth測試**:
   - 開啟瀏覽器開發者工具
   - 訪問 http://localhost:3001/auth
   - 監控Network標籤的請求
   - 完成Google OAuth流程

3. **同步功能測試**:
   - 認證成功後訪問 http://localhost:3001/google-sync
   - 創建Google Sheets
   - 測試食物記錄同步

## 🎯 重點驗證項目

### 1. OAuth流程完整性
- [ ] 認證頁面正確顯示
- [ ] Google OAuth重定向成功
- [ ] 回調處理正確
- [ ] 認證狀態正確更新

### 2. Google Sheets整合
- [ ] 工作表創建成功
- [ ] 標題行設置正確
- [ ] 數據同步無錯誤
- [ ] API響應狀態為200

### 3. 錯誤處理改進
- [ ] 無"Medical data service not initialized"錯誤
- [ ] 無400 Bad Request錯誤
- [ ] 用戶友好的錯誤信息

## 📈 下一步行動

1. **立即測試**: 使用瀏覽器手動執行OAuth流程
2. **驗證API**: 確認Google Console OAuth設定
3. **功能測試**: 測試完整的食物記錄同步流程
4. **性能監控**: 觀察API響應時間和成功率

## 🏁 測試結論模板

測試完成後請記錄:
- [ ] OAuth認證: ✅成功 / ❌失敗（原因: ___）
- [ ] 工作表創建: ✅成功 / ❌失敗（原因: ___）
- [ ] 食物記錄同步: ✅成功 / ❌失敗（原因: ___）
- [ ] 錯誤修復確認: ✅已修復 / ❌仍存在（詳情: ___）

---

**服務器狀態**: 🟢 運行中 (http://localhost:3001)
**測試時間**: 2025-09-19 22:32
**主要修復**: redirect URI端口匹配問題已解決