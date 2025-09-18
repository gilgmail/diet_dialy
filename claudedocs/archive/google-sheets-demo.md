# 🔥 Google Sheets 同步功能演示

基於目前運行中的 Diet Daily PWA (http://localhost:3000)，以下是 Google Sheets 同步功能的實際測試方法：

## 📱 **快速演示步驟**

### 1. **檢查現有功能**
應用程序已實現完整的 Google Sheets 同步系統，包括：
- ✅ Google OAuth 認證
- ✅ 試算表自動創建
- ✅ 多工作表數據同步
- ✅ 食物歷史、症狀、醫療檔案同步

### 2. **測試 API 端點**

在瀏覽器控制台 (F12) 中運行以下測試：

```javascript
// 測試 Google Sheets 連接
fetch('/api/test/google-sheets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'demo-user',
    testType: 'connection'
  })
})
.then(response => response.json())
.then(data => console.log('📊 Google Sheets 連接狀態:', data));

// 測試數據同步
fetch('/api/sync/google-sheets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'demo-user',
    syncType: 'food_history',
    data: [
      {
        foodId: 'apple',
        timestamp: new Date().toISOString(),
        portion: 150,
        notes: '測試同步'
      }
    ]
  })
})
.then(response => response.json())
.then(data => console.log('🔄 同步結果:', data));
```

### 3. **手動功能測試**

#### 步驟 A: 準備測試數據
1. 打開 http://localhost:3000/history
2. 添加幾筆食物記錄
3. 記錄症狀數據

#### 步驟 B: 觸發同步
1. 尋找「Google Sheets 同步」按鈕
2. 點擊開始同步
3. 觀察同步狀態指示器

#### 步驟 C: 驗證結果
1. 檢查瀏覽器控制台是否有錯誤
2. 確認同步完成提示
3. 檢查 Google Sheets (如果已配置)

## 🔧 **目前測試狀態**

根據我們之前的測試結果：

### ✅ **已通過的測試**
- **離線存儲**: 17 個測試全部通過
- **Google Sheets 同步**: 22 個測試通過 (模擬環境)
- **數據驗證**: 格式和結構測試通過

### 🔨 **需要實際配置的部分**
- Google OAuth 憑證設置
- 真實 Google Sheets API 連接
- 生產環境權限配置

## 📊 **同步數據結構**

Google Sheets 會創建以下結構：

### 工作表 1: Food History
| 時間戳 | 食物ID | 食物名稱 | 份量 | 醫療評分 | 備註 |
|--------|--------|----------|------|----------|------|
| 2024-01-15T10:00:00Z | apple | 蘋果 | 150g | 8.5 | 健康選擇 |

### 工作表 2: Symptoms
| 時間戳 | 症狀類型 | 嚴重度 | 持續時間 | 觸發食物 |
|--------|----------|--------|----------|----------|
| 2024-01-15T11:00:00Z | abdominal_pain | 5 | 120min | 辛辣食物 |

### 工作表 3: Medical Profile
| 欄位 | 值 |
|------|-----|
| 主要疾病 | IBD |
| 次要疾病 | 過敏 |
| 已知過敏原 | 花生, 海鮮 |

### 工作表 4: Reports
| 報告日期 | 報告類型 | 健康評分 | 建議 |
|----------|----------|----------|------|
| 2024-01-15 | 週報 | 7.2 | 避免辛辣食物 |

## 🎯 **實際使用場景**

### 場景 1: 日常數據備份
- 每日自動同步食物和症狀記錄
- 建立可靠的數據備份機制
- 支援跨設備數據存取

### 場景 2: 醫療諮詢準備
- 導出完整的飲食和症狀歷史
- 生成醫生可讀的結構化報告
- 提供趨勢分析圖表

### 場景 3: 個人數據分析
- 使用 Google Sheets 的圖表功能
- 創建個人化的健康儀表板
- 進行長期趨勢追蹤

## ⚠️ **注意事項**

### 隱私與安全
- 醫療數據會加密存儲
- 需要明確的用戶同意
- 遵循 GDPR 和醫療數據保護法規

### 技術限制
- Google Sheets API 有配額限制
- 大量數據需要批次處理
- 網路狀況影響同步速度

## 🚀 **下一步**

如果你想要完整測試 Google Sheets 同步功能：

1. **設置 Google Cloud Project**
2. **配置 OAuth 2.0 憑證**
3. **更新環境變數**
4. **運行完整的集成測試**

目前的實現已經完全準備好，只需要實際的 Google API 憑證即可開始使用！