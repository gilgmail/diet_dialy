-- 014_create_sync_triggers.sql
-- Phase A: Sync triggers for meal_logs → food_entries and auto-dismiss reminders

-- ===================================================================
-- 1. meal_logs → food_entries 同步 Trigger
-- ===================================================================

-- 同步函式：將 meal_logs.items (JSONB 陣列) 同步到 food_entries（每個 item 一筆記錄）
CREATE OR REPLACE FUNCTION sync_meal_logs_to_food_entries()
RETURNS TRIGGER AS $$
DECLARE
    item JSONB;
    v_food_name TEXT;
    v_portion_size TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- 遍歷 items JSONB 陣列，每個 item 創建一筆 food_entries
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            v_food_name := item->>'food_name';
            v_portion_size := COALESCE(item->>'portion', item->>'unit', '1 份');

            -- 僅在有 food_name 時才插入
            IF v_food_name IS NOT NULL AND v_food_name != '' THEN
                INSERT INTO food_entries (
                    user_id,
                    food_id,
                    food_name,
                    food_category,
                    meal_type,
                    portion_size,
                    calories,
                    consumed_at,
                    notes,
                    created_at,
                    updated_at
                ) VALUES (
                    NEW.user_id,
                    (item->>'food_id')::UUID,
                    v_food_name,
                    item->>'category',
                    NEW.meal_type,
                    v_portion_size,
                    (item->>'calories')::NUMERIC,
                    NEW.logged_at,
                    NEW.notes,
                    NEW.created_at,
                    NEW.created_at
                );
            END IF;
        END LOOP;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        -- 刪除對應的 food_entries
        DELETE FROM food_entries
        WHERE user_id = OLD.user_id
          AND meal_type = OLD.meal_type
          AND consumed_at = OLD.logged_at;
        RETURN OLD;

    -- UPDATE 暫不支援（需複雜的 diff 邏輯，建議先刪除再插入）
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 應用同步 Trigger
DROP TRIGGER IF EXISTS sync_meal_to_food ON meal_logs;
CREATE TRIGGER sync_meal_to_food
AFTER INSERT OR DELETE ON meal_logs
FOR EACH ROW EXECUTE FUNCTION sync_meal_logs_to_food_entries();

COMMENT ON FUNCTION sync_meal_logs_to_food_entries() IS 'meal_logs → food_entries 單向同步：每個 items 元素創建一筆 food_entries';

-- ===================================================================
-- 2. auto_dismiss_reminder() Trigger 函式
-- ===================================================================

-- 通用的自動解除提醒函式
CREATE OR REPLACE FUNCTION auto_dismiss_reminder()
RETURNS TRIGGER AS $$
DECLARE
    target_reminder_id UUID;
    reminder_category_value TEXT;
    log_timestamp TIMESTAMPTZ;
    user_tz TEXT;
    v_user_id UUID;
BEGIN
    -- 判斷觸發來源並設定對應的 category、時間戳與 user_id
    IF TG_TABLE_NAME = 'meal_logs' THEN
        v_user_id := NEW.user_id;
        reminder_category_value := 'food';
        log_timestamp := NEW.logged_at;
    ELSIF TG_TABLE_NAME = 'sleep_sessions' THEN
        v_user_id := NEW.user_id;
        reminder_category_value := 'sleep';
        log_timestamp := COALESCE(NEW.start_time, NEW.created_at);
    ELSIF TG_TABLE_NAME = 'activity_sessions' THEN
        v_user_id := NEW.user_id;
        reminder_category_value := 'activity';
        log_timestamp := COALESCE(NEW.start_time, NEW.created_at);
    ELSIF TG_TABLE_NAME = 'medication_administrations' THEN
        -- medication_administrations 沒有 user_id，需透過 regimen_id JOIN 取得
        SELECT mr.user_id INTO v_user_id
        FROM medication_regimens mr
        WHERE mr.id = NEW.regimen_id;

        reminder_category_value := 'medication';
        log_timestamp := NEW.taken_at;
    ELSE
        RETURN NEW;
    END IF;

    -- 取得使用者時區（如果有設定）
    SELECT COALESCE(timezone, 'UTC') INTO user_tz
    FROM diet_daily_users
    WHERE id = v_user_id;

    -- 查詢是否有對應的活躍提醒（當日）
    SELECT id INTO target_reminder_id
    FROM user_reminders
    WHERE user_id = v_user_id
        AND reminder_category = reminder_category_value
        AND status = 'active'
        AND auto_dismiss_rule = 'existing_entry'
        AND DATE(log_timestamp AT TIME ZONE COALESCE(timezone, user_tz)) =
            DATE(NOW() AT TIME ZONE COALESCE(timezone, user_tz))
    LIMIT 1;

    -- 若找到提醒，記錄為 auto_dismissed
    IF target_reminder_id IS NOT NULL THEN
        INSERT INTO reminder_logs (
            reminder_id,
            status,
            deliver_at,
            handled_at,
            context
        ) VALUES (
            target_reminder_id,
            'auto_dismissed',
            NOW(),
            NOW(),
            jsonb_build_object(
                'triggered_by', NEW.id,
                'trigger_table', TG_TABLE_NAME,
                'trigger_time', log_timestamp
            )
        );

        RAISE NOTICE 'Auto-dismissed reminder % for user % via %',
            target_reminder_id, v_user_id, TG_TABLE_NAME;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用 auto-dismiss trigger 到各紀錄表
DROP TRIGGER IF EXISTS meal_auto_dismiss ON meal_logs;
CREATE TRIGGER meal_auto_dismiss
AFTER INSERT ON meal_logs
FOR EACH ROW EXECUTE FUNCTION auto_dismiss_reminder();

DROP TRIGGER IF EXISTS sleep_auto_dismiss ON sleep_sessions;
CREATE TRIGGER sleep_auto_dismiss
AFTER INSERT ON sleep_sessions
FOR EACH ROW EXECUTE FUNCTION auto_dismiss_reminder();

DROP TRIGGER IF EXISTS activity_auto_dismiss ON activity_sessions;
CREATE TRIGGER activity_auto_dismiss
AFTER INSERT ON activity_sessions
FOR EACH ROW EXECUTE FUNCTION auto_dismiss_reminder();

-- medication_administrations 的 auto-dismiss trigger
DROP TRIGGER IF EXISTS medication_auto_dismiss ON medication_administrations;
CREATE TRIGGER medication_auto_dismiss
AFTER INSERT ON medication_administrations
FOR EACH ROW EXECUTE FUNCTION auto_dismiss_reminder();

-- ===================================================================
-- 3. updated_at 自動更新 Trigger
-- ===================================================================

-- 通用的 updated_at 更新函式
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用到需要 updated_at 自動更新的表
DROP TRIGGER IF EXISTS update_meal_logs_updated_at ON meal_logs;
CREATE TRIGGER update_meal_logs_updated_at
BEFORE UPDATE ON meal_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- daily_wellness_log 是 materialized view，不支援 BEFORE UPDATE trigger
-- 跳過此 trigger（在 refresh 時會自動更新 updated_at）

DROP TRIGGER IF EXISTS update_medication_regimens_updated_at ON medication_regimens;
CREATE TRIGGER update_medication_regimens_updated_at
BEFORE UPDATE ON medication_regimens
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medication_cycles_updated_at ON medication_cycles;
CREATE TRIGGER update_medication_cycles_updated_at
BEFORE UPDATE ON medication_cycles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_health_data_sources_updated_at ON health_data_sources;
CREATE TRIGGER update_health_data_sources_updated_at
BEFORE UPDATE ON health_data_sources
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_reminders_updated_at ON user_reminders;
CREATE TRIGGER update_user_reminders_updated_at
BEFORE UPDATE ON user_reminders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- 4. 同步驗證視圖
-- ===================================================================

-- 先刪除舊視圖（如果存在且結構不同）
DROP VIEW IF EXISTS meal_sync_check;

-- 檢查 meal_logs 與 food_entries 同步狀態
CREATE VIEW meal_sync_check AS
SELECT
    ml.id as meal_log_id,
    ml.user_id,
    ml.meal_type,
    ml.logged_at,
    jsonb_array_length(ml.items) as expected_entries,
    COUNT(fe.id) as actual_entries,
    CASE
        WHEN jsonb_array_length(ml.items) = COUNT(fe.id) THEN 'synced'
        WHEN COUNT(fe.id) = 0 THEN 'missing'
        ELSE 'partial'
    END as sync_status
FROM meal_logs ml
LEFT JOIN food_entries fe
    ON fe.user_id = ml.user_id
    AND fe.meal_type = ml.meal_type
    AND fe.consumed_at = ml.logged_at
GROUP BY ml.id, ml.user_id, ml.meal_type, ml.logged_at, ml.items;

COMMENT ON VIEW meal_sync_check IS '檢查 meal_logs 與 food_entries 同步一致性';

-- ===================================================================
-- Comments
-- ===================================================================

COMMENT ON FUNCTION auto_dismiss_reminder() IS '自動解除提醒：當對應紀錄建立時，標記提醒為 auto_dismissed';
COMMENT ON FUNCTION update_updated_at_column() IS '自動更新 updated_at 時間戳';
