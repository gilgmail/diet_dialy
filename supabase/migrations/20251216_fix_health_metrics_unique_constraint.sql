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
        RAISE NOTICE '✅ health_metrics unique constraint migration completed!';
        RAISE NOTICE '✅ Verification successful: UNIQUE constraint exists';
    ELSE
        RAISE EXCEPTION '❌ Verification failed: UNIQUE constraint not found';
    END IF;
END $$;
