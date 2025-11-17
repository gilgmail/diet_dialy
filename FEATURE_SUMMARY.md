# AI 食物知識庫完整功能總結

## 已完成的三個主要問題

### ✅ 問題 1: AI 食物知識庫 UI 優化
**問題**: 按鈕太上面會被狀態島或其他狀態按鈕影響，無法按到

**解決方案**:
- ✅ 建立獨立的 `FoodKnowledgeScreen` 元件
- ✅ 在 SettingsScreen 加入 Tab 導航
- ✅ 將 AI 食物知識庫移到獨立 tab
- ✅ 改善按鈕佈局和說明文字

**檔案**:
- `mobile/.../FoodKnowledgeScreen.tsx` (新建)
- `mobile/.../SettingsScreen.tsx` (修改)

**功能**:
- 兩個 Tab: 「一般設定」和「AI 知識庫」
- 避免 Dynamic Island 遮擋問題
- 更清晰的按鈕組織和說明

---

### ✅ 問題 2 & 3: 新增食物自動進入 AI 知識庫

**問題**:
- 新增的早餐食物沒有進入 AI 食物知識庫等待分析
- 所有新增的食物，在食物知識庫中沒有或未被分析的，都要進 AI 食物知識庫分析

**解決方案**:

#### 1. **自動加入佇列機制** ✅
當新食物建立時，自動觸發加入 `food_analysis_refresh_queue`

**實作**:
- Supabase Trigger: `trigger_auto_enqueue_food_analysis`
- Function: `auto_enqueue_food_analysis()`
- Migration: `supabase/migrations/20251117_auto_enqueue_food_analysis.sql`

**邏輯**:
```sql
-- 只在食物還沒有分析時才加入
IF NOT EXISTS (SELECT 1 FROM food_analysis_cache WHERE food_id = NEW.id) THEN
  INSERT INTO food_analysis_refresh_queue (...)
END IF
```

#### 2. **找出歷史缺失食物** ✅
找出所有已批准但沒有 AI 分析的食物

**實作**:
- PostgreSQL Function: `find_foods_missing_analysis()`
- Migration: `supabase/migrations/20251117_find_missing_analysis_function.sql`

**邏輯**:
```sql
SELECT f.id, f.name, f.category, f.created_at
FROM diet_daily_foods f
LEFT JOIN food_analysis_cache c ON f.id = c.food_id
WHERE c.food_id IS NULL  -- 沒有分析
  AND f.verification_status IN ('admin_approved', 'ai_approved', 'approved')
  AND NOT EXISTS (SELECT 1 FROM queue WHERE food_id = f.id AND status IN ('pending', 'in_progress'))
```

#### 3. **手動同步 API** ✅
一次將所有歷史缺失的食物加入佇列

**實作**:
- Endpoint: `POST /api/food-knowledge/sync-missing`
- File: `src/app/api/food-knowledge/sync-missing/route.ts`

**功能**:
- 呼叫 `find_foods_missing_analysis()` 找出缺失食物
- 批次加入 `food_analysis_refresh_queue`
- 回傳加入的數量和食物 ID

#### 4. **iOS 同步按鈕** ✅
在 iOS app 加入綠色「同步」按鈕

**實作**:
- Service: `FoodKnowledgeService.syncMissingFoods()`
- File: `mobile/.../FoodKnowledgeService.ts`
- UI: `FoodKnowledgeScreen.tsx`

**功能**:
- 點選「同步」→ 確認對話框
- 呼叫 API → 顯示結果
- 自動重新載入佇列狀態

---

## iOS App 按鈕說明

在 **AI 知識庫 Tab** 中有三個按鈕：

### 🟢 同步 (綠色)
- **功能**: 找出所有缺少 AI 分析的食物並加入佇列
- **用途**: 第一次使用或發現有食物缺少分析時使用
- **結果**: 顯示加入了多少個食物

### 🔵 處理 (藍色)
- **功能**: 立即執行 Edge Function 處理佇列中的食物
- **用途**: 當有待處理項目時，立即觸發 AI 分析
- **結果**: 顯示處理了多少個項目

### 🔵 刷新 (藍色，圖示)
- **功能**: 重新載入佇列狀態
- **用途**: 查看最新的處理進度
- **結果**: 更新顯示的佇列項目

---

## 部署狀態

### ✅ 已完成
1. 所有程式碼已 commit 和 push 到 GitHub
2. Next.js app 正在 Pi 上建置中（預計還需要幾分鐘）

### ⏳ 待執行
**手動執行 SQL Migrations**

請依照 [APPLY_MIGRATIONS_MANUAL.md](APPLY_MIGRATIONS_MANUAL.md) 的指示：

1. 開啟 Supabase Dashboard
2. 進入 SQL Editor
3. 執行兩個 migration 檔案：
   - `20251117_auto_enqueue_food_analysis.sql`
   - `20251117_find_missing_analysis_function.sql`

---

## 測試流程

### 1. 執行 Migrations
在 Supabase Dashboard SQL Editor 執行上述兩個檔案

### 2. 等待 Pi 建置完成
```bash
# 檢查狀態
ssh gilko@10.1.1.85 "docker ps | grep diet-daily-web"
```

### 3. iOS App 測試
1. 開啟 app → 設定
2. 點選 **AI 知識庫** Tab
3. 點選 **同步** 按鈕
4. 確認顯示加入了多少食物
5. 點選 **處理** 按鈕
6. 等待處理完成（會顯示處理結果）
7. 點選 **刷新** 確認狀態更新

### 4. 測試自動加入
1. 在 app 中新增一個食物
2. 回到 **AI 知識庫** Tab
3. 點選 **刷新**
4. 應該會看到新食物自動出現在佇列中

---

## 預期行為

### 自動觸發（無需手動操作）
- ✅ 新增食物時自動加入佇列
- ✅ 只處理還沒有 AI 分析的食物
- ✅ 避免重複加入佇列

### 手動操作
- 🟢 **同步**: 一次性處理所有歷史缺失的食物
- 🔵 **處理**: 立即執行 AI 分析
- 🔵 **刷新**: 查看最新狀態

### UI 改善
- ✅ Tab 導航避免按鈕被遮擋
- ✅ 清楚的狀態顯示（待處理/處理中/失敗）
- ✅ 詳細的說明文字
- ✅ 統計資訊一目了然

---

## 技術架構

```
新增食物
    ↓
[Supabase Trigger]
    ↓
food_analysis_refresh_queue
    ↓
Edge Function (refresh-food-analysis)
    ↓
Claude AI API
    ↓
food_analysis_cache
```

### 手動同步流程
```
iOS App「同步」按鈕
    ↓
POST /api/food-knowledge/sync-missing
    ↓
find_foods_missing_analysis()
    ↓
批次加入 food_analysis_refresh_queue
    ↓
回傳結果給 iOS App
```

---

## 相關檔案清單

### Backend
- `supabase/migrations/20251117_auto_enqueue_food_analysis.sql`
- `supabase/migrations/20251117_find_missing_analysis_function.sql`
- `src/app/api/food-knowledge/sync-missing/route.ts`
- `src/app/api/food-knowledge/status/route.ts` (修改)

### iOS App
- `mobile/.../FoodKnowledgeScreen.tsx` (新建)
- `mobile/.../SettingsScreen.tsx` (修改)
- `mobile/.../FoodKnowledgeService.ts` (修改)

### 文件
- `APPLY_MIGRATIONS_MANUAL.md` - Migration 執行指南
- `FEATURE_SUMMARY.md` - 本文件

---

## 下一步

1. ✅ 程式碼已完成並 commit
2. ⏳ 等待 Pi 建置完成
3. ⏳ 手動執行 SQL Migrations
4. ⏳ iOS App 測試驗證
5. ⏳ 確認自動加入佇列運作正常
