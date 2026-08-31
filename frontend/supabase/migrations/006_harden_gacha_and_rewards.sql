-- 扭蛋入口安全包装：authenticated 用户只能调用无 user_id 的安全入口。
-- 原子抽取函数保留为内部函数，仅由安全包装函数调用。

DO $$
BEGIN
  IF to_regprocedure('public.gacha_pull(uuid,integer,text,text)') IS NOT NULL
     AND to_regprocedure('public.gacha_pull_internal(uuid,integer,text,text)') IS NULL THEN
    ALTER FUNCTION public.gacha_pull(uuid, integer, text, text) RENAME TO gacha_pull_internal;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.gacha_pull_internal(uuid, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gacha_pull_internal(uuid, integer, text, text) FROM authenticated;
ALTER FUNCTION public.gacha_pull_internal(uuid, integer, text, text) SET search_path = public;

CREATE OR REPLACE FUNCTION public.gacha_pull(p_count integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '未登录';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  IF p_count NOT IN (1, 10) THEN
    RAISE EXCEPTION '抽取次数只能是 1 或 10';
  END IF;

  RETURN public.gacha_pull_internal(
    auth.uid(),
    p_count,
    to_char((timezone('Asia/Shanghai', now()) - interval '4 hours')::date, 'YYYY-MM-DD'),
    to_char((timezone('Asia/Shanghai', now()) - interval '4 hours')::date, 'YYYY-MM')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gacha_pull(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gacha_pull(integer) TO authenticated;

-- 代币流水默认不允许客户端直接插入任意金额和来源。
DROP POLICY IF EXISTS "Users can manage own token_records" ON public.token_records;
DROP POLICY IF EXISTS "Users can read own token_records" ON public.token_records;
CREATE POLICY "Users can read own token_records"
  ON public.token_records FOR SELECT
  USING (auth.uid() = user_id);

-- 受控奖励入口：金额由服务端根据固定来源决定。
CREATE OR REPLACE FUNCTION public.grant_token_reward(
  p_source text,
  p_amount integer DEFAULT NULL,
  p_daily boolean DEFAULT false
)
RETURNS public.token_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_amount integer;
  v_expected integer;
  v_existing public.token_records;
  v_record public.token_records;
  v_is_daily boolean;
  v_activity_count integer;
  v_today_start timestamptz := ((timezone('Asia/Shanghai', now()) - interval '4 hours')::date::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai';
  v_week_start date := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date - (EXTRACT(ISODOW FROM (timezone('Asia/Shanghai', now()) - interval '4 hours')::date)::integer - 1);
  v_progress integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '未登录';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  v_expected := CASE p_source
    WHEN '首次番茄钟' THEN 60
    WHEN '休息' THEN 20
    WHEN '创建任务' THEN 20
    WHEN '完成任务' THEN 20
    WHEN '确定核心任务' THEN 20
    WHEN '晨间规划' THEN 40
    WHEN '晚间回顾' THEN 40
    WHEN '每日计划完成' THEN 60
    WHEN '写笔记' THEN 40
    WHEN '创建清单' THEN 20
    WHEN '完成清单' THEN 20
    WHEN '抽扭蛋' THEN 40
    WHEN '周任务·完成核心任务 5 天' THEN 400
    WHEN '周任务·番茄钟 40 个' THEN 400
    WHEN '周任务·写日记3篇+周记1篇' THEN 200
    WHEN '周任务·连续打卡 7 天' THEN 400
    ELSE NULL
  END;

  IF p_source = '番茄钟' THEN
    IF p_amount NOT IN (40, 50, 60) THEN
      RAISE EXCEPTION '番茄钟奖励金额无效';
    END IF;
    IF (
      SELECT COUNT(*)
      FROM public.pomodoro_sessions
      WHERE user_id = v_user_id
        AND type = 'WORK'
        AND status = 'COMPLETED'
        AND start_time >= v_today_start
    ) <= (
      SELECT COUNT(*)
      FROM public.token_records
      WHERE user_id = v_user_id
        AND source = '番茄钟'
        AND created_at >= v_today_start
    ) THEN
      RAISE EXCEPTION '没有可领取的番茄钟奖励';
    END IF;
    v_amount := p_amount;
  ELSIF p_source = '连续打卡' THEN
    v_amount := public.get_user_streak() * 10;
    IF v_amount <= 0 THEN
      RETURN NULL;
    END IF;
  ELSIF v_expected IS NULL THEN
    RAISE EXCEPTION '不支持的奖励来源';
  ELSE
    v_amount := v_expected;
    IF p_amount IS NOT NULL AND p_amount <> v_expected THEN
      RAISE EXCEPTION '奖励金额与来源不匹配';
    END IF;
  END IF;

  IF p_source LIKE '周任务·%' THEN
    v_progress := CASE p_source
      WHEN '周任务·完成核心任务 5 天' THEN (
        SELECT COUNT(*)::integer FROM public.daily_plans
        WHERE user_id = v_user_id
          AND date >= v_week_start AND date < v_week_start + 7
          AND status IN ('COMPLETED', 'REVIEWED')
      )
      WHEN '周任务·番茄钟 40 个' THEN (
        SELECT COUNT(*)::integer FROM public.pomodoro_sessions
        WHERE user_id = v_user_id
          AND type = 'WORK' AND status = 'COMPLETED'
          AND start_time >= (v_week_start::timestamp AT TIME ZONE 'Asia/Shanghai')
          AND start_time < ((v_week_start + 7)::timestamp AT TIME ZONE 'Asia/Shanghai')
      )
      WHEN '周任务·写日记3篇+周记1篇' THEN (
        LEAST((SELECT COUNT(*)::integer FROM public.reviews WHERE user_id = v_user_id AND type = 'DAILY' AND date >= v_week_start AND date < v_week_start + 7), 3)
        + LEAST((SELECT COUNT(*)::integer FROM public.reviews WHERE user_id = v_user_id AND type = 'WEEKLY' AND date >= v_week_start AND date < v_week_start + 7), 1)
      )
      WHEN '周任务·连续打卡 7 天' THEN LEAST(public.get_user_week_streak(), 7)
      ELSE 0
    END;

    IF v_progress < (
      CASE p_source
        WHEN '周任务·完成核心任务 5 天' THEN 5
        WHEN '周任务·番茄钟 40 个' THEN 40
        WHEN '周任务·写日记3篇+周记1篇' THEN 4
        WHEN '周任务·连续打卡 7 天' THEN 7
        ELSE 1
      END
    ) THEN
      RAISE EXCEPTION '周任务进度不足';
    END IF;
  END IF;

  v_is_daily := p_daily OR p_source IN (
    '首次番茄钟', '休息', '创建任务', '完成任务', '确定核心任务',
    '晨间规划', '晚间回顾', '每日计划完成', '写笔记', '创建清单', '完成清单', '抽扭蛋'
  );

  IF p_source IN (
    '首次番茄钟', '休息', '创建任务', '完成任务', '确定核心任务',
    '晨间规划', '晚间回顾', '每日计划完成', '写笔记', '创建清单', '完成清单', '抽扭蛋'
  ) THEN
    v_activity_count := CASE p_source
      WHEN '首次番茄钟' THEN (SELECT COUNT(*)::integer FROM public.pomodoro_sessions WHERE user_id = v_user_id AND type = 'WORK' AND status = 'COMPLETED' AND start_time >= v_today_start)
      WHEN '休息' THEN (SELECT COUNT(*)::integer FROM public.pomodoro_sessions WHERE user_id = v_user_id AND type IN ('SHORT_BREAK', 'LONG_BREAK') AND status = 'COMPLETED' AND start_time >= v_today_start)
      WHEN '创建任务' THEN (SELECT COUNT(*)::integer FROM public.tasks WHERE user_id = v_user_id AND created_at >= v_today_start)
      WHEN '完成任务' THEN (SELECT COUNT(*)::integer FROM public.tasks WHERE user_id = v_user_id AND status = 'DONE' AND updated_at >= v_today_start)
      WHEN '确定核心任务' THEN (SELECT COUNT(*)::integer FROM public.daily_plans WHERE user_id = v_user_id AND date = (v_today_start AT TIME ZONE 'Asia/Shanghai')::date AND core_task_id IS NOT NULL)
      WHEN '晨间规划' THEN (SELECT COUNT(*)::integer FROM public.daily_plans WHERE user_id = v_user_id AND date = (v_today_start AT TIME ZONE 'Asia/Shanghai')::date AND NULLIF(trim(morning_reflection), '') IS NOT NULL)
      WHEN '晚间回顾' THEN (SELECT COUNT(*)::integer FROM public.daily_plans WHERE user_id = v_user_id AND date = (v_today_start AT TIME ZONE 'Asia/Shanghai')::date AND NULLIF(trim(evening_review), '') IS NOT NULL)
      WHEN '每日计划完成' THEN (SELECT COUNT(*)::integer FROM public.daily_plans WHERE user_id = v_user_id AND date = (v_today_start AT TIME ZONE 'Asia/Shanghai')::date AND status IN ('COMPLETED', 'REVIEWED'))
      WHEN '写笔记' THEN (SELECT COUNT(*)::integer FROM public.reviews WHERE user_id = v_user_id AND created_at >= v_today_start)
      WHEN '创建清单' THEN (SELECT COUNT(*)::integer FROM public.quick_memos WHERE user_id = v_user_id AND created_at >= v_today_start)
      WHEN '完成清单' THEN (SELECT COUNT(*)::integer FROM public.quick_memos WHERE user_id = v_user_id AND is_done = true AND updated_at >= v_today_start)
      WHEN '抽扭蛋' THEN (SELECT COUNT(*)::integer FROM public.gacha_records WHERE user_id = v_user_id AND created_at >= v_today_start)
      ELSE 0
    END;

    IF v_activity_count <= (
      SELECT COUNT(*)::integer
      FROM public.token_records
      WHERE user_id = v_user_id AND source = p_source AND created_at >= v_today_start
    ) THEN
      RAISE EXCEPTION '没有可领取的 % 奖励', p_source;
    END IF;
  END IF;

  IF v_is_daily OR p_source = '连续打卡' OR p_source LIKE '周任务·%' THEN
    SELECT * INTO v_existing
    FROM public.token_records
    WHERE user_id = v_user_id
      AND source = p_source
      AND created_at >= CASE
        WHEN p_source LIKE '周任务·%' THEN
          ((date_trunc('week', timezone('Asia/Shanghai', now()) - interval '4 hours')::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai')
        ELSE v_today_start
      END
    ORDER BY created_at
    LIMIT 1;
    IF v_existing.id IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.token_records (user_id, amount, source, claimed, claimed_at)
  VALUES (v_user_id, v_amount, p_source, true, now())
  RETURNING * INTO v_record;
  RETURN v_record;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_token_reward(text, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_token_reward(text, integer, boolean) TO authenticated;
