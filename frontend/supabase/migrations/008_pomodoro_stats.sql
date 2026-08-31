-- 番茄钟统计汇总：一次返回今日、本周、本月和总计。

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
    'today', COUNT(*) FILTER (WHERE start_time >= v_day_start),
    'this_week', COUNT(*) FILTER (WHERE start_time >= v_week_start),
    'this_month', COUNT(*) FILTER (WHERE start_time >= v_month_start),
    'total', COUNT(*)
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
