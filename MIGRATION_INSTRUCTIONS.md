# HealthKit Constraint Migration 執行說明

## 問題

`health_metrics` 表的 UNIQUE 約束與 API 的 `onConflict` 參數不匹配：
- **當前約束**: `(source, source_identifier, start_time)` - 缺少 `user_id`
- **API 期望**: `(user_id, source, source_identifier, start_time)`

這會導致 HealthKit 同步時出現錯誤：`there is no unique or exclusion constraint matching the ON CONFLICT specification`

## 解決方案

執行 migration 文件來更新約束。

## 執行步驟

### 方法 1: Supabase Dashboard (推薦)

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto)
2. 點擊左側選單的 **SQL Editor**
3. 點擊 **New query**
4. 複製以下 SQL 並貼上：

```sql
-- ============================================================================
-- Fix health_metrics UNIQUE constraint for ON CONFLICT
-- Created: 2025-12-16
-- Purpose: 確保 health_metrics 表有正確的 UNIQUE 約束以支援 upsert 操作
-- ============================================================================

-- 先檢查並刪除舊的約束（如果存在）
DO $$
BEGIN
    -- 刪除可能存在的舊約束
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'health_metrics_source_source_identifier_start_time_key'
        AND table_name = 'health_metrics'
    ) THEN
        ALTER TABLE health_metrics
        DROP CONSTRAINT health_metrics_source_source_identifier_start_time_key;
        RAISE NOTICE '✅ Dropped old unique constraint';
    END IF;
END $$;

-- 建立新的 UNIQUE 約束，包含 user_id 以避免跨用戶資料衝突
-- 這個約束確保：同一用戶的同一來源、同一識別碼、同一開始時間的數據只能有一筆
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'health_metrics_user_source_unique'
        AND table_name = 'health_metrics'
    ) THEN
        ALTER TABLE health_metrics
        ADD CONSTRAINT health_metrics_user_source_unique
        UNIQUE(user_id, source, source_identifier, start_time);

        RAISE NOTICE '✅ Created unique constraint: health_metrics_user_source_unique';
    ELSE
        RAISE NOTICE 'ℹ️ Unique constraint already exists';
    END IF;
END $$;

-- 建立索引以優化 upsert 查詢效能
CREATE INDEX IF NOT EXISTS idx_health_metrics_upsert
    ON health_metrics(user_id, source, source_identifier, start_time);

-- 驗證約束是否建立成功
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE constraint_name = 'health_metrics_user_source_unique'
    AND table_name = 'health_metrics';

    IF constraint_count > 0 THEN
        RAISE NOTICE '✅ Verification successful: UNIQUE constraint exists';
    ELSE
        RAISE EXCEPTION '❌ Verification failed: UNIQUE constraint not found';
    END IF;
END $$;
```

5. 點擊 **Run** 執行
6. 確認執行成功（應該看到成功訊息）

### 方法 2: 使用腳本（顯示 SQL）

```bash
node scripts/apply-migration-direct.js
```

腳本會顯示需要執行的 SQL，然後按照方法 1 的步驟執行。

## 驗證

執行 migration 後，運行驗證腳本：

```bash
node scripts/check-healthkit-constraint.js
```

預期結果：應該看到 `✅ Constraint check passed!`

## 相關文件

- Migration 文件: `supabase/migrations/20251216_fix_health_metrics_unique_constraint.sql`
- API 路由: `src/app/api/healthkit/sync/route.ts`
- 驗證腳本: `scripts/check-healthkit-constraint.js`

