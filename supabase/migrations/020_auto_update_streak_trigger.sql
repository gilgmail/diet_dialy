-- 020_auto_update_streak_trigger.sql
-- 自動更新連續記錄天數的觸發器

-- 建立函數：當 daily_symptom_entries 有新記錄時自動更新 streak
CREATE OR REPLACE FUNCTION auto_update_streak_on_symptom_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_new_streak INTEGER;
BEGIN
    -- 只處理新插入的記錄（避免重複計算）
    IF TG_OP = 'INSERT' THEN
        -- 調用 update_user_streak 函數
        SELECT update_user_streak(NEW.user_id, NEW.recorded_date) INTO v_new_streak;
        
        -- 如果達到里程碑，添加積分
        IF v_new_streak = 7 OR v_new_streak = 14 OR v_new_streak = 30 OR v_new_streak = 60 OR v_new_streak = 100 THEN
            PERFORM add_user_points(
                NEW.user_id,
                CASE 
                    WHEN v_new_streak = 7 THEN 50
                    WHEN v_new_streak = 14 THEN 100
                    WHEN v_new_streak = 30 THEN 300
                    WHEN v_new_streak = 60 THEN 500
                    WHEN v_new_streak = 100 THEN 1000
                    ELSE 0
                END,
                'streak_' || v_new_streak::TEXT,
                NEW.id,
                '達成 ' || v_new_streak || ' 天連續記錄里程碑'
            );
        END IF;
        
        -- 每次記錄都給基本積分
        PERFORM add_user_points(
            NEW.user_id,
            10,
            'entry_symptom',
            NEW.id,
            '記錄症狀'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器：在 daily_symptom_entries 插入時自動更新 streak
DROP TRIGGER IF EXISTS trigger_auto_update_streak ON daily_symptom_entries;
CREATE TRIGGER trigger_auto_update_streak
    AFTER INSERT ON daily_symptom_entries
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_streak_on_symptom_entry();

-- 建立函數：當 food_entries 有新記錄時添加積分（但不更新 streak，因為 streak 基於症狀記錄）
CREATE OR REPLACE FUNCTION auto_add_points_on_food_entry()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM add_user_points(
            NEW.user_id,
            5,
            'entry_food',
            NEW.id,
            '記錄飲食'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器：在 food_entries 插入時添加積分
DROP TRIGGER IF EXISTS trigger_auto_add_points_food ON food_entries;
CREATE TRIGGER trigger_auto_add_points_food
    AFTER INSERT ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_points_on_food_entry();

-- 建立函數：當 medication_administrations 有新記錄時添加積分
CREATE OR REPLACE FUNCTION auto_add_points_on_medication()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 取得 user_id
        SELECT mr.user_id INTO v_user_id
        FROM medication_regimens mr
        WHERE mr.id = NEW.regimen_id;
        
        IF v_user_id IS NOT NULL THEN
            PERFORM add_user_points(
                v_user_id,
                5,
                'entry_medication',
                NEW.id,
                '記錄用藥'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器：在 medication_administrations 插入時添加積分
DROP TRIGGER IF EXISTS trigger_auto_add_points_medication ON medication_administrations;
CREATE TRIGGER trigger_auto_add_points_medication
    AFTER INSERT ON medication_administrations
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_points_on_medication();

-- 建立函數：當 sleep_sessions 有新記錄時添加積分
CREATE OR REPLACE FUNCTION auto_add_points_on_sleep()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_main_sleep = true THEN
        PERFORM add_user_points(
            NEW.user_id,
            5,
            'entry_sleep',
            NEW.id,
            '記錄睡眠'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器：在 sleep_sessions 插入時添加積分
DROP TRIGGER IF EXISTS trigger_auto_add_points_sleep ON sleep_sessions;
CREATE TRIGGER trigger_auto_add_points_sleep
    AFTER INSERT ON sleep_sessions
    FOR EACH ROW
    WHEN (NEW.is_main_sleep = true)
    EXECUTE FUNCTION auto_add_points_on_sleep();

-- 建立函數：當 activity_sessions 有新記錄時添加積分
CREATE OR REPLACE FUNCTION auto_add_points_on_exercise()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM add_user_points(
            NEW.user_id,
            5,
            'entry_exercise',
            NEW.id,
            '記錄運動'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器：在 activity_sessions 插入時添加積分
DROP TRIGGER IF EXISTS trigger_auto_add_points_exercise ON activity_sessions;
CREATE TRIGGER trigger_auto_add_points_exercise
    AFTER INSERT ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_points_on_exercise();

-- 註解
COMMENT ON FUNCTION auto_update_streak_on_symptom_entry() IS 
'當使用者記錄症狀時，自動更新連續記錄天數並添加積分';

COMMENT ON FUNCTION auto_add_points_on_food_entry() IS 
'當使用者記錄飲食時，自動添加積分';

COMMENT ON FUNCTION auto_add_points_on_medication() IS 
'當使用者記錄用藥時，自動添加積分';

COMMENT ON FUNCTION auto_add_points_on_sleep() IS 
'當使用者記錄睡眠時，自動添加積分';

COMMENT ON FUNCTION auto_add_points_on_exercise() IS 
'當使用者記錄運動時，自動添加積分';

