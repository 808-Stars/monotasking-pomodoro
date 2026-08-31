-- 连续打卡统计：在数据库内一次完成计算，避免前端按天串行请求。
-- 逻辑日沿用前端规则：每天凌晨 4 点切换到新的一天。

CREATE INDEX IF NOT EXISTS idx_token_records_streak_lookup
  ON public.token_records (user_id, source, created_at DESC)
  WHERE amount > 0;

CREATE OR REPLACE FUNCTION public.get_user_streak()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_streak integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  -- 项目当前按上海时区解释用户的逻辑日；凌晨 4 点前仍属于前一天。
  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;

  WITH RECURSIVE activity_days AS (
    SELECT DISTINCT
      (tr.created_at AT TIME ZONE 'Asia/Shanghai' - interval '4 hours')::date AS logical_day
    FROM public.token_records AS tr
    WHERE tr.user_id = auth.uid()
      AND tr.amount > 0
      AND tr.source IN (
        '首次番茄钟', '休息', '创建任务', '完成任务', '确定核心任务',
        '晨间规划', '晚间回顾', '每日计划完成', '写笔记', '创建清单',
        '完成清单', '抽扭蛋', '番茄钟'
      )
  ),
  streak_days AS (
    SELECT v_today AS logical_day
    WHERE EXISTS (
      SELECT 1 FROM activity_days AS ad WHERE ad.logical_day = v_today
    )

    UNION ALL

    SELECT sd.logical_day - 1
    FROM streak_days AS sd
    WHERE EXISTS (
      SELECT 1
      FROM activity_days AS ad
      WHERE ad.logical_day = sd.logical_day - 1
    )
  )
  SELECT COUNT(*)
    INTO v_streak
  FROM streak_days;

  RETURN v_streak;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_streak() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_streak() TO authenticated;

-- 每周任务专用：只统计本周一至当前逻辑日，保持原有业务口径。
CREATE OR REPLACE FUNCTION public.get_user_week_streak()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_week_start date;
  v_streak integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_week_start := v_today - (EXTRACT(ISODOW FROM v_today)::integer - 1);

  WITH RECURSIVE activity_days AS (
    SELECT DISTINCT
      (tr.created_at AT TIME ZONE 'Asia/Shanghai' - interval '4 hours')::date AS logical_day
    FROM public.token_records AS tr
    WHERE tr.user_id = auth.uid()
      AND tr.amount > 0
      AND tr.source IN (
        '首次番茄钟', '休息', '创建任务', '完成任务', '确定核心任务',
        '晨间规划', '晚间回顾', '每日计划完成', '写笔记', '创建清单',
        '完成清单', '抽扭蛋', '番茄钟'
      )
      AND tr.created_at >= ((v_week_start::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai')
      AND tr.created_at < (((v_today + 1)::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai')
  ),
  streak_days AS (
    SELECT v_today AS logical_day
    WHERE EXISTS (
      SELECT 1 FROM activity_days AS ad WHERE ad.logical_day = v_today
    )

    UNION ALL

    SELECT sd.logical_day - 1
    FROM streak_days AS sd
    WHERE sd.logical_day > v_week_start
      AND EXISTS (
        SELECT 1
        FROM activity_days AS ad
        WHERE ad.logical_day = sd.logical_day - 1
      )
  )
  SELECT COUNT(*)
    INTO v_streak
  FROM streak_days;

  RETURN v_streak;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_week_streak() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_week_streak() TO authenticated;
