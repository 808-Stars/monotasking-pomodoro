-- 支持自定义倒计时和顺计时：一条工作记录可代表 0~4 个完整番茄钟。
ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS pomodoro_count integer NOT NULL DEFAULT 1;

UPDATE public.pomodoro_sessions
SET pomodoro_count = CASE
  WHEN type = 'WORK' AND status = 'COMPLETED'
    THEN LEAST(4, GREATEST(0, FLOOR(COALESCE(duration_minutes, 0) / 25)))::integer
  ELSE 0
END
WHERE pomodoro_count = 1;

ALTER TABLE public.pomodoro_sessions
  DROP CONSTRAINT IF EXISTS pomodoro_sessions_pomodoro_count_check;
ALTER TABLE public.pomodoro_sessions
  ADD CONSTRAINT pomodoro_sessions_pomodoro_count_check CHECK (pomodoro_count BETWEEN 0 AND 4);

-- 统计按一条记录代表的完整番茄钟数汇总，而不是按记录条数汇总。
CREATE OR REPLACE FUNCTION public.get_pomodoro_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date;
  v_day_start timestamptz;
  v_week_start timestamptz;
  v_month_start timestamptz;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('today', 0, 'this_week', 0, 'this_month', 0, 'total', 0);
  END IF;

  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_day_start := ((v_today::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_week_start := ((((v_today - (EXTRACT(ISODOW FROM v_today)::integer - 1))::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_month_start := (((date_trunc('month', v_today)::date::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');

  SELECT jsonb_build_object(
    'today', COALESCE(SUM(pomodoro_count) FILTER (WHERE start_time >= v_day_start), 0),
    'this_week', COALESCE(SUM(pomodoro_count) FILTER (WHERE start_time >= v_week_start), 0),
    'this_month', COALESCE(SUM(pomodoro_count) FILTER (WHERE start_time >= v_month_start), 0),
    'total', COALESCE(SUM(pomodoro_count), 0)
  ) INTO v_result
  FROM public.pomodoro_sessions
  WHERE user_id = v_user_id
    AND type = 'WORK'
    AND status = 'COMPLETED';

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pomodoro_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pomodoro_stats() TO authenticated;

-- 工作台汇总中的番茄钟数量也按 pomodoro_count 汇总。
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date;
  v_day_start timestamptz;
  v_tomorrow_start timestamptz;
  v_week_start timestamptz;
  v_month_start timestamptz;
  v_plan jsonb;
  v_tasks jsonb;
  v_pomodoros jsonb;
  v_projects integer;
  v_sessions jsonb;
  v_streak integer;
BEGIN
  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_day_start := ((v_today::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_tomorrow_start := (((v_today + 1)::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_week_start := ((((v_today - (EXTRACT(ISODOW FROM v_today)::integer - 1))::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_month_start := (((date_trunc('month', v_today)::date::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');

  INSERT INTO public.daily_plans (user_id, date, status)
  VALUES (v_user_id, v_today, 'UNPLANNED')
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT jsonb_build_object(
    'id', dp.id, 'date', dp.date, 'core_task_id', dp.core_task_id, 'status', dp.status,
    'morning_reflection', dp.morning_reflection, 'evening_review', dp.evening_review,
    'notes', dp.notes, 'created_at', dp.created_at, 'updated_at', dp.updated_at,
    'tasks', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('name', t.name, 'status', t.status) END
  ) INTO v_plan
  FROM public.daily_plans dp
  LEFT JOIN public.tasks t ON t.id = dp.core_task_id
  WHERE dp.user_id = v_user_id AND dp.date = v_today;

  SELECT jsonb_build_object(
    'total', COUNT(*), 'todo', COUNT(*) FILTER (WHERE t.status = 'TODO'),
    'in_progress', COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS'),
    'completed', COUNT(*) FILTER (WHERE t.status = 'DONE'),
    'today_completed', COUNT(*) FILTER (WHERE t.status = 'DONE' AND t.updated_at >= v_day_start),
    'week_completed', COUNT(*) FILTER (WHERE t.status = 'DONE' AND t.updated_at >= v_week_start),
    'month_completed', COUNT(*) FILTER (WHERE t.status = 'DONE' AND t.updated_at >= v_month_start)
  ) INTO v_tasks FROM public.tasks t WHERE t.user_id = v_user_id;

  SELECT jsonb_build_object(
    'today', COALESCE(SUM(ps.pomodoro_count) FILTER (WHERE ps.start_time >= v_day_start AND ps.start_time < v_tomorrow_start), 0),
    'this_week', COALESCE(SUM(ps.pomodoro_count) FILTER (WHERE ps.start_time >= v_week_start), 0),
    'this_month', COALESCE(SUM(ps.pomodoro_count) FILTER (WHERE ps.start_time >= v_month_start), 0),
    'total', COALESCE(SUM(ps.pomodoro_count), 0)
  ) INTO v_pomodoros
  FROM public.pomodoro_sessions ps
  WHERE ps.user_id = v_user_id AND ps.type = 'WORK' AND ps.status = 'COMPLETED';

  SELECT COUNT(*) INTO v_projects FROM public.projects p WHERE p.user_id = v_user_id AND p.status = 'ACTIVE';

  SELECT COALESCE(jsonb_agg(limited_sessions.session_row ORDER BY limited_sessions.start_time DESC), '[]'::jsonb)
  INTO v_sessions
  FROM (
    SELECT jsonb_build_object(
      'id', ps.id, 'tasks', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('name', t.name) END,
      'type', ps.type, 'status', ps.status, 'duration_minutes', ps.duration_minutes,
      'start_time', ps.start_time, 'end_time', ps.end_time
    ) AS session_row, ps.start_time
    FROM public.pomodoro_sessions ps
    LEFT JOIN public.tasks t ON t.id = ps.task_id
    WHERE ps.user_id = v_user_id AND ps.start_time >= v_day_start AND ps.start_time < v_tomorrow_start
    ORDER BY ps.start_time DESC LIMIT 10
  ) limited_sessions;

  SELECT public.get_user_streak() INTO v_streak;
  RETURN jsonb_build_object(
    'today_plan', v_plan, 'tasks', v_tasks, 'pomodoros', v_pomodoros,
    'projects', jsonb_build_object('active', v_projects), 'today_sessions', v_sessions,
    'streak', COALESCE(v_streak, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;
