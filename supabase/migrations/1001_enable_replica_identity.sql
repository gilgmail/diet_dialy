-- Enable full replica identity for tables to support DELETE events in Realtime
-- This ensures the 'old' record contains all columns, allowing filtering by user_id on DELETE

ALTER TABLE public.food_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;

