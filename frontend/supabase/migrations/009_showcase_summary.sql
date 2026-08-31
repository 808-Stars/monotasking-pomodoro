-- 藏品室实时统计汇总：将多个原始表查询收敛为一次按用户聚合。

CREATE OR REPLACE FUNCTION public.get_showcase_current()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH context AS (
  SELECT
    auth.uid() AS user_id,
    (timezone('Asia/Shanghai', now()) - interval '4 hours')::date AS logical_today
),
period AS (
  SELECT
    user_id,
    logical_today,
    to_char(logical_today, 'YYYY-MM') AS year_month,
    ((date_trunc('month', logical_today)::date::timestamp + interval '4 hours') AT TIME ZONE 'Asia/Shanghai') AS month_start
  FROM context
),
bounty AS (
  SELECT p.user_id, COALESCE(SUM(tr.amount) FILTER (WHERE tr.claimed = true AND tr.amount > 0), 0)::integer AS value
  FROM period p
  LEFT JOIN public.token_records tr
    ON tr.user_id = p.user_id AND tr.created_at >= p.month_start
  GROUP BY p.user_id
),
pomodoro AS (
  SELECT p.user_id, COUNT(ps.id)::integer AS value
  FROM period p
  LEFT JOIN public.pomodoro_sessions ps
    ON ps.user_id = p.user_id
   AND ps.type = 'WORK'
   AND ps.status = 'COMPLETED'
   AND ps.start_time >= p.month_start
  GROUP BY p.user_id
),
rarity_stats AS (
  SELECT
    p.user_id,
    r.rarity,
    r.idx,
    COUNT(DISTINCT gi.id)::integer AS total,
    COUNT(DISTINCT gr.item_id)::integer AS collected
  FROM period p
  CROSS JOIN (VALUES ('N', 0), ('R', 1), ('SR', 2), ('SSR', 3)) AS r(rarity, idx)
  LEFT JOIN public.gacha_items gi ON gi.rarity = r.rarity
  LEFT JOIN public.gacha_records gr
    ON gr.user_id = p.user_id
   AND gr.item_id = gi.id
   AND gr.created_at >= p.month_start
  GROUP BY p.user_id, r.rarity, r.idx
),
trophy AS (
  SELECT
    user_id,
    COALESCE(MAX(idx + 1) FILTER (
      WHERE NOT EXISTS (
        SELECT 1
        FROM rarity_stats missing
        WHERE missing.user_id = rarity_stats.user_id
          AND missing.idx <= rarity_stats.idx
          AND missing.collected < missing.total
      )
    ), 0)::integer AS level
  FROM rarity_stats
  GROUP BY user_id
),
result AS (
  SELECT
    p.year_month,
    p.user_id,
    COALESCE(b.value, 0) AS bounty_value,
    COALESCE(po.value, 0) AS pomodoro_value,
    COALESCE(t.level, 0) AS trophy_level
  FROM period p
  LEFT JOIN bounty b ON b.user_id = p.user_id
  LEFT JOIN pomodoro po ON po.user_id = p.user_id
  LEFT JOIN trophy t ON t.user_id = p.user_id
)
SELECT CASE
  WHEN user_id IS NULL THEN NULL
  ELSE jsonb_build_object(
    'year_month', year_month,
    'bounty_level', CASE
      WHEN bounty_value >= 32800 THEN 4
      WHEN bounty_value >= 19800 THEN 3
      WHEN bounty_value >= 9800 THEN 2
      WHEN bounty_value >= 3000 THEN 1
      ELSE 0
    END,
    'pomodoro_level', CASE
      WHEN pomodoro_value >= 240 THEN 4
      WHEN pomodoro_value >= 120 THEN 3
      WHEN pomodoro_value >= 60 THEN 2
      WHEN pomodoro_value >= 30 THEN 1
      ELSE 0
    END,
    'trophy_level', LEAST(trophy_level, 4),
    'bounty_value', bounty_value,
    'pomodoro_value', pomodoro_value,
    'trophy_value', trophy_level,
    'thresholds', jsonb_build_object(
      'bounty', jsonb_build_array(0, 3000, 9800, 19800, 32800),
      'pomodoro', jsonb_build_array(0, 30, 60, 120, 240)
    )
  )
END
FROM result;
$$;

REVOKE ALL ON FUNCTION public.get_showcase_current() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_showcase_current() TO authenticated;
