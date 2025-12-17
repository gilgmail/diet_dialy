-- ============================================================================
-- Aggregate Functions for Reporting
-- Created: 2025-12-17
-- Purpose: 提供報表系統使用的聚合查詢函數
-- ============================================================================

-- ============================================================================
-- 1. 健康分數計算函數
-- ============================================================================

-- 計算時間範圍內的整體健康分數
CREATE OR REPLACE FUNCTION get_period_health_score(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  avg_overall_health NUMERIC,
  avg_symptom_severity NUMERIC,
  symptom_free_days INTEGER,
  total_days INTEGER,
  best_day DATE,
  worst_day DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_scores AS (
    SELECT
      recorded_date,
      overall_health,
      (COALESCE(abdominal_pain, 0) + COALESCE(diarrhea, 0) +
       COALESCE(bloating, 0) + COALESCE(bloody_stool, 0)) / 4.0 AS symptom_severity
    FROM daily_symptom_entries
    WHERE user_id = p_user_id
      AND recorded_date BETWEEN p_start_date AND p_end_date
  )
  SELECT
    AVG(overall_health)::NUMERIC(3,2),
    AVG(symptom_severity)::NUMERIC(3,2),
    COUNT(*) FILTER (WHERE symptom_severity = 0)::INTEGER,
    COUNT(*)::INTEGER,
    (SELECT recorded_date FROM daily_scores ORDER BY overall_health DESC, symptom_severity ASC LIMIT 1),
    (SELECT recorded_date FROM daily_scores ORDER BY overall_health ASC, symptom_severity DESC LIMIT 1)
  FROM daily_scores;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_period_health_score IS '計算時間範圍內的健康分數摘要，包含平均值、無症狀天數、最佳/最差日期';

-- ============================================================================
-- 2. 排便模式摘要函數
-- ============================================================================

-- 獲取排便模式摘要統計
CREATE OR REPLACE FUNCTION get_bowel_pattern_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  avg_daily_frequency NUMERIC,
  bristol_distribution JSONB,
  blood_stool_days INTEGER,
  constipation_days INTEGER,
  diarrhea_days INTEGER,
  normal_days INTEGER,
  total_movements INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_counts AS (
    SELECT
      recorded_date,
      COUNT(*) as daily_count,
      BOOL_OR(has_blood) as has_blood,
      AVG(stool_type) as avg_type
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
      AND recorded_date BETWEEN p_start_date AND p_end_date
    GROUP BY recorded_date
  ),
  bristol_counts AS (
    SELECT
      stool_type,
      COUNT(*) as count
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
      AND recorded_date BETWEEN p_start_date AND p_end_date
    GROUP BY stool_type
  )
  SELECT
    (SELECT AVG(daily_count) FROM daily_counts)::NUMERIC(3,2),
    (SELECT jsonb_object_agg(stool_type::TEXT, count) FROM bristol_counts),
    (SELECT COUNT(*) FROM daily_counts WHERE has_blood = TRUE)::INTEGER,
    (SELECT COUNT(*) FROM daily_counts WHERE avg_type <= 2)::INTEGER,
    (SELECT COUNT(*) FROM daily_counts WHERE avg_type = 5)::INTEGER,
    (SELECT COUNT(*) FROM daily_counts WHERE avg_type BETWEEN 3 AND 4)::INTEGER,
    (SELECT COUNT(*) FROM bowel_movement_entries
     WHERE user_id = p_user_id
     AND recorded_date BETWEEN p_start_date AND p_end_date)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bowel_pattern_summary IS '獲取排便模式摘要，包含頻率、Bristol Scale 分佈、便秘/腹瀉天數';

-- ============================================================================
-- 3. HealthKit 指標摘要函數
-- ============================================================================

-- 獲取特定類型健康指標的統計摘要
CREATE OR REPLACE FUNCTION get_health_metric_summary(
  p_user_id UUID,
  p_metric_type TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  metric_type TEXT,
  total_records INTEGER,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  std_dev NUMERIC,
  first_date DATE,
  last_date DATE,
  days_with_data INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_metric_type,
    COUNT(*)::INTEGER,
    AVG(numeric_value)::NUMERIC(10,2),
    MIN(numeric_value)::NUMERIC(10,2),
    MAX(numeric_value)::NUMERIC(10,2),
    STDDEV(numeric_value)::NUMERIC(10,2),
    MIN(recorded_date),
    MAX(recorded_date),
    COUNT(DISTINCT recorded_date)::INTEGER
  FROM health_metrics
  WHERE user_id = p_user_id
    AND metric_type = p_metric_type
    AND recorded_date BETWEEN p_start_date AND p_end_date
    AND sync_status = 'synced';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_health_metric_summary IS '獲取特定類型健康指標的統計摘要（平均、最小、最大、標準差等）';

-- ============================================================================
-- 4. 睡眠品質分析函數
-- ============================================================================

-- 分析睡眠品質趨勢
CREATE OR REPLACE FUNCTION get_sleep_quality_analysis(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_sleep_hours NUMERIC,
  avg_sleep_duration NUMERIC,
  avg_deep_sleep NUMERIC,
  avg_rem_sleep NUMERIC,
  days_with_good_sleep INTEGER,
  days_with_poor_sleep INTEGER,
  sleep_consistency_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH sleep_data AS (
    SELECT
      recorded_date,
      SUM(CASE WHEN detail_payload->>'stage' = 'deep' THEN numeric_value ELSE 0 END) as deep_sleep_min,
      SUM(CASE WHEN detail_payload->>'stage' = 'rem' THEN numeric_value ELSE 0 END) as rem_sleep_min,
      SUM(numeric_value) as total_sleep_min
    FROM health_metrics
    WHERE user_id = p_user_id
      AND metric_type = 'sleep_analysis'
      AND recorded_date BETWEEN p_start_date AND p_end_date
      AND sync_status = 'synced'
    GROUP BY recorded_date
  ),
  sleep_stats AS (
    SELECT
      SUM(total_sleep_min) / 60.0 as total_hours,
      AVG(total_sleep_min) / 60.0 as avg_duration_hours,
      AVG(deep_sleep_min) as avg_deep,
      AVG(rem_sleep_min) as avg_rem,
      COUNT(*) FILTER (WHERE total_sleep_min >= 420) as good_sleep_count,  -- >= 7 hours
      COUNT(*) FILTER (WHERE total_sleep_min < 360) as poor_sleep_count,    -- < 6 hours
      STDDEV(total_sleep_min) / NULLIF(AVG(total_sleep_min), 0) as cv  -- Coefficient of Variation
    FROM sleep_data
  )
  SELECT
    total_hours::NUMERIC(6,2),
    avg_duration_hours::NUMERIC(4,2),
    avg_deep::NUMERIC(6,2),
    avg_rem::NUMERIC(6,2),
    good_sleep_count::INTEGER,
    poor_sleep_count::INTEGER,
    (1 - COALESCE(cv, 1))::NUMERIC(3,2)  -- 一致性分數：越接近1越規律
  FROM sleep_stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_sleep_quality_analysis IS '分析睡眠品質趨勢，包含總時長、深睡/REM、規律性評分';

-- ============================================================================
-- 5. 運動活動摘要函數
-- ============================================================================

-- 獲取運動活動統計摘要
CREATE OR REPLACE FUNCTION get_activity_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_exercise_minutes INTEGER,
  avg_daily_steps INTEGER,
  total_calories_burned INTEGER,
  active_days INTEGER,
  total_days INTEGER,
  activity_rate NUMERIC,
  avg_exercise_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH exercise_data AS (
    SELECT
      recorded_date,
      SUM(CASE WHEN metric_type = 'workout' THEN numeric_value ELSE 0 END) as exercise_min,
      MAX(CASE WHEN metric_type = 'steps' THEN numeric_value ELSE 0 END) as daily_steps,
      SUM(CASE WHEN metric_type = 'active_energy' THEN numeric_value ELSE 0 END) as calories
    FROM health_metrics
    WHERE user_id = p_user_id
      AND metric_type IN ('workout', 'steps', 'active_energy')
      AND recorded_date BETWEEN p_start_date AND p_end_date
      AND sync_status = 'synced'
    GROUP BY recorded_date
  ),
  date_range AS (
    SELECT (p_end_date - p_start_date + 1) as total_days
  )
  SELECT
    SUM(exercise_min)::INTEGER,
    AVG(daily_steps)::INTEGER,
    SUM(calories)::INTEGER,
    COUNT(*) FILTER (WHERE exercise_min > 0 OR daily_steps > 3000)::INTEGER,
    (SELECT total_days FROM date_range)::INTEGER,
    (COUNT(*) FILTER (WHERE exercise_min > 0 OR daily_steps > 3000)::NUMERIC /
     NULLIF((SELECT total_days FROM date_range), 0))::NUMERIC(3,2),
    AVG(NULLIF(exercise_min, 0))::NUMERIC(6,2)
  FROM exercise_data;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_activity_summary IS '獲取運動活動統計摘要，包含運動時長、步數、卡路里、活躍天數';

-- ============================================================================
-- 6. 症狀-健康指標關聯分析函數
-- ============================================================================

-- 計算睡眠與次日症狀的相關性
CREATE OR REPLACE FUNCTION analyze_sleep_symptom_correlation(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  correlation_coefficient NUMERIC,
  poor_sleep_avg_symptom NUMERIC,
  good_sleep_avg_symptom NUMERIC,
  sample_size INTEGER,
  significance_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH sleep_data AS (
    SELECT
      recorded_date,
      SUM(numeric_value) / 60.0 as sleep_hours
    FROM health_metrics
    WHERE user_id = p_user_id
      AND metric_type = 'sleep_analysis'
      AND recorded_date BETWEEN p_start_date AND p_end_date - 1  -- 前一天的睡眠
      AND sync_status = 'synced'
    GROUP BY recorded_date
  ),
  symptom_data AS (
    SELECT
      recorded_date,
      (COALESCE(abdominal_pain, 0) + COALESCE(diarrhea, 0) +
       COALESCE(bloating, 0) + COALESCE(bloody_stool, 0)) / 4.0 AS symptom_severity
    FROM daily_symptom_entries
    WHERE user_id = p_user_id
      AND recorded_date BETWEEN p_start_date AND p_end_date
  ),
  combined_data AS (
    SELECT
      s.sleep_hours,
      sy.symptom_severity
    FROM sleep_data s
    INNER JOIN symptom_data sy ON sy.recorded_date = s.recorded_date + 1  -- 次日症狀
  ),
  stats AS (
    SELECT
      COUNT(*) as n,
      CORR(sleep_hours, symptom_severity) as corr_coef,
      AVG(CASE WHEN sleep_hours < 6 THEN symptom_severity END) as poor_sleep_symptoms,
      AVG(CASE WHEN sleep_hours >= 7 THEN symptom_severity END) as good_sleep_symptoms
    FROM combined_data
  )
  SELECT
    COALESCE(corr_coef, 0)::NUMERIC(4,3),
    COALESCE(poor_sleep_symptoms, 0)::NUMERIC(3,2),
    COALESCE(good_sleep_symptoms, 0)::NUMERIC(3,2),
    n::INTEGER,
    CASE
      WHEN n < 7 THEN 'insufficient_data'
      WHEN ABS(COALESCE(corr_coef, 0)) > 0.7 THEN 'strong'
      WHEN ABS(COALESCE(corr_coef, 0)) > 0.4 THEN 'moderate'
      WHEN ABS(COALESCE(corr_coef, 0)) > 0.2 THEN 'weak'
      ELSE 'none'
    END::TEXT
  FROM stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analyze_sleep_symptom_correlation IS '分析睡眠品質與次日症狀的相關性，包含相關係數和顯著性判定';

-- ============================================================================
-- 7. 每日資料完整性檢查函數
-- ============================================================================

-- 檢查特定日期的資料完整性
CREATE OR REPLACE FUNCTION check_daily_data_completeness(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  has_symptom_entry BOOLEAN,
  has_food_entry BOOLEAN,
  has_bowel_entry BOOLEAN,
  has_sleep_data BOOLEAN,
  has_activity_data BOOLEAN,
  completeness_score NUMERIC,
  missing_categories TEXT[]
) AS $$
DECLARE
  v_has_symptom BOOLEAN;
  v_has_food BOOLEAN;
  v_has_bowel BOOLEAN;
  v_has_sleep BOOLEAN;
  v_has_activity BOOLEAN;
  v_score NUMERIC;
  v_missing TEXT[];
BEGIN
  -- Check symptom entry
  SELECT EXISTS (
    SELECT 1 FROM daily_symptom_entries
    WHERE user_id = p_user_id AND recorded_date = p_date
  ) INTO v_has_symptom;

  -- Check food entry
  SELECT EXISTS (
    SELECT 1 FROM food_entries
    WHERE user_id = p_user_id AND DATE(consumed_at) = p_date
  ) INTO v_has_food;

  -- Check bowel entry
  SELECT EXISTS (
    SELECT 1 FROM bowel_movement_entries
    WHERE user_id = p_user_id AND recorded_date = p_date
  ) INTO v_has_bowel;

  -- Check sleep data
  SELECT EXISTS (
    SELECT 1 FROM health_metrics
    WHERE user_id = p_user_id
      AND recorded_date = p_date
      AND metric_type = 'sleep_analysis'
  ) INTO v_has_sleep;

  -- Check activity data
  SELECT EXISTS (
    SELECT 1 FROM health_metrics
    WHERE user_id = p_user_id
      AND recorded_date = p_date
      AND metric_type IN ('steps', 'workout', 'active_energy')
  ) INTO v_has_activity;

  -- Calculate completeness score
  v_score := (
    (CASE WHEN v_has_symptom THEN 0.25 ELSE 0 END) +
    (CASE WHEN v_has_food THEN 0.25 ELSE 0 END) +
    (CASE WHEN v_has_bowel THEN 0.20 ELSE 0 END) +
    (CASE WHEN v_has_sleep THEN 0.15 ELSE 0 END) +
    (CASE WHEN v_has_activity THEN 0.15 ELSE 0 END)
  );

  -- Build missing categories array
  v_missing := ARRAY[]::TEXT[];
  IF NOT v_has_symptom THEN v_missing := array_append(v_missing, 'symptoms'); END IF;
  IF NOT v_has_food THEN v_missing := array_append(v_missing, 'meals'); END IF;
  IF NOT v_has_bowel THEN v_missing := array_append(v_missing, 'bowel_movements'); END IF;
  IF NOT v_has_sleep THEN v_missing := array_append(v_missing, 'sleep'); END IF;
  IF NOT v_has_activity THEN v_missing := array_append(v_missing, 'activity'); END IF;

  RETURN QUERY SELECT
    v_has_symptom,
    v_has_food,
    v_has_bowel,
    v_has_sleep,
    v_has_activity,
    v_score::NUMERIC(3,2),
    v_missing;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_daily_data_completeness IS '檢查特定日期的資料完整性，返回各類別的記錄狀態和完整度分數';

-- ============================================================================
-- 8. 飲水量統計函數
-- ============================================================================

-- 獲取飲水量統計摘要
CREATE OR REPLACE FUNCTION get_hydration_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_target_ml INTEGER DEFAULT 2000
)
RETURNS TABLE (
  avg_daily_intake INTEGER,
  total_intake INTEGER,
  days_met_target INTEGER,
  days_below_target INTEGER,
  adequacy_rate NUMERIC,
  max_intake INTEGER,
  min_intake INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_water AS (
    SELECT
      recorded_date,
      SUM(numeric_value)::INTEGER as daily_intake
    FROM health_metrics
    WHERE user_id = p_user_id
      AND metric_type = 'water_intake'
      AND recorded_date BETWEEN p_start_date AND p_end_date
      AND sync_status = 'synced'
    GROUP BY recorded_date
  )
  SELECT
    AVG(daily_intake)::INTEGER,
    SUM(daily_intake)::INTEGER,
    COUNT(*) FILTER (WHERE daily_intake >= p_target_ml)::INTEGER,
    COUNT(*) FILTER (WHERE daily_intake < p_target_ml)::INTEGER,
    (COUNT(*) FILTER (WHERE daily_intake >= p_target_ml)::NUMERIC /
     NULLIF(COUNT(*), 0))::NUMERIC(3,2),
    MAX(daily_intake)::INTEGER,
    MIN(daily_intake)::INTEGER
  FROM daily_water;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_hydration_summary IS '獲取飲水量統計摘要，包含平均攝取、達標率等';

-- ============================================================================
-- 完成通知
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Aggregate functions migration completed successfully!';
  RAISE NOTICE 'ℹ️  Created functions:';
  RAISE NOTICE '   1. get_period_health_score - 健康分數計算';
  RAISE NOTICE '   2. get_bowel_pattern_summary - 排便模式摘要';
  RAISE NOTICE '   3. get_health_metric_summary - HealthKit 指標摘要';
  RAISE NOTICE '   4. get_sleep_quality_analysis - 睡眠品質分析';
  RAISE NOTICE '   5. get_activity_summary - 運動活動摘要';
  RAISE NOTICE '   6. analyze_sleep_symptom_correlation - 睡眠-症狀關聯分析';
  RAISE NOTICE '   7. check_daily_data_completeness - 資料完整性檢查';
  RAISE NOTICE '   8. get_hydration_summary - 飲水量統計';
  RAISE NOTICE 'ℹ️  Total: 8 aggregate functions for reporting';
END $$;
