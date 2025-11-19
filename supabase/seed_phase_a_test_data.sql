-- seed_phase_a_test_data.sql
-- Phase A: Test users, regimens, and sample data for QA

-- 注意：此檔案僅用於開發/測試環境，請勿在生產環境執行

-- ===================================================================
-- 1. 建立測試用戶（假設 diet_daily_users 已有基礎結構）
-- ===================================================================

-- 測試用戶 1: 克隆氏症患者，使用生物製劑
DO $$
DECLARE
    test_user_1_id UUID := 'a0000001-0000-0000-0000-000000000001';
    test_user_2_id UUID := 'a0000002-0000-0000-0000-000000000002';
    test_user_3_id UUID := 'a0000003-0000-0000-0000-000000000003';

    humira_id UUID := 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    entyvio_id UUID := 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
    pentasa_id UUID := 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f';
    imodium_id UUID := 'e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b';

    regimen_1_id UUID;
    regimen_2_id UUID;
    regimen_3_id UUID;
    regimen_4_id UUID;

    reminder_1_id UUID;
    reminder_2_id UUID;
BEGIN
    -- 先在 auth.users 建立測試用戶（Supabase Auth）
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change_token_current,
        email_change_confirm_status
    ) VALUES
        (
            test_user_1_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'test1@example.com',
            crypt('test_password_123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Test User 1 - Crohns"}'::jsonb,
            false,
            '',
            '',
            0
        ),
        (
            test_user_2_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'test2@example.com',
            crypt('test_password_123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Test User 2 - UC"}'::jsonb,
            false,
            '',
            '',
            0
        ),
        (
            test_user_3_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'test3@example.com',
            crypt('test_password_123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"name":"Test User 3 - Mixed"}'::jsonb,
            false,
            '',
            '',
            0
        )
    ON CONFLICT (id) DO NOTHING;

    -- 再插入 diet_daily_users（應用層用戶資料）
    INSERT INTO diet_daily_users (id, name, email, timezone, created_at)
    VALUES
        (test_user_1_id, 'Test User 1 - Crohns', 'test1@example.com', 'Asia/Taipei', NOW()),
        (test_user_2_id, 'Test User 2 - UC', 'test2@example.com', 'Asia/Taipei', NOW()),
        (test_user_3_id, 'Test User 3 - Mixed', 'test3@example.com', 'America/New_York', NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '已建立 3 位測試用戶（auth.users + diet_daily_users）';

    -- ===============================================================
    -- 2. User 1: 克隆氏症 + Humira (每 14 天) + Pentasa (每日)
    -- ===============================================================

    -- Regimen 1: Humira 針劑
    INSERT INTO medication_regimens (
        id, user_id, medication_id, custom_name, route,
        frequency_type, interval_days, cycle_anchor_date,
        symptom_trigger_allowed, default_dose, status, notes
    ) VALUES (
        uuid_generate_v4(), test_user_1_id, humira_id, NULL, 'injection',
        'every_n_days', 14, CURRENT_DATE - INTERVAL '7 days',
        false, '40mg', 'active', '皮下注射，每兩週一次'
    )
    RETURNING id INTO regimen_1_id;

    -- 建立 Humira 的提醒
    INSERT INTO user_reminders (
        user_id, target_type, target_id, reminder_category, title,
        schedule_type, interval_days, window_start, window_end,
        timezone, lead_time_minutes, status, ios_visible
    ) VALUES (
        test_user_1_id, 'medication_regimen', regimen_1_id, 'medication',
        'Humira 針劑提醒', 'every_n_days', 14, '09:00', '21:00',
        'Asia/Taipei', 0, 'active', true
    )
    RETURNING id INTO reminder_1_id;

    -- 建立過去的用藥記錄
    INSERT INTO medication_administrations (
        regimen_id, scheduled_at, taken_at, dose, route,
        symptom_triggered, adherence_status, captured_via
    ) VALUES
        (regimen_1_id, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days', '40mg', 'injection', false, 'taken', 'manual'),
        (regimen_1_id, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days', '40mg', 'injection', false, 'taken', 'reminder');

    -- Regimen 2: Pentasa 口服
    INSERT INTO medication_regimens (
        id, user_id, medication_id, custom_name, route,
        frequency_type, interval_days, cycle_anchor_date,
        symptom_trigger_allowed, default_dose, status, notes
    ) VALUES (
        uuid_generate_v4(), test_user_1_id, pentasa_id, NULL, 'oral',
        'every_n_days', 1, CURRENT_DATE - INTERVAL '30 days',
        false, '2000mg', 'active', '每日早晚各服用一次'
    )
    RETURNING id INTO regimen_2_id;

    -- 建立 Pentasa 的提醒
    INSERT INTO user_reminders (
        user_id, target_type, target_id, reminder_category, title,
        schedule_type, interval_days, window_start, window_end,
        timezone, status, ios_visible
    ) VALUES (
        test_user_1_id, 'medication_regimen', regimen_2_id, 'medication',
        'Pentasa 口服提醒', 'every_n_days', 1, '08:00', '09:00',
        'Asia/Taipei', 'active', true
    )
    RETURNING id INTO reminder_2_id;

    RAISE NOTICE 'User 1: 已建立 Humira 與 Pentasa 療程';

    -- ===============================================================
    -- 3. User 2: 潰瘍性結腸炎 + Entyvio (每 56 天)
    -- ===============================================================

    -- Regimen 3: Entyvio 針劑
    INSERT INTO medication_regimens (
        id, user_id, medication_id, custom_name, route,
        frequency_type, interval_days, cycle_anchor_date,
        symptom_trigger_allowed, default_dose, status, notes
    ) VALUES (
        uuid_generate_v4(), test_user_2_id, entyvio_id, NULL, 'injection',
        'every_n_days', 56, CURRENT_DATE - INTERVAL '28 days',
        false, '300mg', 'active', '靜脈注射，需到診所施打'
    )
    RETURNING id INTO regimen_3_id;

    -- 建立 Entyvio 週期記錄
    INSERT INTO medication_cycles (
        regimen_id, cycle_number, cycle_start_date,
        expected_next_date, status, provider_notes
    ) VALUES (
        regimen_3_id, 1, CURRENT_DATE - INTERVAL '28 days',
        CURRENT_DATE + INTERVAL '28 days', 'scheduled', '台大醫院腸胃科'
    );

    -- 建立 Entyvio 的提醒（提前 7 天提醒預約）
    INSERT INTO user_reminders (
        user_id, target_type, target_id, reminder_category, title,
        schedule_type, interval_days, window_start, timezone,
        lead_time_minutes, metadata, status, ios_visible
    ) VALUES (
        test_user_2_id, 'medication_regimen', regimen_3_id, 'medication',
        'Entyvio 針劑預約提醒', 'relative_cycle', 56, '10:00',
        'Asia/Taipei', 0,
        '{"cycle_offset_days": 7, "reminder_message": "請提前預約診所時間"}'::jsonb,
        'active', true
    );

    RAISE NOTICE 'User 2: 已建立 Entyvio 療程與週期';

    -- ===============================================================
    -- 4. User 3: PRN 藥物（症狀觸發）
    -- ===============================================================

    -- Regimen 4: Imodium PRN
    INSERT INTO medication_regimens (
        id, user_id, medication_id, custom_name, route,
        frequency_type, interval_days, cycle_anchor_date,
        symptom_trigger_allowed, default_dose, status, notes
    ) VALUES (
        uuid_generate_v4(), test_user_3_id, imodium_id, 'Imodium 止瀉', 'oral',
        'prn', NULL, CURRENT_DATE,
        true, '2mg', 'active', '腹瀉時服用，每日最多 16mg'
    )
    RETURNING id INTO regimen_4_id;

    -- PRN 藥物的用藥記錄（症狀觸發）
    INSERT INTO medication_administrations (
        regimen_id, scheduled_at, taken_at, dose, route,
        symptom_triggered, symptom_notes, adherence_status, captured_via
    ) VALUES (
        regimen_4_id, NULL, CURRENT_DATE - INTERVAL '3 days', '4mg', 'oral',
        true, '午餐後腹瀉 3 次，服用止瀉藥', 'taken', 'manual'
    );

    RAISE NOTICE 'User 3: 已建立 Imodium PRN 療程';

    -- ===============================================================
    -- 5. 建立健康紀錄測試資料
    -- ===============================================================

    -- User 1 的飲食記錄（觸發早餐提醒 auto-dismiss）
    INSERT INTO meal_logs (user_id, logged_at, meal_type, items, notes, captured_via)
    VALUES
        (test_user_1_id, CURRENT_DATE + TIME '08:30', 'breakfast',
         '[{"food_name": "燕麥粥", "portion": 1, "unit": "碗"}]'::jsonb,
         '感覺良好', 'ios_manual'),
        (test_user_1_id, CURRENT_DATE - INTERVAL '1 day' + TIME '12:30', 'lunch',
         '[{"food_name": "雞胸肉沙拉", "portion": 1, "unit": "份"}]'::jsonb,
         NULL, 'ios_manual');

    -- User 1 的睡眠記錄
    INSERT INTO sleep_sessions (
        user_id, source, start_time, end_time, duration_minutes,
        planned_start_time, planned_duration_minutes, quality_score
    ) VALUES (
        test_user_1_id, 'manual',
        CURRENT_DATE - INTERVAL '1 day' + TIME '23:00',
        CURRENT_DATE + TIME '07:00',
        480, '23:00', 480, 4
    );

    -- User 2 的運動記錄
    INSERT INTO activity_sessions (
        user_id, activity_type, activity_title, start_time, end_time,
        duration_minutes, intensity, source
    ) VALUES (
        test_user_2_id, 'walk', '晨間散步',
        CURRENT_DATE + TIME '07:00', CURRENT_DATE + TIME '07:30',
        30, 'low', 'manual'
    );

    RAISE NOTICE '已建立測試健康紀錄資料';

    -- ===============================================================
    -- 6. 建立提醒日誌範例
    -- ===============================================================

    INSERT INTO reminder_logs (reminder_id, status, deliver_at, handled_at, context)
    VALUES
        (reminder_1_id, 'delivered', CURRENT_DATE - INTERVAL '7 days' + TIME '09:00',
         CURRENT_DATE - INTERVAL '7 days' + TIME '09:15',
         '{"notification_id": "test-notif-001"}'::jsonb),
        (reminder_2_id, 'auto_dismissed', CURRENT_DATE + TIME '08:00',
         CURRENT_DATE + TIME '08:30',
         '{"triggered_by": "meal_log", "trigger_table": "meal_logs"}'::jsonb);

    RAISE NOTICE '已建立提醒日誌範例';
END$$;

-- ===================================================================
-- 驗證測試資料
-- ===================================================================

DO $$
DECLARE
    user_count INTEGER;
    regimen_count INTEGER;
    admin_count INTEGER;
    reminder_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM diet_daily_users
        WHERE id::text LIKE 'a000000_-0000-0000-0000-000000000001'
        OR id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003');

    SELECT COUNT(*) INTO regimen_count FROM medication_regimens
        WHERE user_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003');

    SELECT COUNT(*) INTO admin_count FROM medication_administrations
        WHERE regimen_id IN (
            SELECT id FROM medication_regimens
            WHERE user_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003')
        );

    SELECT COUNT(*) INTO reminder_count FROM user_reminders
        WHERE user_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003');

    RAISE NOTICE '=== Phase A 測試資料摘要 ===';
    RAISE NOTICE '測試用戶: %', user_count;
    RAISE NOTICE '療程: %', regimen_count;
    RAISE NOTICE '用藥記錄: %', admin_count;
    RAISE NOTICE '提醒設定: %', reminder_count;
    RAISE NOTICE '飲食記錄: %', (SELECT COUNT(*) FROM meal_logs WHERE user_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003'));
    RAISE NOTICE '睡眠記錄: %', (SELECT COUNT(*) FROM sleep_sessions WHERE user_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003'));
    RAISE NOTICE '運動記錄: %', (SELECT COUNT(*) FROM activity_sessions WHERE user_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003'));
END$$;

-- ===================================================================
-- 清理測試資料的腳本（需要時手動執行）
-- ===================================================================

-- 清理應用層資料（CASCADE 會自動清理 meal_logs, medication_regimens 等）
-- DELETE FROM diet_daily_users WHERE id IN (
--     'a0000001-0000-0000-0000-000000000001',
--     'a0000002-0000-0000-0000-000000000002',
--     'a0000003-0000-0000-0000-000000000003'
-- );

-- 清理 Auth 用戶（需要使用 service_role 權限）
-- DELETE FROM auth.users WHERE id IN (
--     'a0000001-0000-0000-0000-000000000001',
--     'a0000002-0000-0000-0000-000000000002',
--     'a0000003-0000-0000-0000-000000000003'
-- );

-- 注意：auth.users 的 CASCADE DELETE 會自動清理 diet_daily_users 及其相關表
