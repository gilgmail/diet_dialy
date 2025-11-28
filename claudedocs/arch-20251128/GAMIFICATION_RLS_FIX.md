# 遊戲化系統 RLS 緊急修復

**問題**: 新增食物記錄失敗
**錯誤訊息**: `new row violates row-level security policy for table "user_gamification_stats"`
**嚴重程度**: 🔴 CRITICAL - 阻擋核心功能
**影響**: 無法新增飲食、症狀、大便記錄

---

## 🔍 問題根本原因

### 錯誤流程
1. 用戶嘗試新增飲食記錄
2. 系統觸發 `add_user_points()` 函數來增加積分
3. 函數嘗試 INSERT/UPDATE `user_gamification_stats` 表
4. **失敗**：該表只有 SELECT policy，缺少 INSERT/UPDATE policy

### 受影響的表
- `user_gamification_stats` ❌ 只有 SELECT
- `user_streaks` ❌ 只有 SELECT
- `user_point_transactions` ❌ 只有 SELECT
- `user_achievements` ❌ 只有 SELECT

---

## ⚡ 立即修復方案

### 方案 1: 執行 Migration（推薦）

#### Step 1: 開啟 Supabase Dashboard SQL Editor
前往：https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/sql

#### Step 2: 執行修復 Migration
複製以下整個檔案的內容並執行：
- **檔案**: `supabase/migrations/1002_fix_gamification_rls.sql`

或者直接複製執行以下 SQL：

```sql
-- user_gamification_stats policies
CREATE POLICY "Users can insert own gamification stats"
ON user_gamification_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification stats"
ON user_gamification_stats FOR UPDATE
USING (auth.uid() = user_id);

-- user_streaks policies
CREATE POLICY "Users can insert own streaks"
ON user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
ON user_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- user_point_transactions policies
CREATE POLICY "Users can insert own point transactions"
ON user_point_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- user_achievements policies
CREATE POLICY "Users can insert own achievements"
ON user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

#### Step 3: 驗證修復成功

執行驗證查詢：
```sql
SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    CASE
        WHEN NOT t.rowsecurity THEN '❌ RLS NOT ENABLED'
        WHEN COUNT(p.policyname) < 2 THEN '⚠️ INSUFFICIENT POLICIES'
        ELSE '✅ OK'
    END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'user_gamification_stats',
    'user_streaks',
    'user_point_transactions',
    'user_achievements'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

**預期結果**:
```
tablename                    | rls_enabled | policy_count | status
----------------------------|-------------|--------------|--------
user_achievements           | t           | 2            | ✅ OK
user_gamification_stats     | t           | 3            | ✅ OK
user_point_transactions     | t           | 2            | ✅ OK
user_streaks               | t           | 3            | ✅ OK
```

---

### 方案 2: 暫時禁用遊戲化功能（快速但不推薦）

如果無法立即執行 migration，可以暫時禁用遊戲化：

#### 尋找觸發遊戲化的程式碼

```bash
# 搜尋 add_user_points 調用
grep -r "add_user_points" mobile/
grep -r "add_user_points" src/
```

#### 暫時註解掉相關程式碼

**注意**: 這只是臨時解決方案，應該盡快執行方案 1

---

## 🧪 修復後測試

### Test 1: 新增飲食記錄
```
1. 開啟 Mobile app
2. 點擊「新增飲食記錄」
3. 輸入食物名稱和份量
4. 點擊儲存

預期：✅ 成功儲存，無錯誤
```

### Test 2: 檢查積分記錄
```sql
-- 在 Supabase SQL Editor 執行
SELECT * FROM user_gamification_stats
WHERE user_id = '<your-user-id>'
ORDER BY updated_at DESC
LIMIT 1;

-- 應該看到 total_points 有增加
```

### Test 3: 檢查積分交易記錄
```sql
SELECT * FROM user_point_transactions
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 5;

-- 應該看到新的積分交易記錄
```

---

## 📊 修復前後對比

### 修復前
```
❌ user_gamification_stats: 1 policy (SELECT only)
❌ user_streaks: 1 policy (SELECT only)
❌ user_point_transactions: 1 policy (SELECT only)
❌ user_achievements: 1 policy (SELECT only)

結果：無法新增記錄，所有核心功能失效
```

### 修復後
```
✅ user_gamification_stats: 3 policies (SELECT, INSERT, UPDATE)
✅ user_streaks: 3 policies (SELECT, INSERT, UPDATE)
✅ user_point_transactions: 2 policies (SELECT, INSERT)
✅ user_achievements: 2 policies (SELECT, INSERT)

結果：所有功能正常運作
```

---

## 🔧 技術細節

### add_user_points() 函數需要的權限

函數位置：`supabase/migrations/019_create_gamification_tables.sql:189-220`

```sql
CREATE OR REPLACE FUNCTION add_user_points(...)
RETURNS INTEGER AS $$
BEGIN
    -- 需要 INSERT/UPDATE permission
    INSERT INTO user_gamification_stats (user_id, total_points)
    VALUES (p_user_id, p_points)
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_points = user_gamification_stats.total_points + p_points,
        updated_at = NOW();

    -- 需要 INSERT permission
    INSERT INTO user_point_transactions (...)
    VALUES (...);

    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;
```

**問題**:
- 原始 migration 只創建了 SELECT policies
- 但函數需要 INSERT 和 UPDATE 權限
- 當普通用戶調用此函數時，RLS 會阻擋操作

**解決方案**:
- 添加 INSERT policies 允許用戶插入自己的記錄
- 添加 UPDATE policies 允許用戶更新自己的記錄

---

## 📝 預防未來問題

### 檢查清單：新增表時
- [ ] 確認表的 RLS 已啟用
- [ ] 為所有需要的操作創建 policies（SELECT, INSERT, UPDATE, DELETE）
- [ ] 測試所有相關函數是否能正常運作
- [ ] 檢查 triggers 和 functions 的權限需求

### 相關文件
- [RLS_SECURITY_AUDIT.md](./RLS_SECURITY_AUDIT.md) - 完整的 RLS 審計
- [CRITICAL_FINDINGS.md](./CRITICAL_FINDINGS.md) - 安全漏洞記錄

---

## ✅ 修復完成確認

- [ ] Migration 已在 Supabase Dashboard 執行
- [ ] 驗證查詢顯示所有表都有 ✅ OK 狀態
- [ ] 測試新增飲食記錄成功
- [ ] 檢查積分記錄已正確創建
- [ ] 無其他 RLS 錯誤

---

**文件版本**: 1.0
**建立時間**: 2025-11-26
**最後更新**: 2025-11-26
**優先級**: 🔴 CRITICAL
