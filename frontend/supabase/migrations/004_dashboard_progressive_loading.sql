-- 工作台渐进式加载：核心数据与次要数据分开查询。

CREATE OR REPLACE FUNCTION public.get_dashboard_core()
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
  v_streak integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_day_start := ((v_today::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_tomorrow_start := (((v_today + 1)::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_week_start := ((((v_today - (EXTRACT(ISODOW FROM v_today)::integer - 1))::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_month_start := (((date_trunc('month', v_today)::date::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');

  INSERT INTO public.daily_plans (user_id, date, status)
  VALUES (v_user_id, v_today, 'UNPLANNED')
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT jsonb_build_object(
    'id', dp.id,
    'date', dp.date,
    'core_task_id', dp.core_task_id,
    'status', dp.status,
    'morning_reflection', dp.morning_reflection,
    'evening_review', dp.evening_review,
    'notes', dp.notes,
    'created_at', dp.created_at,
    'updated_at', dp.updated_at,
    'tasks', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('name', t.name, 'status', t.status) END
  )
  INTO v_plan
  FROM public.daily_plans AS dp
  LEFT JOIN public.tasks AS t ON t.id = dp.core_task_id
  WHERE dp.user_id = v_user_id AND dp.date = v_today;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'todo', COUNT(*) FILTER (WHERE t.status = 'TODO'),
    'in_progress', COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS'),
    'completed', COUNT(*) FILTER (WHERE t.status = 'DONE'),
    'today_completed', COUNT(*) FILTER (WHERE t.status = 'DONE' AND t.updated_at >= v_day_start),
    'week_completed', COUNT(*) FILTER (WHERE t.status = 'DONE' AND t.updated_at >= v_week_start),
    'month_completed', COUNT(*) FILTER (WHERE t.status = 'DONE' AND t.updated_at >= v_month_start)
  )
  INTO v_tasks
  FROM public.tasks AS t
  WHERE t.user_id = v_user_id;

  SELECT jsonb_build_object(
    'today', COUNT(*) FILTER (WHERE ps.start_time >= v_day_start AND ps.start_time < v_tomorrow_start),
    'this_week', COUNT(*) FILTER (WHERE ps.start_time >= v_week_start),
    'this_month', COUNT(*) FILTER (WHERE ps.start_time >= v_month_start),
    'total', COUNT(*)
  )
  INTO v_pomodoros
  FROM public.pomodoro_sessions AS ps
  WHERE ps.user_id = v_user_id
    AND ps.type = 'WORK'
    AND ps.status = 'COMPLETED';

  SELECT public.get_user_streak() INTO v_streak;

  RETURN jsonb_build_object(
    'today_plan', v_plan,
    'tasks', v_tasks,
    'pomodoros', v_pomodoros,
    'streak', COALESCE(v_streak, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_secondary()
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
  v_tomorrow_start timestamptz;
  v_projects integer;
  v_sessions jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_day_start := ((v_today::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_tomorrow_start := (((v_today + 1)::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');

  SELECT COUNT(*) INTO v_projects
  FROM public.projects AS p
  WHERE p.user_id = v_user_id AND p.status = 'ACTIVE';

  SELECT COALESCE(jsonb_agg(limited_sessions.session_row ORDER BY limited_sessions.start_time DESC), '[]'::jsonb)
  INTO v_sessions
  FROM (
    SELECT jsonb_build_object(
      'id', ps.id,
      'tasks', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('name', t.name) END,
      'type', ps.type,
      'status', ps.status,
      'duration_minutes', ps.duration_minutes,
      'start_time', ps.start_time,
      'end_time', ps.end_time
    ) AS session_row,
    ps.start_time
    FROM public.pomodoro_sessions AS ps
    LEFT JOIN public.tasks AS t ON t.id = ps.task_id
    WHERE ps.user_id = v_user_id
      AND ps.start_time >= v_day_start
      AND ps.start_time < v_tomorrow_start
    ORDER BY ps.start_time DESC
    LIMIT 10
  ) AS limited_sessions;

  RETURN jsonb_build_object(
    'projects', jsonb_build_object('active', v_projects),
    'today_sessions', v_sessions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_core() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_secondary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_core() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_secondary() TO authenticated;
