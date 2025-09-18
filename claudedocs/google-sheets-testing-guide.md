# Google Sheets 同步功能測試指南

## 📊 概述

Diet Daily PWA 的 Google Sheets 同步功能允許使用者將飲食和健康資料自動同步到 Google Sheets，實現數據備份和進階分析。

## 🔧 測試環境設置

### 1. 環境變數配置

在 `.env.local` 文件中設置以下變數：

```bash
# Google OAuth 2.0 憑證
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Google Sheets 設定
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
```

### 2. Google API 設置

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 啟用 Google Sheets API
4. 創建 OAuth 2.0 憑證
5. 設置重定向 URI

## 🧪 測試類型

### 1. 單元測試 ✅

```bash
# 運行 Google Sheets 同步測試
npm test -- --testPathPattern="google-sheets-sync"

# 預期結果：22 個測試全部通過
```

**測試覆蓋範圍：**
- ✅ 試算表創建
- ✅ 工作表管理
- ✅ 數據同步
- ✅ 錯誤處理
- ✅ API 模擬

### 2. 集成測試

#### 2.1 創建測試試算表

```bash
# 使用 curl 測試 API 端點
curl -X POST http://localhost:3000/api/google/spreadsheet \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "conditions": ["ibd", "allergies"]
  }'
```

#### 2.2 同步食物歷史

```bash
curl -X POST http://localhost:3000/api/google/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "type": "food_history",
    "data": [
      {
        "foodId": "apple",
        "timestamp": "2024-01-15T10:00:00Z",
        "portion": 150
      }
    ]
  }'
```

#### 2.3 同步症狀記錄

```bash
curl -X POST http://localhost:3000/api/google/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "type": "symptoms",
    "data": [
      {
        "type": "abdominal_pain",
        "severity": 5,
        "timestamp": "2024-01-15T11:00:00Z"
      }
    ]
  }'
```

### 3. 前端測試

#### 3.1 同步設置頁面

1. 打開 http://localhost:3000/settings
2. 找到「Google Sheets 同步」區塊
3. 點擊「連接 Google 帳戶」
4. 完成 OAuth 授權流程
5. 驗證連接狀態顯示為「已連接」

#### 3.2 手動同步測試

1. 前往 http://localhost:3000/history
2. 添加一些食物記錄
3. 點擊「同步到 Google Sheets」按鈕
4. 檢查同步狀態指示器
5. 驗證 Google Sheets 中的資料

#### 3.3 自動同步測試

1. 啟用自動同步設置
2. 添加新的食物記錄或症狀
3. 等待 5-10 分鐘
4. 檢查 Google Sheets 是否自動更新

## 📋 測試檢查清單

### ✅ 基本功能測試

- [ ] **試算表創建**: 能成功創建新的醫療資料試算表
- [ ] **工作表結構**: 包含 Food History, Symptoms, Reports, Profile 四個工作表
- [ ] **權限設置**: 試算表權限正確設置為私人可讀寫
- [ ] **標題格式**: 試算表標題包含日期和識別信息

### ✅ 數據同步測試

- [ ] **食物歷史同步**: 食物記錄正確同步到 Food History 工作表
- [ ] **症狀同步**: 症狀記錄正確同步到 Symptoms 工作表
- [ ] **醫療檔案同步**: 使用者醫療檔案同步到 Profile 工作表
- [ ] **報告同步**: 生成的醫療報告同步到 Reports 工作表

### ✅ 錯誤處理測試

- [ ] **認證失敗**: 無效的 Google 憑證返回適當錯誤
- [ ] **API 限制**: Google API 配額超限時的錯誤處理
- [ ] **網路錯誤**: 網路中斷時的重試機制
- [ ] **權限錯誤**: 試算表權限不足時的錯誤提示

### ✅ 性能測試

- [ ] **大量數據**: 1000+ 食物記錄的同步性能
- [ ] **批次處理**: 批次同步減少 API 調用次數
- [ ] **增量同步**: 只同步新增或修改的資料
- [ ] **背景同步**: 不阻塞主要使用者操作

## 🔍 除錯工具

### 1. 日誌檢查

```bash
# 查看同步日誌
tail -f logs/google-sync.log

# 過濾錯誤日誌
grep "ERROR" logs/google-sync.log
```

### 2. API 測試工具

```javascript
// 在瀏覽器控制台中測試
fetch('/api/google/test-connection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(response => response.json())
.then(data => console.log('連接狀態:', data));
```

### 3. 資料驗證

```bash
# 檢查本地和 Google Sheets 資料一致性
npm run verify-sync --userId=test-user
```

## 🚨 常見問題

### Q: 同步失敗，顯示「無效的憑證」
**A**: 檢查環境變數設置，確保 Google OAuth 憑證正確並且未過期。

### Q: 資料同步延遲很大
**A**: 檢查 Google API 配額使用情況，考慮實施更有效的批次同步策略。

### Q: 試算表權限錯誤
**A**: 確保使用的 Google 帳戶有建立和編輯試算表的權限。

### Q: 部分資料未同步
**A**: 檢查資料格式和試算表欄位映射，確保所有必要欄位都已正確設置。

## 📈 進階測試場景

### 1. 災難恢復測試

1. 刪除本地資料庫
2. 從 Google Sheets 恢復資料
3. 驗證資料完整性

### 2. 多使用者併發測試

1. 模擬多個使用者同時進行同步
2. 檢查資料衝突處理
3. 驗證性能影響

### 3. 長期穩定性測試

1. 連續運行同步 24 小時
2. 監控記憶體洩漏
3. 檢查錯誤累積情況

## 📝 測試報告範本

```markdown
## Google Sheets 同步測試報告

**測試日期**: 2024-01-15
**測試環境**: Development
**測試人員**: [姓名]

### 測試結果總覽
- 總測試案例: 25
- 通過: 23
- 失敗: 2
- 跳過: 0

### 失敗案例詳情
1. **大量資料同步**: 超過 1000 筆記錄時出現超時
2. **網路中斷恢復**: 重試機制未正確觸發

### 建議改進
1. 實施更有效的批次處理策略
2. 增強網路錯誤恢復機制
3. 添加進度指示器

### 結論
基本同步功能運行正常，需要對大量資料處理和錯誤恢復進行優化。
```

## 🎯 結論

Google Sheets 同步功能已通過基本測試，可以支援日常的資料備份和同步需求。建議在生產環境部署前完成所有進階測試場景的驗證。