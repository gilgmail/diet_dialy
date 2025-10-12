# Mobile App 食物搜尋功能測試指南

## 測試環境
- iOS 模擬器已啟動
- Expo 開發伺服器運行中
- Supabase 資料庫已驗證（977 個批准的食物）

## 自動化測試結果 ✅

執行 `node scripts/test-food-search.js` 已驗證：

1. ✅ `diet_daily_foods` 表可正常訪問
2. ✅ 977 個食物全部為 `admin_approved` 狀態
3. ✅ 中文搜尋功能正常（測試關鍵字："米"）
4. ✅ 英文搜尋功能正常（測試關鍵字："rice"）
5. ✅ 多欄位搜尋 (name, name_en, brand) 正常運作

## iOS 模擬器手動測試步驟

### 1. 導航到食物日記
1. 啟動 iOS 模擬器上的應用
2. 從主頁導航到「食物日記」頁面
3. 點擊「新增食物條目」按鈕

### 2. 測試搜尋功能

#### 測試案例 1: 中文搜尋
- **輸入**: 米
- **預期結果**: 顯示包含"米"的食物清單
  - 冷凍玉米 (Taiwan 冷凍玉米)
  - 冷凍米粉 (Taiwan 冷凍米粉)
  - 白米飯 (Steamed White Rice)
  - 等等...

#### 測試案例 2: 英文搜尋
- **輸入**: rice
- **預期結果**: 顯示包含"rice"的食物清單
  - 滷肉飯 (Braised Pork Rice)
  - 白米飯 (Steamed White Rice)
  - 糙米飯 (Brown Rice)

#### 測試案例 3: 品牌搜尋
- **輸入**: Taiwan
- **預期結果**: 顯示台灣品牌的食物清單

#### 測試案例 4: 空搜尋
- **輸入**: （空白）
- **預期結果**: 不顯示任何結果

#### 測試案例 5: 無結果搜尋
- **輸入**: xyz123
- **預期結果**: 顯示「找不到「xyz123」請嘗試其他關鍵字或手動輸入」訊息

### 3. 驗證搜尋結果顯示

對於每個搜尋結果項目，驗證以下資訊是否正確顯示：

- ✅ 中文食物名稱（name）- 主要顯示，較大字體
- ✅ 英文食物名稱（name_en）- 次要顯示，較小字體，灰色
- ✅ 品牌資訊（brand）- 斜體，灰色，格式："品牌: XXX"
- ✅ 類別標籤（category）- 右上角，主色調
- ✅ 份量資訊（serving_size）- "份量: XXX"
- ✅ 熱量資訊（calories）- "熱量: XXX kcal"
- ✅ 營養資訊（protein, carbohydrates, fat）- 晶片樣式顯示

### 4. 測試選擇食物功能

1. 點擊任一搜尋結果
2. 驗證：
   - ✅ 搜尋下拉清單關閉
   - ✅ 食物名稱自動填入「食物名稱」欄位
   - ✅ 份量自動填入「份量」欄位（如果有）
   - ✅ 熱量自動填入「熱量」欄位（如果有）
   - ✅ 營養晶片顯示在表單下方（蛋白質、碳水、脂肪）

### 5. 測試 UI 互動

- ✅ 輸入時顯示載入指示器
- ✅ 搜尋結果平滑顯示／隱藏
- ✅ 鍵盤不會意外關閉 (keyboardShouldPersistTaps)
- ✅ 下拉清單在輸入框下方正確定位
- ✅ z-index 正確，下拉清單在其他元素上方

## 已知問題和解決方案

### 問題 1: 搜尋無結果
**可能原因**: Supabase RLS 政策限制
**解決方案**: 確認 `diet_daily_foods` 表有公開讀取權限

### 問題 2: 載入緩慢
**可能原因**: 網路延遲或索引缺失
**解決方案**: 檢查 Supabase 資料庫索引設置

### 問題 3: 中文搜尋不準確
**可能原因**: ILIKE 查詢語法錯誤
**解決方案**: 驗證查詢使用 `%${query}%` 格式

## 技術實現驗證

### FoodDiaryService.ts
- ✅ 使用 `diet_daily_foods` 表
- ✅ 篩選 `admin_approved`, `ai_approved`, `approved` 狀態
- ✅ 多欄位搜尋 (name, name_en, brand)
- ✅ 使用 `.or()` 語法組合查詢
- ✅ 限制結果為 20 筆

### FoodSearchInput.tsx
- ✅ 顯示 name_en（英文名稱）
- ✅ 顯示 brand（品牌）
- ✅ 正確的樣式層級
- ✅ 營養資訊晶片顯示

### Type Definitions
- ✅ Food 介面包含所有 Web App 欄位
- ✅ FoodSearchResult 介面包含顯示所需欄位
- ✅ 驗證狀態型別正確

## 下一步

1. ✅ 資料庫測試完成 - 977 個食物可用
2. ✅ 代碼整合完成 - Mobile App 使用 Web App 資料表
3. ⏳ **建議**: 在 iOS 模擬器中手動測試 UI 體驗
4. ⏳ **建議**: 測試不同網路條件下的效能
5. ⏳ **建議**: 收集使用者反饋並優化搜尋演算法

## 成功標準

- [ ] 中文和英文搜尋都能正常運作
- [ ] 搜尋結果顯示完整資訊（名稱、品牌、類別、營養）
- [ ] 選擇食物後正確自動填充表單
- [ ] UI 互動流暢，無明顯延遲
- [ ] 無主控台錯誤或警告

## 聯絡資訊

如有問題或需要調整，請參考：
- 原始資料庫查詢: `scripts/test-food-search.js`
- 服務層實現: `src/features/food-diary/services/FoodDiaryService.ts`
- UI 組件: `src/features/food-diary/components/FoodSearchInput.tsx`
