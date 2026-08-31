-- 扭蛋机首屏汇总：一次返回物品池、余额、今日状态和 SSR 目标状态。
-- 历史记录、任务和代币流水由前端在首屏显示后后台加载。

CREATE OR REPLACE FUNCTION public.get_gacha_summary()
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
  v_month_start timestamptz;
  v_month text;
  v_items jsonb;
  v_balance jsonb;
  v_today_counts jsonb;
  v_ssr_target jsonb;
  v_total_pulls integer;
  v_free_pull_used boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'balance', jsonb_build_object('balance', 0, 'total_earned', 0, 'total_spent', 0),
      'today_counts', '{}'::jsonb,
      'ssr_target', jsonb_build_object('target', NULL, 'total_pulls', 0, 'eligible', false, 'monthly_used', false)
    );
  END IF;

  v_today := (timezone('Asia/Shanghai', now()) - interval '4 hours')::date;
  v_day_start := ((v_today::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');
  v_month := to_char(v_today, 'YYYY-MM');
  v_month_start := (((date_trunc('month', v_today)::date::timestamp) + interval '4 hours') AT TIME ZONE 'Asia/Shanghai');

  SELECT COALESCE(jsonb_agg(item_row ORDER BY weight_sort DESC, job_sort), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT jsonb_build_object(
      'id', gi.id,
      'name', gi.name,
      'description', gi.description,
      'rarity', gi.rarity,
      'job', gi.job,
      'emoji', gi.emoji,
      'weight', gi.weight,
      'created_at', gi.created_at,
      'owned_count', (
        SELECT COUNT(*)
        FROM public.gacha_records AS gr
        WHERE gr.user_id = v_user_id
          AND gr.item_id = gi.id
          AND gr.created_at >= v_month_start
      )
    ) AS item_row,
    gi.weight AS weight_sort,
    CASE gi.job
      WHEN 'CLERIC' THEN 1
      WHEN 'SCHOLAR' THEN 2
      WHEN 'MERCHANT' THEN 3
      WHEN 'WARRIOR' THEN 4
      WHEN 'DANCER' THEN 5
      WHEN 'APOTHECARY' THEN 6
      WHEN 'THIEF' THEN 7
      WHEN 'HUNTER' THEN 8
      ELSE 99
    END AS job_sort
    FROM public.gacha_items AS gi
  ) AS items;

  SELECT jsonb_build_object(
    'balance', COALESCE(SUM(tr.amount) FILTER (WHERE tr.claimed = true), 0),
    'total_earned', COALESCE(SUM(tr.amount) FILTER (WHERE tr.claimed = true AND tr.amount > 0), 0),
    'total_spent', COALESCE(SUM(ABS(tr.amount)) FILTER (WHERE tr.claimed = true AND tr.amount < 0), 0)
  )
  INTO v_balance
  FROM public.token_records AS tr
  WHERE tr.user_id = v_user_id
    AND tr.created_at >= v_month_start;

  SELECT COALESCE(jsonb_object_agg(source_counts.source, source_counts.total), '{}'::jsonb)
  INTO v_today_counts
  FROM (
    SELECT tr.source, COUNT(*) AS total
    FROM public.token_records AS tr
    WHERE tr.user_id = v_user_id
      AND tr.created_at >= v_day_start
      AND tr.amount > 0
    GROUP BY tr.source
  ) AS source_counts;

  SELECT EXISTS(
    SELECT 1
    FROM public.token_records AS tr
    WHERE tr.user_id = v_user_id
      AND tr.source = '每日首免'
      AND tr.created_at >= v_day_start
  ) INTO v_free_pull_used;

  IF v_free_pull_used THEN
    v_today_counts := v_today_counts || jsonb_build_object('_free_pull_used', true);
  END IF;

  SELECT COUNT(*) INTO v_total_pulls
  FROM public.gacha_records AS gr
  WHERE gr.user_id = v_user_id
    AND gr.created_at >= v_month_start;

  SELECT CASE
    WHEN gst.year_month = v_month AND gst.consumed = false THEN jsonb_build_object(
      'id', gst.id,
      'target_item', gst.target_item_id,
      'target_item_name', gi.name,
      'target_item_emoji', gi.emoji,
      'target_item_rarity', gi.rarity,
      'target_item_job', gi.job
    )
    ELSE NULL
  END,
  CASE WHEN gst.year_month = v_month AND gst.consumed = true THEN true ELSE false END
  INTO v_ssr_target, v_free_pull_used
  FROM public.gacha_ssr_targets AS gst
  LEFT JOIN public.gacha_items AS gi ON gi.id = gst.target_item_id
  WHERE gst.user_id = v_user_id;

  RETURN jsonb_build_object(
    'items', v_items,
    'balance', v_balance,
    'today_counts', v_today_counts,
    'ssr_target', jsonb_build_object(
      'target', v_ssr_target,
      'total_pulls', v_total_pulls,
      'eligible', v_total_pulls >= 300,
      'monthly_used', COALESCE(v_free_pull_used, false)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_gacha_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gacha_summary() TO authenticated;
