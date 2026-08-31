-- 主要历史查询和统计查询的组合索引，均可重复执行。

CREATE INDEX IF NOT EXISTS idx_token_records_user_source_created
  ON public.token_records (user_id, source, created_at DESC)
  WHERE amount > 0;

CREATE INDEX IF NOT EXISTS idx_token_records_user_created
  ON public.token_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gacha_records_user_created
  ON public.gacha_records (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_filter_start
  ON public.pomodoro_sessions (user_id, type, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_type_date
  ON public.reviews (user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date
  ON public.daily_plans (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_created
  ON public.tasks (user_id, status, created_at DESC);
