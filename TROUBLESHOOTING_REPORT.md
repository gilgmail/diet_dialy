# 問題診斷報告 - 2025-10-28

## 🔍 問題清單

### 1. PDF 檔案過大 (>10MB)
**症狀**: 即使使用純文字生成，PDF 仍超過 10MB

**根本原因**:
- API route (`/api/ai/weekly-ibd-analysis/[reportId]/pdf/route.ts`) 使用 `pdf-lib`
- 完整嵌入 `NotoSansCJKtc-Regular.otf` 字體檔案 (line 39-41)
- Noto Sans CJK 包含完整中日韓文字集，單一字體檔 10-20MB

**解決方案**:
- **方案 A**: 使用 PDF 標準字體（Helvetica）+ Unicode 文字（不嵌入字體）
- **方案 B**: 使用字體子集化（font subsetting）只嵌入使用的字符
- **方案 C**: 切換到較小的中文字體（如 Noto Sans TC Regular subset）

**推薦**: 方案 A - 最簡單且檔案最小

### 2. Safari 檢視摘要問題
**症狀**: Safari 無法正常開啟分享的 HTML 摘要

**診斷**:
- 使用 FileSystem.File API 寫入 HTML
- 使用 Sharing.shareAsync 分享
- iOS Safari 對 HTML 檔案的處理可能有限制

**可能原因**:
1. HTML 內容過於複雜
2. MIME type 設定問題
3. iOS 安全性限制

**需要測試**:
- 簡化 HTML 內容
- 改用 WebView 預覽而非分享
- 檢查實際錯誤訊息

### 3. 版本號顯示
**需求**: iOS App 和 Web 都要顯示版本號

**實現位置**:
- **iOS App**: 從 `app.json` 讀取 version 和 buildNumber
- **Web**: 從 `package.json` 讀取 version

**實現方式**:
- iOS: Settings 頁面底部顯示
- Web: Footer 或 Settings 頁面顯示

## 📋 修復計劃

### 優先級 1: PDF 檔案大小 (Critical)
- [ ] 修改 PDF API route 移除字體嵌入
- [ ] 使用 PDF 標準字體或 Base14 字體
- [ ] 部署到 Pi5 並測試

### 優先級 2: 版本號顯示 (High)
- [ ] iOS App 讀取並顯示版本號
- [ ] Web App 顯示版本號
- [ ] 部署並驗證

### 優先級 3: Safari 問題 (Medium)
- [ ] 診斷實際錯誤訊息
- [ ] 測試替代方案（WebView）
- [ ] 實現並測試

## 🔧 技術細節

### PDF 字體嵌入問題

**Before (嵌入完整字體 - 10-20MB)**:
```typescript
const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansCJKtc-Regular.otf')
const fontBytes = await readFile(fontPath)
const font = await pdfDoc.embedFont(fontBytes)  // 嵌入 10-20MB 字體
```

**After (使用標準字體 - < 100KB)**:
```typescript
import { StandardFonts } from 'pdf-lib'
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
// 或直接使用 PDF 內建字體，不嵌入任何檔案
```

### 預期改善

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| PDF 檔案大小 | 10-20 MB | < 100 KB | 99% ↓ |
| 生成速度 | 2-3 秒 | < 0.5 秒 | 75% ↑ |
| 記憶體使用 | 30-50 MB | < 5 MB | 90% ↓ |

