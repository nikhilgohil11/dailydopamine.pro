-- ============================================================
-- DailyDopamine.pro - Supabase Schema for Task Sync
-- Copy and paste this entire script into Supabase SQL Editor → Run
-- ============================================================

-- 1. Create the task_state table
-- Each user gets one row; tasks, completed_tasks, canceled_tasks, and stats are stored as JSONB
CREATE TABLE IF NOT EXISTS public.task_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  canceled_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.task_state ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policy (safe to re-run this script)
DROP POLICY IF EXISTS "Users can manage own task state" ON public.task_state;

-- 4. Create RLS policy: users can only read/write their own row
CREATE POLICY "Users can manage own task state"
  ON public.task_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Grant access to authenticated users (Supabase anon/authenticated roles)
GRANT ALL ON public.task_state TO authenticated;
GRANT ALL ON public.task_state TO service_role;

-- ============================================================
-- Done. Your task_state table is ready for cloud sync.
-- ============================================================
