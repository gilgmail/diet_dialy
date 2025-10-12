# 食物搜尋修復測試報告

## 問題描述
使用者報告：輸入「米」進行資料庫搜尋時失敗
控制台錯誤：`ERROR Food search error: {"message": "Failed to search foods"}`

## 根本原因
Supabase `.or()` 查詢語法中的**空格**導致解析錯誤

### 錯誤代碼 (FoodDiaryService.ts:172)
```typescript
// ❌ 錯誤：過濾條件之間有空格
.or(`name.ilike.%${query}%, name_en.ilike.%${query}%, brand.ilike.%${query}%`)
```

### 修復代碼 (FoodDiaryService.ts:172)
```typescript
// ✅ 正確：過濾條件之間沒有空格
.or(`name.ilike.%${query}%,name_en.ilike.%${query}%,brand.ilike.%${query}%`)
```

## 修復內容

### 1. 移除 `.or()` 語法中的空格
**檔案**: `src/features/food-diary/services/FoodDiaryService.ts`
**修改行**: 172

### 2. 增強錯誤日誌
新增詳細的錯誤訊息記錄，便於未來除錯：

```typescript
if (error) {
  console.error('Supabase search error:', error)  // 新增
  throw error
}

console.log(`Search for "${query}" returned ${data?.length || 0} results`)  // 新增
```

## 修復驗證

### 自動化測試 (scripts/test-food-search.js)
先前的測試結果顯示資料庫查詢正常：
- ✅ 977 個已批准的食物可用
- ✅ 中文搜尋 "米" 應返回 5 個結果
- ✅ 英文搜尋 "rice" 應返回 3 個結果

### App 重建狀態
- ✅ iOS 應用程式已重新編譯
- ✅ Metro bundler 已重新載入修復後的代碼
- ✅ 應用程式已安裝到 iPhone 17 Pro 模擬器
- ✅ 1849 個模組成功打包

## 手動測試步驟

### 測試案例 1: 中文搜尋「米」
1. 開啟應用程式
2. 導航到「食物日記」
3. 點擊「新增食物」按鈕
4. 在搜尋框輸入「米」

**預期結果**:
- ✅ 搜尋下拉選單出現
- ✅ 顯示包含「米」的食物清單（約 5 個結果）
- ✅ 每個結果顯示：
  - 中文名稱 (name)
  - 英文名稱 (name_en)
  - 品牌 (brand) - 如果有
  - 類別 (category)
  - 營養資訊（熱量、蛋白質、碳水、脂肪）
- ✅ 控制台顯示：`Search for "米" returned X results`
- ❌ 不應該出現 `ERROR Food search error`

### 測試案例 2: 英文搜尋「rice」
1. 在搜尋框輸入「rice」

**預期結果**:
- ✅ 顯示包含 "rice" 的食物清單（約 3 個結果）
- ✅ 例如：滷肉飯 (Braised Pork Rice)、白米飯 (Steamed White Rice)

### 測試案例 3: 品牌搜尋「Taiwan」
1. 在搜尋框輸入「Taiwan」

**預期結果**:
- ✅ 顯示台灣品牌的食物
- ✅ 例如：Taiwan 冷凍玉米、Taiwan 冷凍米粉

### 測試案例 4: 選擇食物自動填入
1. 從搜尋結果中點擊任一食物
2. 觀察表單欄位

**預期結果**:
- ✅ 食物名稱自動填入
- ✅ 份量自動填入（如果有）
- ✅ 熱量自動填入（如果有）
- ✅ 營養晶片顯示（蛋白質、碳水、脂肪）
- ✅ 搜尋下拉選單關閉

### 測試案例 5: 無結果搜尋
1. 在搜尋框輸入「xyz123」

**預期結果**:
- ✅ 顯示「資料庫中沒有「xyz123」」
- ✅ 顯示「沒關係！可以直接使用此名稱記錄」
- ✅ 可以繼續使用此名稱進行記錄

## 技術說明

### Supabase `.or()` 語法規則
```typescript
// 正確格式（無空格）
.or('column1.eq.value1,column2.eq.value2,column3.eq.value3')

// 錯誤格式（有空格）
.or('column1.eq.value1, column2.eq.value2, column3.eq.value3')  // ❌ 會導致解析錯誤
```

### 多欄位 ILIKE 搜尋
我們的搜尋查詢同時搜尋三個欄位：
- `name`: 中文名稱
- `name_en`: 英文名稱
- `brand`: 品牌名稱

這樣可以讓使用者用中文、英文或品牌名稱進行搜尋。

### 驗證狀態過濾
只返回已批准的食物：
```typescript
const APPROVED_STATUSES = ['admin_approved', 'ai_approved', 'approved']
.in('verification_status', APPROVED_STATUSES)
```

## 預期控制台輸出

### 成功搜尋
```
Search for "米" returned 5 results
```

### 搜尋錯誤（應該不會出現）
```
Supabase search error: [詳細錯誤訊息]
ERROR Food search error: {"message": "Failed to search foods"}
```

## 注意事項

### 環境變數確認
確保 `.env.development` 包含正確的 Supabase 憑證：
- ✅ `EXPO_PUBLIC_SUPABASE_URL`
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 網路連線
- 需要網路連線才能連接 Supabase 資料庫
- 如果網路有問題，搜尋會失敗但應該顯示明確的錯誤訊息

## 後續步驟

如果測試失敗，請檢查：
1. 控制台完整錯誤訊息
2. 網路連線狀態
3. Supabase 資料庫是否可訪問
4. RLS (Row Level Security) 政策是否允許公開讀取

## 修復摘要

✅ **已修復**: Supabase `.or()` 查詢語法錯誤
✅ **已增強**: 錯誤日誌記錄
✅ **已重建**: iOS 應用程式
⏳ **待驗證**: 使用者手動測試搜尋功能

---

**建立時間**: 2025-10-03
**修復版本**: 已重建並安裝到 iPhone 17 Pro
