# Google Sheets 數據格式修復報告

## 🐛 原問題分析

### 問題 1: `[object Object]` 顯示問題
**現象**: Google Sheets 中食物名稱顯示為 `[object Object]`
**原因**: 數據格式不匹配
- 食物日誌發送: `{ foodData: { name_zh: "白米飯" } }`
- Google Sheets 期望: `{ foodName: "白米飯" }`

### 問題 2: 同步不完整
**現象**: 本地3筆記錄，Google Sheets只有1筆
**原因**:
1. 認證狀態檢查失敗阻止同步
2. Spreadsheet 未正確初始化

## 🔧 修復措施

### ✅ 修復1: 數據格式轉換
**位置**: `src/lib/google/index.ts:166-175`

```typescript
// 轉換數據格式為 Google Sheets 期望的格式
const sheetsEntry = {
  date: foodEntry.consumedAt ? new Date(foodEntry.consumedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  time: foodEntry.consumedAt ? new Date(foodEntry.consumedAt).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5),
  foodName: foodEntry.foodData?.name_zh || foodEntry.foodData?.name_en || foodEntry.foodName || '未知食物',
  category: foodEntry.foodData?.category || '其他',
  medicalScore: foodEntry.medicalScore?.score || foodEntry.medicalScore || 5,
  notes: foodEntry.notes || '',
  userId: 'demo-user'
};
```

### ✅ 修復2: 自動初始化 Spreadsheet
**位置**: `src/lib/google/index.ts:161-164`

```typescript
// 確保 spreadsheet 已初始化
if (!this.userSpreadsheetId) {
  console.log('📊 初始化 Google Sheets...');
  this.userSpreadsheetId = await googleSheetsService.initializeUserSheet('demo-user');
}
```

### ✅ 修復3: 增強日誌追蹤
**新增**:
- `📝 原始食物資料:` - 顯示食物日誌發送的數據
- `📊 轉換後的 Sheets 格式:` - 顯示轉換後的數據

## 📊 預期修復效果

### 數據顯示修復
**修復前**: `[object Object]`
**修復後**: `白米飯` (正確的食物名稱)

### 同步完整性修復
**修復前**: 本地3筆 → Google Sheets 1筆
**修復後**: 本地3筆 → Google Sheets 3筆

## 🧪 測試步驟

### 第一步：清理測試
1. 手動清除 Google Sheets 中的測試數據
2. 清除瀏覽器 localStorage (`localStorage.clear()`)

### 第二步：重新測試
1. 前往 http://localhost:3000/food-diary
2. 添加一筆新的食物記錄（例如：蘋果）
3. 觀察控制台日誌

### 第三步：驗證修復
**控制台應顯示**:
```
📝 原始食物資料: { foodData: { name_zh: "蘋果", category: "水果" }, ... }
📊 轉換後的 Sheets 格式: { foodName: "蘋果", category: "水果", ... }
✅ Google Sheets 同步成功: true
```

**Google Sheets 應顯示**:
- 食物名稱：`蘋果`（不是 `[object Object]`）
- 分類：`水果`
- 正確的日期和時間

## 🔍 如果仍有問題

### 認證問題處理
如果看到 `❌ 認證失敗: 缺少 token 或用戶資訊`：
1. 前往 http://localhost:3000/auth
2. 重新進行 Google 登入
3. 確認授權 Google Sheets 權限

### 同步失敗處理
如果仍看到同步失敗：
1. 檢查網路連接
2. 確認 Google Sheets API 配額
3. 提供完整的錯誤日誌

---

**修復狀態**: ✅ 完成
**測試狀態**: 🔄 等待用戶驗證
**預期效果**: 食物名稱正確顯示，同步數據完整

*修復時間: 2025-09-19 10:46*