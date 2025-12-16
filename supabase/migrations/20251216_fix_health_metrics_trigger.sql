-- ============================================================================
-- Fix sync_health_metrics_to_symptom_entry trigger function
-- Created: 2025-12-16
-- Purpose: 修復觸發器函數，因為 daily_symptom_entries 不再有 UNIQUE 約束
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_health_metrics_to_symptom_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_date DATE;
    v_avg_heart_rate INTEGER;
    v_daily_steps INTEGER;
    v_active_calories INTEGER;
    v_water_intake INTEGER;
    v_existing_id UUID;
BEGIN
    -- 只處理已同步成功的數據
    IF NEW.sync_status != 'synced' THEN
        RETURN NEW;
    END IF;

    v_entry_date := DATE(NEW.start_time);

    -- 根據 metric_type 更新不同欄位
    CASE NEW.metric_type
        WHEN 'heart_rate' THEN
            -- 計算當日平均心率
            SELECT AVG(numeric_value)::INTEGER INTO v_avg_heart_rate
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'heart_rate'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            -- 檢查是否已存在該日期的記錄
            SELECT id INTO v_existing_id
            FROM daily_symptom_entries
            WHERE user_id = NEW.user_id
            AND recorded_date = v_entry_date
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                -- 更新現有記錄
                UPDATE daily_symptom_entries
                SET avg_heart_rate = v_avg_heart_rate,
                    updated_at = NOW()
                WHERE id = v_existing_id;
            ELSE
                -- 插入新記錄
                INSERT INTO daily_symptom_entries (user_id, recorded_date, avg_heart_rate, overall_health)
                VALUES (NEW.user_id, v_entry_date, v_avg_heart_rate, 3);
            END IF;

        WHEN 'steps' THEN
            -- 計算當日總步數
            SELECT SUM(numeric_value)::INTEGER INTO v_daily_steps
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'steps'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            -- 檢查是否已存在該日期的記錄
            SELECT id INTO v_existing_id
            FROM daily_symptom_entries
            WHERE user_id = NEW.user_id
            AND recorded_date = v_entry_date
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                -- 更新現有記錄
                UPDATE daily_symptom_entries
                SET daily_steps = v_daily_steps,
                    updated_at = NOW()
                WHERE id = v_existing_id;
            ELSE
                -- 插入新記錄
                INSERT INTO daily_symptom_entries (user_id, recorded_date, daily_steps, overall_health)
                VALUES (NEW.user_id, v_entry_date, v_daily_steps, 3);
            END IF;

        WHEN 'active_energy' THEN
            -- 計算當日活動消耗
            SELECT SUM(numeric_value)::INTEGER INTO v_active_calories
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'active_energy'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            -- 檢查是否已存在該日期的記錄
            SELECT id INTO v_existing_id
            FROM daily_symptom_entries
            WHERE user_id = NEW.user_id
            AND recorded_date = v_entry_date
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                -- 更新現有記錄
                UPDATE daily_symptom_entries
                SET active_calories = v_active_calories,
                    updated_at = NOW()
                WHERE id = v_existing_id;
            ELSE
                -- 插入新記錄
                INSERT INTO daily_symptom_entries (user_id, recorded_date, active_calories, overall_health)
                VALUES (NEW.user_id, v_entry_date, v_active_calories, 3);
            END IF;

        WHEN 'water_intake' THEN
            -- 計算當日飲水量
            SELECT SUM(numeric_value)::INTEGER INTO v_water_intake
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'water_intake'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            -- 檢查是否已存在該日期的記錄
            SELECT id INTO v_existing_id
            FROM daily_symptom_entries
            WHERE user_id = NEW.user_id
            AND recorded_date = v_entry_date
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                -- 更新現有記錄
                UPDATE daily_symptom_entries
                SET water_intake_ml = v_water_intake,
                    updated_at = NOW()
                WHERE id = v_existing_id;
            ELSE
                -- 插入新記錄
                INSERT INTO daily_symptom_entries (user_id, recorded_date, water_intake_ml, overall_health)
                VALUES (NEW.user_id, v_entry_date, v_water_intake, 3);
            END IF;

        ELSE
            -- 對於其他 metric_type（如 sleep_analysis, workout, blood_pressure 等）
            -- 不進行同步，靜默返回
            -- 這些類型可能由其他觸發器或處理邏輯處理
            NULL;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 驗證函數已更新
DO $$
BEGIN
    RAISE NOTICE '✅ sync_health_metrics_to_symptom_entry function updated successfully';
END $$;

