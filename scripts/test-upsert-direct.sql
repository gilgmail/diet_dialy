-- 直接在資料庫中測試 upsert 操作
-- 在 Supabase Dashboard SQL Editor 中執行
-- 注意：先執行 migration 20251216_fix_health_metrics_trigger.sql 修復觸發器

-- 測試數據
DO $$
DECLARE
    test_user_id UUID := '3382719a-98c9-4dca-8dbf-08f0eb2b78b4';
    test_start_time TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
    test_end_time TIMESTAMPTZ := NOW();
BEGIN
    -- 測試插入（觸發器會自動同步到 daily_symptom_entries）
    INSERT INTO health_metrics (
        user_id,
        source,
        source_identifier,
        metric_type,
        start_time,
        end_time,
        recorded_date,
        numeric_value,
        unit,
        detail_payload,
        sync_status,
        synced_at
    ) VALUES (
        test_user_id,
        'healthkit',
        'test-direct-upsert',
        'steps',
        test_start_time,
        test_end_time,
        test_start_time::date,
        5000,
        'count',
        '{}'::jsonb,
        'synced',
        NOW()
    )
    ON CONFLICT (user_id, source, source_identifier, start_time)
    DO UPDATE SET
        numeric_value = EXCLUDED.numeric_value,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Upsert test successful!';
END $$;

-- 檢查結果
SELECT * FROM health_metrics 
WHERE source_identifier = 'test-direct-upsert'
ORDER BY created_at DESC
LIMIT 1;

-- 清理
DELETE FROM health_metrics WHERE source_identifier = 'test-direct-upsert';

