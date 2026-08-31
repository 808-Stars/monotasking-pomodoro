-- 生产正确性补丁：收紧扭蛋写权限、统一逻辑日、补充幂等和安全写入入口。

-- 休息计时允许不绑定任务；工作计时仍由前端强制选择任务。
ALTER TABLE public.pomodoro_sessions
  ALTER COLUMN task_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can manage own gacha_records" ON public.gacha_records;
DROP POLICY IF EXISTS "Users can read own gacha_records" ON public.gacha_records;
CREATE POLICY "Users can read own gacha_records"
  ON public.gacha_records FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own gacha_ssr_targets" ON public.gacha_ssr_targets;
DROP POLICY IF EXISTS "Users can read own gacha_ssr_targets" ON public.gacha_ssr_targets;
CREATE POLICY "Users can read own gacha_ssr_targets"
  ON public.gacha_ssr_targets FOR SELECT USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_weekly_task_claims_user_task_week
  ON public.weekly_task_claims (user_id, task_key, week_start);

-- 既有内部函数仍接受日期字符串；将其转换为 04:00 上海时间。
DO $$
DECLARE
  function_definition text;
BEGIN
  IF to_regprocedure('public.gacha_pull_internal(uuid,integer,text,text)') IS NULL THEN
    RAISE EXCEPTION 'gacha_pull_internal 不存在，请先执行 001 和 006 migration';
  END IF;

  function_definition := pg_get_functiondef(
    'public.gacha_pull_internal(uuid,integer,text,text)'::regprocedure
  );
  function_definition := replace(
    function_definition,
    'v_today::timestamptz',
    '(v_today || ''T04:00:00+08:00'')::timestamptz'
  );
  function_definition := replace(
    function_definition,
    '(v_ym || ''-01'')::timestamptz',
    '(v_ym || ''-01T04:00:00+08:00'')::timestamptz'
  );
  function_definition := replace(
    function_definition,
    'WHERE user_id = p_user_id AND claimed = true;',
    'WHERE user_id = p_user_id AND claimed = true AND created_at >= (v_ym || ''-01T04:00:00+08:00'')::timestamptz;'
  );
  EXECUTE function_definition;
END;
$$;

-- 周任务中的番茄钟统计也必须使用 04:00 上海逻辑日边界，而不是 00:00。
DO $$
DECLARE
  function_definition text;
BEGIN
  IF to_regprocedure('public.grant_token_reward(text,integer,boolean)') IS NULL THEN
    RAISE EXCEPTION 'grant_token_reward 不存在，请先执行 006 migration';
  END IF;

  function_definition := pg_get_functiondef(
    'public.grant_token_reward(text,integer,boolean)'::regprocedure
  );
  function_definition := replace(
    function_definition,
    '(v_week_start::timestamp AT TIME ZONE ''Asia/Shanghai'')',
    '((v_week_start::timestamp + interval ''4 hours'') AT TIME ZONE ''Asia/Shanghai'')'
  );
  function_definition := replace(
    function_definition,
    '((v_week_start + 7)::timestamp AT TIME ZONE ''Asia/Shanghai'')',
    '(((v_week_start + 7)::timestamp + interval ''4 hours'') AT TIME ZONE ''Asia/Shanghai'')'
  );
  EXECUTE function_definition;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ssr_target(p_target_item_id uuid)
RETURNS public.gacha_ssr_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_month text := to_char((timezone('Asia/Shanghai', now()) - interval '4 hours')::date, 'YYYY-MM');
  v_month_start timestamptz := ((date_trunc('month', timezone('Asia/Shanghai', now()) - interval '4 hours') + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_pulls integer;
  v_item public.gacha_items;
  v_target public.gacha_ssr_targets;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '未登录'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT * INTO v_item FROM public.gacha_items WHERE id = p_target_item_id;
  IF v_item.id IS NULL OR v_item.rarity <> 'SSR' THEN
    RAISE EXCEPTION '只能锁定 SSR 物品';
  END IF;

  SELECT COUNT(*)::integer INTO v_pulls
  FROM public.gacha_records
  WHERE user_id = v_user_id AND created_at >= v_month_start;
  IF v_pulls < 300 THEN
    RAISE EXCEPTION '本月累计需要 300 抽才能解锁（当前 % 抽）', v_pulls;
  END IF;

  INSERT INTO public.gacha_ssr_targets (user_id, target_item_id, year_month, consumed)
  VALUES (v_user_id, p_target_item_id, v_month, false)
  ON CONFLICT (user_id, year_month) DO UPDATE
    SET target_item_id = EXCLUDED.target_item_id, consumed = false
  RETURNING * INTO v_target;
  RETURN v_target;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gacha_ssr_targets_user_month
  ON public.gacha_ssr_targets (user_id, year_month);

REVOKE ALL ON FUNCTION public.set_ssr_target(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_ssr_target(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_ssr_target()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '未登录'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  DELETE FROM public.gacha_ssr_targets WHERE user_id = auth.uid();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_ssr_target() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_ssr_target() TO authenticated;

-- 兼容迁移前遗留的待领取记录；新奖励仍必须通过 grant_token_reward 产生。
CREATE OR REPLACE FUNCTION public.claim_daily_rewards(p_source text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now_shanghai timestamp := timezone('Asia/Shanghai', now());
  v_day_start timestamptz := (((v_now_shanghai::date + CASE WHEN v_now_shanghai::time < time '04:00' THEN -1 ELSE 0 END)::timestamp + time '04:00') AT TIME ZONE 'Asia/Shanghai');
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '未登录'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  UPDATE public.token_records
  SET claimed = true, claimed_at = now()
  WHERE user_id = v_user_id AND claimed = false AND amount > 0
    AND created_at >= v_day_start
    AND source IN ('首次番茄钟', '休息', '创建任务', '完成任务', '确定核心任务', '晨间规划', '晚间回顾', '每日计划完成', '写笔记', '创建清单', '完成清单', '抽扭蛋')
    AND (p_source IS NULL OR source = p_source);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_rewards(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_rewards(text) TO authenticated;

-- 周任务领取必须在同一事务中完成：验证进度、写领取记录、发放代币。
CREATE OR REPLACE FUNCTION public.claim_weekly_task(p_task_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_week_start date;
  v_week_end date;
  v_amount integer;
  v_target integer;
  v_source text;
  v_progress integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '未登录'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  v_week_start := v_today - (EXTRACT(ISODOW FROM v_today)::integer - 1);
  v_week_end := v_week_start + 7;

  SELECT amount, target, source
  INTO v_amount, v_target, v_source
  FROM (VALUES
    ('core_5_days', 400, 5, '周任务·完成核心任务 5 天'),
    ('pomodoros_25', 400, 40, '周任务·番茄钟 40 个'),
    ('reviews_3', 200, 4, '周任务·写日记3篇+周记1篇'),
    ('streak_7', 400, 7, '周任务·连续打卡 7 天')
  ) AS tasks(task_key, amount, target, source)
  WHERE tasks.task_key = p_task_key;

  IF v_amount IS NULL THEN RAISE EXCEPTION '不支持的周任务'; END IF;

  IF p_task_key = 'core_5_days' THEN
    SELECT COUNT(*)::integer INTO v_progress
    FROM public.daily_plans
    WHERE user_id = v_user_id AND date >= v_week_start AND date < v_week_end
      AND status IN ('COMPLETED', 'REVIEWED');
  ELSIF p_task_key = 'pomodoros_25' THEN
    SELECT COUNT(*)::integer INTO v_progress
    FROM public.pomodoro_sessions
    WHERE user_id = v_user_id AND type = 'WORK' AND status = 'COMPLETED'
      AND start_time >= ((v_week_start::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai')
      AND start_time < ((v_week_end::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  ELSIF p_task_key = 'reviews_3' THEN
    SELECT LEAST((SELECT COUNT(*)::integer FROM public.reviews
      WHERE user_id = v_user_id AND type = 'DAILY' AND date >= v_week_start AND date < v_week_end), 3)
      + LEAST((SELECT COUNT(*)::integer FROM public.reviews
      WHERE user_id = v_user_id AND type = 'WEEKLY' AND date >= v_week_start AND date < v_week_end), 1)
    INTO v_progress;
  ELSE
    v_progress := LEAST(public.get_user_week_streak(), 7);
  END IF;

  IF v_progress < v_target THEN
    RAISE EXCEPTION '周任务进度不足：当前 %/%', v_progress, v_target;
  END IF;

  INSERT INTO public.weekly_task_claims (user_id, task_key, week_start, amount)
  VALUES (v_user_id, p_task_key, v_week_start, v_amount)
  ON CONFLICT (user_id, task_key, week_start) DO NOTHING;

  IF NOT FOUND THEN RAISE EXCEPTION '已领取'; END IF;

  PERFORM public.grant_token_reward(v_source, v_amount, false);
  RETURN v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_weekly_task(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_weekly_task(text) TO authenticated;
