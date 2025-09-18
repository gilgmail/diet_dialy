# Diet Daily PWA 測試指南

## 快速開始

### 1. 運行完整測試套件
```bash
# 運行所有測試
npm test

# 運行完整測試腳本（推薦）
./scripts/test-all.sh
```

### 2. 運行特定測試
```bash
# 測試離線功能（✅ 正常運行）
npm test -- --testPathPattern="offline-storage"

# 測試 Google Sheets 同步（✅ 正常運行）
npm test -- --testPathPattern="google-sheets-sync"

# 測試 PDF 導出（⚠️ 需要修復）
npm test -- --testPathPattern="PDFExportButton"

# 測試圖表組件（⚠️ 需要修復）
npm test -- --testPathPattern="SymptomTrendsChart"
```

### 3. 生成覆蓋率報告
```bash
npm test -- --coverage
```

## 手動功能測試

### 啟動應用
```bash
npm run dev
```
然後在瀏覽器中打開 `http://localhost:3000`

### Week 4 新功能測試清單

#### 📈 互動式圖表測試
1. 進入症狀追蹤頁面
2. 檢查是否顯示四種圖表類型：
   - 頻率趨勢（線圖）
   - 嚴重度分析（條形圖）
   - 食物關聯（條形圖）
   - 改善趨勢（餅圖）
3. 驗證圖表響應式設計

#### 📄 PDF 導出測試
1. 進入報告頁面
2. 點擊「導出 PDF」按鈕
3. 驗證 PDF 生成和下載
4. 檢查 PDF 內容格式

#### 📱 離線功能測試
1. 啟動應用
2. 斷開網路連接
3. 檢查離線指示器顯示
4. 嘗試添加食物記錄
5. 重新連接網路
6. 驗證數據同步

#### 📊 Google Sheets 同步測試
1. 配置 Google API 憑證
2. 測試創建新試算表
3. 驗證數據同步功能
4. 檢查試算表結構

### PWA 功能測試

#### 安裝測試
1. 在支援的瀏覽器中打開應用
2. 檢查「安裝應用」提示
3. 測試 PWA 安裝流程

#### 服務工作者測試
1. 打開開發者工具
2. 檢查 Application > Service Workers
3. 驗證服務工作者註冊
4. 測試快取策略

## 測試結果解讀

### ✅ 通過的測試
- **離線存儲管理**：15 個測試，58% 覆蓋率
- **Google Sheets 同步**：22 個測試，API 模擬完整

### ⚠️ 需要修復的測試
- **PDF 導出組件**：文字匹配和 DOM 模擬問題
- **症狀趨勢圖表**：圖表庫相容性問題
- **醫療評分引擎**：ES6 模組相容性問題

### 覆蓋率目標
- 當前總覆蓋率：8.35%
- 目標總覆蓋率：85%
- 核心醫療邏輯：需要達到 100%

## 常見問題解決

### Q: 測試運行時出現 ES6 模組錯誤
A: 檢查 `jest.config.js` 中的 `transformIgnorePatterns` 設置

### Q: 圖表組件測試失敗
A: 確保 recharts 相關依賴已正確模擬

### Q: PDF 導出測試超時
A: 檢查測試中的異步操作和 DOM 模擬設置

### Q: 離線功能測試失敗
A: 驗證 localStorage 模擬和網路狀態模擬

## 持續集成建議

### GitHub Actions 配置
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - run: npm run build
```

### 測試質量門檻
- 單元測試通過率：100%
- 覆蓋率：>80%
- 構建成功：必須
- 代碼檢查：無錯誤

## 下一步改進

### 優先級 1（本週）
1. 修復 PDF 導出組件測試
2. 解決圖表組件渲染問題
3. 修復醫療評分引擎測試

### 優先級 2（下週）
1. 增加端到端測試
2. 實現可視化測試
3. 添加性能測試

### 優先級 3（未來）
1. 自動化無障礙測試
2. 跨瀏覽器測試
3. 負載測試

## 聯繫和支援

如果遇到測試相關問題，請檢查：
1. `claudedocs/test-quality-analysis.md` - 詳細測試分析
2. `claudedocs/sc-test-final-report.md` - 完整測試報告
3. 項目 README.md 中的故障排除部分