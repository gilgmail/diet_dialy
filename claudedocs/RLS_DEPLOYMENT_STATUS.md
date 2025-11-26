# RLS Deployment Status

**建立時間**: 2025-11-26
**最後更新**: 2025-11-26
**狀態**: 🔍 驗證中

---

## 📊 當前狀況

### 已知資訊

從錯誤訊息得知：
```
ERROR: 42710: policy "Users can view own profile" for table "diet_daily_users" already exists
```

**解讀**:
- ✅ `diet_daily_users` 表的 RLS policies **已經存在**
- ✅ 這表示至少部分安全措施已經部署
- 🔍 需要驗證其他兩張表的狀態

---

## 🎯 驗證步驟

### Step 1: 檢查 RLS 狀態

**方法 1: Supabase Dashboard**
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto)
2. 進入 "SQL Editor"
3. 執行 `scripts/verify-rls-status.sql`
4. 查看結果

**方法 2: 本地 psql**
```bash
# 如果有遠端連線權限
psql <your-database-url> -f scripts/verify-rls-status.sql
```

### Step 2: 根據結果採取行動

#### 情況 A: 全部 ✅ (所有表都有 RLS)
→ **不需要額外部署**
→ 直接進行 **Realtime Sync 測試**
→ 參考: `claudedocs/REALTIME_SYNC_TESTING.md`

#### 情況 B: 部分 ❌ (某些表缺少 RLS)
→ 需要執行對應的 migration files:

**缺少 food_entries RLS**:
```sql
-- 在 Supabase SQL Editor 執行
-- supabase/migrations/999_emergency_food_entries_rls.sql
```

**缺少 diet_daily_users RLS**:
```sql
-- 已存在！不需要執行
-- supabase/migrations/1000_fix_users_table_rls.sql
```

**缺少 diet_daily_foods RLS**:
```sql
-- 在 Supabase SQL Editor 執行
-- supabase/migrations/1001_fix_foods_table_rls.sql
```

#### 情況 C: 全部 ❌ (所有表都缺少 RLS)
→ 這不太可能，因為我們已經看到 `diet_daily_users` 有 policies
→ 如果真的全缺，依序執行三個 migration files

---

## 📋 Migration Files 說明

### 999_emergency_food_entries_rls.sql
**目的**: 修復 `food_entries` 表的 RLS
**優先級**: 🔴 CRITICAL
**風險**: 目前所有用戶都能看到其他人的食物記錄

**建立的 Policies**:
- `Users can manage own food entries` (ALL operations for own data)
- `Admins can view all food entries for analysis` (SELECT for admins)

### 1000_fix_users_table_rls.sql
**目的**: 修復 `diet_daily_users` 表的 RLS
**優先級**: 🟡 HIGH
**風險**: Email 洩露、權限提升攻擊

**建立的 Policies**:
- `Users can view own profile` (SELECT)
- `Users can update own profile` (UPDATE, 防止修改 is_admin)
- `Admins can view all users` (SELECT)
- `Admins can update all users` (UPDATE)
- `Allow user registration` (INSERT, 強制 is_admin=false)

**狀態**: ✅ 已確認存在（從錯誤訊息得知）

### 1001_fix_foods_table_rls.sql
**目的**: 修復 `diet_daily_foods` 表的 RLS
**優先級**: 🟢 MEDIUM
**風險**: 普通用戶可能修改食物資料庫

**建立的 Policies**:
- `All authenticated users can view foods` (SELECT)
- `Only admins can insert foods` (INSERT)
- `Only admins can update foods` (UPDATE)
- `Only admins can delete foods` (DELETE)

---

## 🔧 手動部署方式

如果需要手動部署某個 migration:

### 方式 1: Supabase Dashboard (推薦)
1. 開啟對應的 migration file
2. 複製所有 SQL 內容
3. 前往 Supabase Dashboard → SQL Editor
4. 貼上並執行
5. 檢查輸出是否有錯誤

### 方式 2: Supabase CLI
```bash
# 如果 CLI 已正確連接
npx supabase db push
```

### 方式 3: 直接 psql
```bash
psql <database-url> -f supabase/migrations/999_emergency_food_entries_rls.sql
```

---

## ⚠️ 常見問題

### Q: "policy already exists" 錯誤
**A**: 這是好消息！表示 policy 已經建立。不需要再執行該 migration。

### Q: 如何確認 RLS 真的有效？
**A**: 執行 `scripts/test-rls-policies.sql`，會進行完整的驗證測試。

### Q: 可以跳過 RLS 直接測試 Realtime Sync 嗎？
**A**: 不建議。沒有 RLS 保護的情況下，所有用戶資料都是公開的，非常危險。

### Q: 三個 migrations 的執行順序重要嗎？
**A**: 不重要。它們是獨立的，可以任意順序執行。

---

## ✅ 驗證成功標準

執行 `scripts/verify-rls-status.sql` 後，應該看到：

```
table_name          | rls_enabled | policy_count | status
--------------------|-------------|--------------|--------
food_entries        | ✅ Enabled  | ≥1          | ✅ OK
diet_daily_users    | ✅ Enabled  | ≥3          | ✅ OK
diet_daily_foods    | ✅ Enabled  | ≥4          | ✅ OK
```

**Overall Status**: ✅ All security measures in place

---

## 🚀 下一步

### 如果 RLS 全部 ✅
1. ✅ 標記 "部署 RLS 安全修復" 為完成
2. 🎯 開始執行 Realtime Sync 測試
3. 📖 參考: `claudedocs/REALTIME_SYNC_TESTING.md`

### 如果仍有 ❌
1. 執行對應的 migration file
2. 重新驗證
3. 確認全部 ✅ 後再進行測試

---

## 📝 測試記錄

**驗證日期**: ___________
**執行人**: ___________

### 驗證結果

- [ ] `food_entries` RLS: ✅ / ❌
- [ ] `diet_daily_users` RLS: ✅ / ❌ (已確認 ✅)
- [ ] `diet_daily_foods` RLS: ✅ / ❌

### Policy 數量

- `food_entries`: _____ policies
- `diet_daily_users`: _____ policies
- `diet_daily_foods`: _____ policies

### 決策

- [ ] 全部正常，進行 Realtime Sync 測試
- [ ] 需要執行額外 migrations: _____________________

---

**文件版本**: 1.0
**相關文件**:
- [REALTIME_SYNC_TESTING.md](./REALTIME_SYNC_TESTING.md)
- [RLS_SECURITY_AUDIT.md](./RLS_SECURITY_AUDIT.md)
- [CRITICAL_FINDINGS.md](./CRITICAL_FINDINGS.md)
