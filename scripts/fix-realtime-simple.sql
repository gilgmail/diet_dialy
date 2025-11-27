-- ======================================================
-- Supabase Realtime 簡化修復腳本
-- 請在 Supabase SQL Editor 中運行
-- ======================================================

-- 步驟 1: 設置 REPLICA IDENTITY 為 FULL（最關鍵的設置！）
-- ======================================================
ALTER TABLE public.food_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;
ALTER TABLE public.bowel_movement_entries REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 步驟 2: 驗證 REPLICA IDENTITY 設置
-- ======================================================
SELECT 
  n.nspname as schema,
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default (需要修復)'
    WHEN 'n' THEN 'nothing (需要修復)'
    WHEN 'f' THEN 'full (正確!)'
    WHEN 'i' THEN 'index (需要修復)'
  END as replica_identity,
  CASE 
    WHEN c.relreplident = 'f' THEN 'OK'
    ELSE 'ERROR'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users')
ORDER BY c.relname;

-- 步驟 3: 檢查 Publication 狀態
-- ======================================================
SELECT 
  schemaname,
  tablename,
  'OK' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users')
ORDER BY tablename;

-- 步驟 4: 如果上面的查詢沒有顯示某些表，取消下面的註釋來添加
-- ======================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.food_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_symptom_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bowel_movement_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ======================================================
-- 完成！
-- 預期結果：
-- - 步驟 2 應該顯示所有表的 replica_identity 為 "full"
-- - 步驟 3 應該顯示所有表都在 publication 中
-- ======================================================

