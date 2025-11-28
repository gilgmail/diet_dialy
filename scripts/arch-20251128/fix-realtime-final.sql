-- ======================================================
-- Supabase Realtime 修復腳本 (只針對存在的表)
-- 請在 Supabase SQL Editor 中運行
-- ======================================================

-- 步驟 1: 設置 REPLICA IDENTITY 為 FULL（最關鍵的設置！）
-- ======================================================
ALTER TABLE public.food_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;
ALTER TABLE public.bowel_movement_entries REPLICA IDENTITY FULL;

-- 步驟 2: 驗證 REPLICA IDENTITY 設置
-- ======================================================
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'f' THEN 'full ✓'
    WHEN 'n' THEN 'nothing'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries')
ORDER BY c.relname;

-- 步驟 3: 檢查 Publication 狀態
-- ======================================================
SELECT 
  tablename,
  schemaname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries')
ORDER BY tablename;

-- 步驟 4: 如果步驟 3 沒有顯示某些表，取消下面的註釋來添加
-- ======================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.food_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_symptom_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bowel_movement_entries;

-- ======================================================
-- 完成！現在 Realtime 應該可以正常工作了
-- ======================================================

