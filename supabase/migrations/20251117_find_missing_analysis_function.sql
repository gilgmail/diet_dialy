-- Migration: Function to find foods missing AI analysis
-- Created: 2025-01-17
-- Purpose: Find all foods that don't have AI analysis in cache

-- Create function to find foods without analysis
CREATE OR REPLACE FUNCTION find_foods_missing_analysis()
RETURNS TABLE (
  food_id UUID,
  food_name TEXT,
  category TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS food_id,
    f.name AS food_name,
    f.category,
    f.created_at
  FROM diet_daily_foods f
  LEFT JOIN food_analysis_cache c ON f.id = c.food_id
  WHERE c.food_id IS NULL  -- No cache entry exists
    AND f.verification_status IN ('admin_approved', 'ai_approved', 'approved') -- Only approved foods
    AND NOT EXISTS (
      -- Not already in queue
      SELECT 1 FROM food_analysis_refresh_queue q
      WHERE q.food_id = f.id
        AND q.status IN ('pending', 'in_progress')
    )
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION find_foods_missing_analysis() IS
  'Find all approved foods that are missing AI analysis and not in queue';
