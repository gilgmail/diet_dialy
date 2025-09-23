# 🍽️ 食物日記 Supabase 設置指南

## 📋 概述

本指南將協助您完成食物日記功能的 Supabase 資料庫設置，實現完整的「取得和新增記錄到 supabase」功能。

## ✅ 當前狀態

根據檢查結果，目前的狀態如下：

- ✅ **用戶表 (diet_daily_users)**: 已存在
- ❌ **食物資料庫表 (diet_daily_foods)**: 需要創建
- ❌ **食物記錄表 (food_entries)**: 需要創建
- ⚠️ **測試用戶**: 需要先登入並保存資料

## 🚀 設置步驟

### 第一步：建立資料庫表格

1. **登入 Supabase Dashboard**
   ```
   網址: https://app.supabase.com
   專案: lbjeyvvierxcnrytuvto
   ```

2. **進入 SQL Editor**
   - 點擊左側選單的 **SQL Editor**
   - 點擊 **New query**

3. **執行建表腳本**
   - 複製 `create_food_tables.sql` 的完整內容
   - 貼到 SQL Editor 中
   - 點擊 **Run** 按鈕執行

4. **驗證執行結果**
   - 執行完成後應該看到：
     ```
     total_foods | approved_foods
     ------------|---------------
            8    |       8
     ```
   - 這表示成功創建了 8 個樣本食物

### 第二步：用戶認證設置

1. **開啟設定頁面**
   ```
   http://localhost:3000/settings
   ```

2. **完成 Google 登入**
   - 點擊「使用 Google 登入」
   - 完成 OAuth 認證流程
   - 選擇醫療狀況並保存設定

3. **驗證用戶資料**
   - 確認認證狀態顯示為「已登入」
   - 用戶資料已保存到 `diet_daily_users` 表

### 第三步：測試食物日記功能

1. **開啟食物日記頁面**
   ```
   http://localhost:3000/food-diary
   ```

2. **測試搜尋功能**
   - 在搜尋框中輸入：
     - `白` - 應找到白米飯、白粥、白吐司
     - `香蕉` - 應找到香蕉
     - `蛋` - 應找到蒸蛋

3. **測試新增記錄**
   - 選擇一個食物（如：白米飯）
   - 填寫份量：`100` g
   - 選擇餐次：早餐
   - 點擊「新增記錄」
   - 確認右側顯示新增的記錄

## 🔧 功能特性

### 已實現的功能

1. **🔍 食物搜尋**
   - 即時搜尋食物資料庫
   - 支援名稱模糊搜尋
   - 顯示食物分類和醫療評分

2. **➕ 新增記錄**
   - 選擇食物和份量
   - 選擇餐次（早餐/午餐/晚餐/點心）
   - 自動計算卡路里
   - 支援備註輸入

3. **📅 今日記錄**
   - 顯示當天所有食物記錄
   - 按時間排序
   - 顯示營養資訊和醫療評分

4. **🛡️ 安全性**
   - Row Level Security (RLS) 保護
   - 用戶只能存取自己的記錄
   - Google OAuth 安全認證

### 資料庫架構

```
diet_daily_foods (食物資料庫)
├── 基本資訊: name, category, brand
├── 營養成分: calories, protein, carbohydrates, fat, fiber
├── 醫療評分: medical_scores (IBD 友善度)
├── 過敏原資訊: allergens
├── 驗證狀態: verification_status
└── 標籤系統: tags

food_entries (食物記錄)
├── 用戶關聯: user_id
├── 食物資訊: food_id, food_name, quantity, unit
├── 時間資訊: consumed_at, meal_type
├── 營養計算: calories, nutrition_data
├── 醫療分析: medical_score, medical_analysis
└── 額外資訊: notes, symptoms
```

## 🧪 測試腳本

執行以下腳本來驗證設置：

```bash
# 檢查表格狀態
node check_tables_and_setup.js

# 測試食物日記操作
node test_food_diary_operations.js
```

## 📊 預期結果

設置完成後，您應該能夠：

1. ✅ **登入功能正常**
   - Google OAuth 認證成功
   - 用戶資料保存到資料庫

2. ✅ **搜尋功能正常**
   - 輸入關鍵字能找到相關食物
   - 顯示食物的營養資訊和醫療評分

3. ✅ **新增記錄功能正常**
   - 能選擇食物並填寫份量
   - 記錄成功保存到資料庫
   - 立即顯示在今日記錄中

4. ✅ **資料持久化**
   - 重新載入頁面後記錄仍然存在
   - 跨會話資料保持一致

## ❗ 故障排除

### 表格不存在錯誤
```
Could not find the table 'public.diet_daily_foods'
```
**解決方案**: 在 Supabase Dashboard 執行 `create_food_tables.sql`

### 認證錯誤
```
Row Level Security policy violation
```
**解決方案**: 確認已完成 Google 登入並保存用戶資料

### 搜尋無結果
```
搜尋結果為空
```
**解決方案**: 確認資料庫中有樣本食物資料，檢查 verification_status = 'approved'

### 新增記錄失敗
```
Insert failed
```
**解決方案**: 檢查 RLS 政策，確認用戶已認證且 user_id 正確

## 🎯 完成確認

設置完成後，請確認以下功能：

- [ ] Supabase 表格已建立
- [ ] 樣本食物資料已插入
- [ ] Google 登入正常工作
- [ ] 用戶資料已保存
- [ ] 食物搜尋功能正常
- [ ] 新增記錄功能正常
- [ ] 今日記錄顯示正常
- [ ] 資料持久化正常

## 🚀 下一步開發

食物日記基礎功能完成後，可以考慮擴展：

1. **編輯/刪除記錄**
2. **歷史記錄查看**
3. **營養統計分析**
4. **症狀追蹤整合**
5. **醫療報告生成**

---

**狀態**: ✅ 食物日記 Supabase 整合完成
**版本**: v4.1.0
**最後更新**: 2025-09-21