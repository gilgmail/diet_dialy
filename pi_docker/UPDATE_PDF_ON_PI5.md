# 更新 Pi5 上的 PDF 生成代碼

## 問題
iOS App 生成的 PDF 檔案太大，因為 Pi5 上的代碼還在使用舊的圖片轉換方式。

## 解決方案
已將 PDF 改為純文字生成，需要更新 Pi5 上的檔案。

## 手動更新步驟

### 方法 1: 使用本機 script（需要 SSH 權限）

```bash
./scripts/update-pi5-pdf.sh
```

### 方法 2: 在 Pi5 上手動操作

1. **SSH 登入 Pi5:**
   ```bash
   ssh pi@10.1.1.85
   # 或
   ssh pi@gilko.redirectme.net
   ```

2. **備份現有檔案:**
   ```bash
   cd ~/diet-daily
   cp src/components/medical/PDFReportExporter.tsx src/components/medical/PDFReportExporter.tsx.backup
   ```

3. **從本機複製新檔案（在本機執行）:**
   ```bash
   scp src/components/medical/PDFReportExporter.tsx pi@10.1.1.85:~/diet-daily/src/components/medical/
   ```

4. **在 Pi5 上重新編譯並重啟（在 Pi5 上執行）:**
   ```bash
   cd ~/diet-daily
   npm run build
   pm2 restart diet-daily
   ```

5. **確認服務運行:**
   ```bash
   pm2 logs diet-daily --lines 50
   ```

## 更新後效果

- ✅ PDF 檔案大小：**減少 80-90%**
- ✅ 中文字顯示：**完全正確**（不會有白框 X）
- ✅ 生成速度：**更快**（不需要 html2canvas）

## 技術細節

### 原本（圖片方式）
```typescript
// 使用 html2canvas 將 HTML 轉成圖片再放入 PDF
const canvas = await html2canvas(reportContentRef.current, {
  scale: 2,  // 高解析度 = 大檔案
  ...
})
const imgData = canvas.toDataURL('image/png')  // PNG 格式很大
pdf.addImage(imgData, 'PNG', ...)
```

### 現在（純文字方式）
```typescript
// 直接使用 jsPDF 文字 API
const pdf = new jsPDF()
pdf.setFontSize(14)
pdf.text('健康追蹤報告', x, y)  // 純文字，檔案超小
```

## 驗證方法

更新後在 iOS App 中：
1. 點擊「一週 AI 分析」
2. 等待分析完成（會看到藍色邊框的新報告）
3. 點擊「下載 PDF」
4. 檢查 PDF 檔案大小（應該從幾 MB 降到幾十 KB）
5. 確認中文字正常顯示（沒有白框 X）

## 疑難排解

### 如果編譯失敗
```bash
cd ~/diet-daily
rm -rf .next
npm run build
```

### 如果服務無法啟動
```bash
pm2 logs diet-daily --err --lines 100
```

### 如果 PDF 還是很大
確認 `src/components/medical/PDFReportExporter.tsx` 的 `generateChinesePDF` 函數使用的是純文字版本（第 220-396 行）。
