# 🚨 Critical Security & Sync Issues Found

**發現時間**: 2025-11-26
**優先級**: 🔴 **CRITICAL**

---

## Issue #1: Missing Realtime Subscriptions ⚠️

**影響**: 資料不同步
**嚴重程度**: High
**安全風險**: 無

### 問題描述
Mobile 和 Web 端都沒有實作 Supabase Realtime Subscriptions：
- `useFoodDiary.ts` - 只使用 React Query 輪詢
- `useSymptomDiary.ts` - 只使用 React Query 輪詢
- 資料變更無法即時同步

### 影響範圍
- 用戶體驗差（需要手動刷新）
- 資料一致性感知問題
- 多設備使用困難

### 解決方案
新增 Supabase Realtime subscriptions 到兩個 hooks

---

## Issue #2: Missing RLS on food_entries Table 🚨

**影響**: 嚴重安全漏洞
**嚴重程度**: CRITICAL
**安全風險**: **極高**

### 問題描述
`food_entries` 表**完全沒有 Row-Level Security (RLS) 保護**：

```sql
-- ❌ food_entries 表現況
CREATE TABLE food_entries (...);
-- 沒有 ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
-- 沒有任何 CREATE POLICY
```

對比 `daily_symptom_entries` 表：
```sql
-- ✅ daily_symptom_entries 有完整保護
ALTER TABLE daily_symptom_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily symptom entries"
  ON daily_symptom_entries FOR ALL USING (user_id = auth.uid());
```

### 安全風險

| 風險 | 描述 | 嚴重性 |
|------|------|--------|
| **資料洩露** | 任何已認證用戶都可以看到所有用戶的食物記錄 | 🔴 Critical |
| **隱私侵犯** | 違反 GDPR、個資法、HIPAA 等隱私法規 | 🔴 Critical |
| **資料篡改** | 用戶可能修改或刪除其他用戶的資料 | 🔴 Critical |
| **合規問題** | 醫療級應用缺乏基本資料保護 | 🔴 Critical |

### 驗證方式

#### 檢查當前狀態（Supabase）
```sql
-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('food_entries', 'daily_symptom_entries');

-- 檢查現有 policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'food_entries';
```

預期結果：
- `food_entries.rowsecurity`: **false** ❌（問題）
- `daily_symptom_entries.rowsecurity`: **true** ✅（正常）
- `food_entries` policies: **0 個** ❌（問題）

### 影響範圍

**受影響的表**：
- ✅ `daily_symptom_entries` - 有 RLS 保護
- ❌ `food_entries` - **無 RLS 保護**
- ❌ `diet_daily_foods` - 可能無 RLS（需檢查）
- ❌ `diet_daily_users` - 可能無 RLS（需檢查）

**潛在受影響用戶**：
- 所有已註冊用戶的食物記錄都可能被其他用戶存取

### 立即行動

#### 1. 緊急 Migration（立即執行）

創建 migration: `supabase/migrations/999_emergency_food_entries_rls.sql`

```sql
-- 緊急修復：為 food_entries 啟用 RLS
-- 創建時間: 2025-11-26
-- 優先級: CRITICAL

-- 1. 啟用 Row Level Security
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- 2. 創建用戶存取 policy
CREATE POLICY "Users can manage own food entries"
ON food_entries FOR ALL
USING (user_id = auth.uid());

-- 3. 創建 Admin policy（可選）
CREATE POLICY "Admins can view all food entries for analysis"
ON food_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 4. 驗證 policy 已創建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'food_entries'
    AND policyname = 'Users can manage own food entries'
  ) THEN
    RAISE EXCEPTION 'RLS policy creation failed for food_entries';
  END IF;
END $$;

-- 5. 記錄此次修復
COMMENT ON TABLE food_entries IS 'User food entries with RLS security (fixed 2025-11-26)';
```

#### 2. 執行 Migration

```bash
# 本地測試
npx supabase migration up

# 部署到 production（謹慎！）
# 先在 staging 測試
npx supabase db push --db-url <STAGING_URL>

# 確認無誤後部署到 production
npx supabase db push
```

#### 3. 驗證修復

```sql
-- 確認 RLS 已啟用
SELECT
  tablename,
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'food_entries') as policy_count
FROM pg_tables
WHERE tablename = 'food_entries';

-- 預期結果：
-- rowsecurity: true
-- policy_count: 2（或 1，取決於是否新增 admin policy）
```

#### 4. 測試資料隔離

```sql
-- 以用戶 A 身份測試
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user-a-uuid"}';
SELECT * FROM food_entries; -- 應只看到 user-a 的資料

-- 以用戶 B 身份測試
SET LOCAL "request.jwt.claims" = '{"sub": "user-b-uuid"}';
SELECT * FROM food_entries; -- 應只看到 user-b 的資料
```

---

## Issue #3: Missing RLS on Other Tables? 🔍

**狀態**: 待檢查
**優先級**: 🔴 High

### 需要檢查的表
- [ ] `diet_daily_users`
- [ ] `diet_daily_foods`
- [ ] `gamification_streaks`
- [ ] 其他所有用戶資料表

### 檢查方法
```sql
SELECT
  t.tablename,
  t.rowsecurity,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename LIKE '%daily%' OR t.tablename LIKE '%user%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity, t.tablename;
```

---

## 為什麼 food_entries 沒有同步問題？

**理論分析**：

缺少 RLS 反而**不應該**導致同步問題，因為：
1. 沒有 RLS = 所有已認證用戶都可以存取所有資料
2. Mobile 和 Web 都使用相同的認證
3. 資料應該都能正常讀寫

**實際原因可能是**：
1. ✅ **缺少 Realtime Subscriptions**（已確認）
2. ⚠️ Auth token 傳遞問題（待驗證）
3. ⚠️ 網路配置問題（待驗證）
4. ⚠️ Supabase client 初始化問題（待驗證）

---

## 優先級排序

### 🔴 Critical（立即執行）
1. **修復 food_entries RLS**（security issue）
   - 創建並執行 emergency migration
   - 驗證 RLS 正確運作
   - 測試資料隔離

### 🟡 High（本週完成）
2. **檢查其他表的 RLS**
   - 掃描所有表
   - 修復缺失的 RLS

3. **實作 Realtime Subscriptions**
   - 修改 useFoodDiary
   - 修改 useSymptomDiary
   - 測試同步功能

### 🟢 Medium（2 週內）
4. **全面安全審計**
   - 檢查所有 policies
   - 驗證 RLS 配置
   - 滲透測試

---

## 合規影響

### GDPR 違規風險
- ✅ 使用者資料未妥善保護
- ✅ 可能被視為資料洩露
- ✅ 需要向 DPA 報告？

### 台灣個資法
- ✅ 個人資料保護不足
- ✅ 可能面臨罰款

### HIPAA（如適用）
- ✅ 醫療資料未加密控制
- ✅ 嚴重違規

**建議**：
- 立即修復後評估是否需要通知用戶
- 查看是否有資料被非授權存取的紀錄
- 諮詢法律顧問

---

## 下一步行動

### Phase 1: 緊急修復（今天）
- [x] 診斷問題
- [ ] 創建 RLS migration
- [ ] 在 staging 測試
- [ ] 部署到 production
- [ ] 驗證修復

### Phase 2: 完整檢查（本週）
- [ ] 檢查所有表的 RLS
- [ ] 修復其他缺失的 RLS
- [ ] 安全審計

### Phase 3: 同步修復（本週）
- [ ] 實作 Realtime Subscriptions
- [ ] 測試同步功能

---

**文件版本**: 1.0
**最後更新**: 2025-11-26
**狀態**: 🔴 CRITICAL - 需要立即行動
**負責人**: Development Team
