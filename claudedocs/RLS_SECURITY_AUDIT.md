# RLS Security Audit Report

**審計時間**: 2025-11-26
**審計範圍**: 所有 Supabase 資料表
**發現問題**: 3 個表缺少 RLS 保護

---

## 📊 審計概況

### 統計數據
- **總表數**: ~40+ 張表
- **已啟用 RLS**: 32 張表
- **缺少 RLS**: **3 張表** ❌
- **總 Policies**: 83 個

---

## ✅ 已啟用 RLS 的表（部分列表）

### Symptom Tracking（症狀追蹤）
- ✅ `daily_symptom_entries` - 有完整 policy
- ✅ `symptom_patterns` - 有完整 policy
- ✅ `symptom_alerts` - 有完整 policy
- ✅ `symptom_alert_history` - 有完整 policy
- ✅ `symptom_food_correlations` - 有完整 policy

### Health Logging（健康記錄）
- ✅ `bowel_movement_entries`
- ✅ `medication_regimens`
- ✅ `medication_administrations`
- ✅ `medication_cycles`
- ✅ `activity_sessions`
- ✅ `daily_wellness_log`
- ✅ `meal_logs`
- ✅ `sleep_sessions`

### Gamification（遊戲化）
- ✅ `user_gamification_stats`
- ✅ `user_streaks`
- ✅ `user_achievements`
- ✅ `user_point_transactions`

### AI & Analysis（AI 與分析）
- ✅ `food_analysis_cache`
- ✅ `food_analysis_refresh_queue`
- ✅ `correlation_analysis_cache`
- ✅ `ai_usage_events`

### Settings & Reminders（設定與提醒）
- ✅ `user_settings`
- ✅ `user_reminders`
- ✅ `reminder_logs`
- ✅ `health_data_sources`

---

## ❌ 缺少 RLS 的表（Critical Issues）

### 1. `food_entries` 🚨 **CRITICAL - FIXED**
**狀態**: ✅ 已修復（migration 999）
**風險等級**: 🔴 Critical
**資料敏感度**: 極高（個人飲食記錄）

**問題**:
```sql
-- ❌ 原狀態：沒有 RLS
CREATE TABLE food_entries (...);
-- 沒有 ENABLE ROW LEVEL SECURITY
-- 沒有任何 policies
```

**修復**:
```sql
-- ✅ migration 999_emergency_food_entries_rls.sql
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own food entries"
  ON food_entries FOR ALL USING (user_id = auth.uid());
```

**影響**:
- 所有用戶的食物記錄都可能被其他用戶存取
- 資料洩露風險極高
- 違反隱私法規

---

### 2. `diet_daily_users` ⚠️ **HIGH PRIORITY**
**狀態**: ❌ 未修復
**風險等級**: 🔴 High
**資料敏感度**: 高（用戶個人資料）

**當前狀態**:
```sql
CREATE TABLE diet_daily_users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
-- ❌ 沒有 ENABLE ROW LEVEL SECURITY
```

**風險**:
- 用戶可以查看其他用戶的 email
- 用戶可以修改自己的 is_admin 欄位（權限提升）
- 個人資料洩露

**建議修復**:
```sql
-- 啟用 RLS
ALTER TABLE diet_daily_users ENABLE ROW LEVEL SECURITY;

-- Policy 1: 用戶只能查看和更新自己的資料
CREATE POLICY "Users can view and update own profile"
ON diet_daily_users FOR ALL
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND is_admin = false); -- 防止提升權限

-- Policy 2: Admin 可以查看所有用戶
CREATE POLICY "Admins can view all users"
ON diet_daily_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Policy 3: 防止修改 is_admin 欄位
CREATE POLICY "Prevent is_admin modification"
ON diet_daily_users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  is_admin = (SELECT is_admin FROM diet_daily_users WHERE id = auth.uid())
);
```

---

### 3. `diet_daily_foods` 🟡 **MEDIUM PRIORITY**
**狀態**: ❌ 未修復
**風險等級**: 🟡 Medium
**資料敏感度**: 低（公開食物資料庫）

**當前狀態**:
```sql
CREATE TABLE diet_daily_foods (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
-- ❌ 沒有 ENABLE ROW LEVEL SECURITY
```

**分析**:
- 這是公開的食物資料庫，理論上所有用戶都應該能讀取
- 但應該限制寫入權限（只有 admin 可以新增/修改）

**建議修復**:
```sql
-- 啟用 RLS
ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;

-- Policy 1: 所有已認證用戶可以讀取
CREATE POLICY "All users can view foods"
ON diet_daily_foods FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy 2: 只有 Admin 可以新增/修改
CREATE POLICY "Only admins can modify foods"
ON diet_daily_foods FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);
```

---

## 🔧 修復計劃

### Phase 1: 已完成 ✅
- [x] `food_entries` - RLS migration 已創建（999_emergency）

### Phase 2: 緊急修復（本週）
- [ ] 創建 `diet_daily_users` RLS migration
- [ ] 測試 users 表的 RLS policies
- [ ] 部署到 production

### Phase 3: 低優先級修復（2 週內）
- [ ] 創建 `diet_daily_foods` RLS migration
- [ ] 測試 foods 表的 RLS policies
- [ ] 部署到 production

### Phase 4: 驗證與審計（持續）
- [ ] 運行全表 RLS 審計 SQL
- [ ] 驗證所有 policies 正確運作
- [ ] 滲透測試
- [ ] 合規審查

---

## 📝 建議的 Migration 檔案

### Migration: `1000_fix_users_table_rls.sql`

```sql
-- 修復 diet_daily_users RLS
-- 優先級: HIGH
-- 創建時間: 2025-11-26

ALTER TABLE diet_daily_users ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看和更新自己的資料
CREATE POLICY "Users can view and update own profile"
ON diet_daily_users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON diet_daily_users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  is_admin = (SELECT is_admin FROM diet_daily_users WHERE id = auth.uid())
);

-- Admin 可以查看所有用戶
CREATE POLICY "Admins can view all users"
ON diet_daily_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

COMMENT ON TABLE diet_daily_users IS 'User profiles with RLS security (fixed 2025-11-26)';
```

### Migration: `1001_fix_foods_table_rls.sql`

```sql
-- 修復 diet_daily_foods RLS
-- 優先級: MEDIUM
-- 創建時間: 2025-11-26

ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;

-- 所有已認證用戶可以讀取
CREATE POLICY "All users can view foods"
ON diet_daily_foods FOR SELECT
USING (auth.role() = 'authenticated');

-- 只有 Admin 可以新增/修改/刪除
CREATE POLICY "Only admins can modify foods"
ON diet_daily_foods FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Only admins can update foods"
ON diet_daily_foods FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Only admins can delete foods"
ON diet_daily_foods FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

COMMENT ON TABLE diet_daily_foods IS 'Food database with RLS security (fixed 2025-11-26)';
```

---

## 🔍 驗證 SQL 查詢

### 檢查所有表的 RLS 狀態
```sql
SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  STRING_AGG(p.policyname, E'\n  - ') as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'food_entries',
    'diet_daily_users',
    'diet_daily_foods',
    'daily_symptom_entries'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity, t.tablename;
```

### 預期結果（修復後）
```
tablename              | rls_enabled | policy_count | policies
-----------------------|-------------|--------------|----------
daily_symptom_entries  | t           | 2            | Users can manage own daily symptom entries
                       |             |              |   - Admins can view all symptom data
food_entries           | t           | 2            | Users can manage own food entries
                       |             |              |   - Admins can view all food entries
diet_daily_users       | t           | 3            | Users can view and update own profile
                       |             |              |   - Admins can view all users
                       |             |              |   - Prevent is_admin modification
diet_daily_foods       | t           | 5            | All users can view foods
                       |             |              |   - Only admins can modify foods
                       |             |              |   - ...
```

---

## ⚠️ 風險評估

### 當前風險（修復前）

| 表名 | 資料敏感度 | 風險等級 | 潛在影響 | 狀態 |
|------|-----------|---------|---------|------|
| `food_entries` | 極高 | 🔴 Critical | 個人飲食洩露 | ✅ 已修復 |
| `diet_daily_users` | 高 | 🔴 High | Email洩露、權限提升 | ❌ 待修復 |
| `diet_daily_foods` | 低 | 🟡 Medium | 資料庫污染 | ❌ 待修復 |

### 合規風險
- **GDPR**: 個人資料保護不足
- **台灣個資法**: 個人資料保護不足
- **HIPAA**: 醫療資料未加密控制（如適用）

---

## 📊 執行計劃時間表

| 階段 | 任務 | 預計時間 | 截止日期 |
|------|------|---------|---------|
| Phase 1 | food_entries RLS | ✅ 已完成 | 2025-11-26 |
| Phase 2 | diet_daily_users RLS | 2 小時 | 2025-11-27 |
| Phase 3 | diet_daily_foods RLS | 1 小時 | 2025-11-28 |
| Phase 4 | 全面驗證與測試 | 4 小時 | 2025-11-29 |

---

**文件版本**: 1.0
**最後更新**: 2025-11-26
**下次審計**: 每季度
**負責人**: Development Team
