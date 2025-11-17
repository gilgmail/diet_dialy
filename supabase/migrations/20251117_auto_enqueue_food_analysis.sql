-- Migration: Auto-enqueue new foods for AI analysis
-- Created: 2025-01-17
-- Purpose: Automatically add new foods to food_analysis_refresh_queue when created

-- Create function to auto-enqueue new food for analysis
CREATE OR REPLACE FUNCTION auto_enqueue_food_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enqueue if food doesn't already have analysis
  IF NOT EXISTS (
    SELECT 1 FROM food_analysis_cache
    WHERE food_id = NEW.id
  ) THEN
    -- Insert into refresh queue with default settings
    INSERT INTO food_analysis_refresh_queue (
      food_id,
      reason,
      priority,
      status,
      scheduled_for,
      metadata
    ) VALUES (
      NEW.id,
      'new_food',
      5, -- medium priority for new foods
      'pending',
      NOW(),
      jsonb_build_object(
        'auto_enqueued', true,
        'food_name', NEW.name,
        'created_at', NEW.created_at
      )
    )
    ON CONFLICT (food_id) DO NOTHING; -- Avoid duplicates if already queued
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on diet_daily_foods INSERT
DROP TRIGGER IF EXISTS trigger_auto_enqueue_food_analysis ON diet_daily_foods;
CREATE TRIGGER trigger_auto_enqueue_food_analysis
  AFTER INSERT ON diet_daily_foods
  FOR EACH ROW
  EXECUTE FUNCTION auto_enqueue_food_analysis();

-- Add comment
COMMENT ON FUNCTION auto_enqueue_food_analysis() IS
  'Automatically enqueue new foods for AI analysis when created';
COMMENT ON TRIGGER trigger_auto_enqueue_food_analysis ON diet_daily_foods IS
  'Auto-enqueue new foods for AI analysis';
