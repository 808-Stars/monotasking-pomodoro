-- 原子化扭蛋抽取：扣费 + 抽卡在同一事务中完成
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

CREATE OR REPLACE FUNCTION gacha_pull(p_user_id uuid, p_count int, p_today text DEFAULT to_char(now(), 'YYYY-MM-DD'), p_ym text DEFAULT to_char(now(), 'YYYY-MM'))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today text := p_today;
  v_ym text := p_ym;
  v_free boolean := false;
  v_balance int;
  v_cost int;
  v_dry int;
  v_last_ssr_idx int;
  v_ssr_target record;
  v_target_item record;
  v_rate float;
  v_chosen record;
  v_record record;
  v_results jsonb := '[]'::jsonb;
  v_target_consumed boolean := false;
  v_target_item_data jsonb := null;
  v_items record;
  v_r_plus_found boolean := false;
  v_last_record_id uuid;
  v_total_weight float;
  v_rnd float;
  v_cumulative float;
  v_non_ssr_pool_ids uuid[];
  v_ssr_pool_ids uuid[];
  v_r_plus_pool_ids uuid[];
  v_non_ssr_weights float[];
  v_ssr_weights float[];
  v_r_plus_weights float[];
BEGIN
  -- ── 1. 检查免费单抽 ──
  IF p_count = 1 THEN
    SELECT EXISTS(
      SELECT 1 FROM token_records
      WHERE user_id = p_user_id AND source = '每日首免' AND created_at >= v_today::timestamptz
    ) INTO v_free;
    -- 不存在记录 → 免费
    v_free := NOT v_free;
  END IF;

  -- ── 2. 计算余额 ──
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM token_records
  WHERE user_id = p_user_id AND claimed = true
    AND created_at >= (v_ym || '-01T04:00:00+08:00')::timestamptz;

  v_cost := CASE WHEN v_free THEN 0 WHEN p_count = 1 THEN 50 ELSE 500 END;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION '代币不足！需要 % 币，当前余额 % 币', v_cost, v_balance;
  END IF;

  -- ── 3. 扣费 ──
  IF v_cost > 0 THEN
    INSERT INTO token_records (user_id, amount, source, claimed)
    VALUES (p_user_id, -v_cost, '扭蛋消耗', true);
  ELSIF v_free THEN
    INSERT INTO token_records (user_id, amount, source, claimed)
    VALUES (p_user_id, 0, '每日首免', true);
  END IF;

  -- ── 4. 保底计数 ──
  SELECT COUNT(*) INTO v_dry
  FROM gacha_records gr
  JOIN gacha_items gi ON gi.id = gr.item_id
  WHERE gr.user_id = p_user_id AND gr.created_at >= (v_ym || '-01')::timestamptz;

  -- 从后往前找最后一个 SSR 的位置
  SELECT idx INTO v_last_ssr_idx
  FROM (
    SELECT row_number() OVER (ORDER BY gr.created_at) - 1 AS idx, gi.rarity
    FROM gacha_records gr
    JOIN gacha_items gi ON gi.id = gr.item_id
    WHERE gr.user_id = p_user_id AND gr.created_at >= (v_ym || '-01')::timestamptz
    ORDER BY gr.created_at
  ) sub
  WHERE rarity = 'SSR'
  ORDER BY idx DESC LIMIT 1;

  IF v_last_ssr_idx IS NOT NULL THEN
    v_dry := v_dry - 1 - v_last_ssr_idx;
  END IF;

  -- ── 5. 构建物品池 ──
  -- 非 SSR 池
  SELECT array_agg(id), array_agg(weight::float)
  INTO v_non_ssr_pool_ids, v_non_ssr_weights
  FROM (SELECT id, weight FROM gacha_items WHERE rarity != 'SSR' ORDER BY id) t;

  -- SSR 池
  SELECT array_agg(id), array_agg(weight::float)
  INTO v_ssr_pool_ids, v_ssr_weights
  FROM (SELECT id, weight FROM gacha_items WHERE rarity = 'SSR' ORDER BY id) t;

  -- R+ 池（十连保底用）
  SELECT array_agg(id), array_agg(weight::float)
  INTO v_r_plus_pool_ids, v_r_plus_weights
  FROM (SELECT id, weight FROM gacha_items WHERE rarity IN ('R', 'SR', 'SSR') ORDER BY id) t;

  -- ── 6. 读取 SSR 锁定目标 ──
  SELECT gst.*, gi.name AS item_name, gi.emoji AS item_emoji, gi.rarity AS item_rarity, gi.job AS item_job
  INTO v_ssr_target
  FROM gacha_ssr_targets gst
  JOIN gacha_items gi ON gi.id = gst.target_item_id
  WHERE gst.user_id = p_user_id AND gst.consumed = false AND gst.year_month = v_ym
  LIMIT 1;

  -- ── 7. 循环抽取 ──
  FOR i IN 1..p_count LOOP
    v_dry := v_dry + 1;

    -- SSR 概率
    IF v_dry < 50 THEN
      v_rate := 0.02;
    ELSE
      v_rate := LEAST(2 + (v_dry - 49) * 2, 100) / 100.0;
    END IF;

    IF random() < v_rate THEN
      -- 出 SSR
      IF v_ssr_target IS NOT NULL AND NOT v_target_consumed THEN
        -- 锁定目标
        SELECT gi.* INTO v_chosen
        FROM gacha_items gi WHERE gi.id = v_ssr_target.target_item_id;
        v_target_consumed := true;
        v_target_item_data := jsonb_build_object(
          'id', v_ssr_target.id,
          'target_item', v_ssr_target.target_item_id,
          'target_item_name', v_ssr_target.item_name,
          'target_item_emoji', v_ssr_target.item_emoji,
          'target_item_rarity', v_ssr_target.item_rarity,
          'target_item_job', v_ssr_target.item_job
        );
        UPDATE gacha_ssr_targets SET consumed = true WHERE id = v_ssr_target.id;
      ELSE
        -- 加权随机 SSR
        v_total_weight := 0;
        FOR j IN 1..array_length(v_ssr_weights, 1) LOOP
          v_total_weight := v_total_weight + v_ssr_weights[j];
        END LOOP;
        v_rnd := random() * v_total_weight;
        v_cumulative := 0;
        FOR j IN 1..array_length(v_ssr_pool_ids, 1) LOOP
          v_cumulative := v_cumulative + v_ssr_weights[j];
          IF v_rnd <= v_cumulative THEN
            SELECT * INTO v_chosen FROM gacha_items WHERE id = v_ssr_pool_ids[j];
            EXIT;
          END IF;
        END LOOP;
      END IF;
      v_dry := 0;
    ELSE
      -- 非 SSR：加权随机
      v_total_weight := 0;
      FOR j IN 1..array_length(v_non_ssr_weights, 1) LOOP
        v_total_weight := v_total_weight + v_non_ssr_weights[j];
      END LOOP;
      v_rnd := random() * v_total_weight;
      v_cumulative := 0;
      FOR j IN 1..array_length(v_non_ssr_pool_ids, 1) LOOP
        v_cumulative := v_cumulative + v_non_ssr_weights[j];
        IF v_rnd <= v_cumulative THEN
          SELECT * INTO v_chosen FROM gacha_items WHERE id = v_non_ssr_pool_ids[j];
          EXIT;
        END IF;
      END LOOP;
    END IF;

    -- 写入记录
    INSERT INTO gacha_records (user_id, item_id)
    VALUES (p_user_id, v_chosen.id)
    RETURNING * INTO v_record;

    v_results := v_results || jsonb_build_object(
      'id', v_record.id,
      'user_id', v_record.user_id,
      'item_id', v_record.item_id,
      'created_at', v_record.created_at,
      'item_name', v_chosen.name,
      'item_emoji', v_chosen.emoji,
      'item_rarity', v_chosen.rarity,
      'item_job', v_chosen.job,
      'rarity_display', CASE v_chosen.rarity
        WHEN 'SSR' THEN '传说'
        WHEN 'SR' THEN '史诗'
        WHEN 'R' THEN '稀有'
        WHEN 'N' THEN '普通'
      END
    );
  END LOOP;

  -- ── 8. 十连保底 R+ ──
  IF p_count = 10 THEN
    v_r_plus_found := false;
    FOR j IN 0..(jsonb_array_length(v_results) - 1) LOOP
      IF (v_results->j->>'item_rarity') IN ('R', 'SR', 'SSR') THEN
        v_r_plus_found := true;
        EXIT;
      END IF;
    END LOOP;

    IF NOT v_r_plus_found THEN
      -- 加权随机 R+
      v_total_weight := 0;
      FOR j IN 1..array_length(v_r_plus_weights, 1) LOOP
        v_total_weight := v_total_weight + v_r_plus_weights[j];
      END LOOP;
      v_rnd := random() * v_total_weight;
      v_cumulative := 0;
      FOR j IN 1..array_length(v_r_plus_pool_ids, 1) LOOP
        v_cumulative := v_cumulative + v_r_plus_weights[j];
        IF v_rnd <= v_cumulative THEN
          SELECT * INTO v_chosen FROM gacha_items WHERE id = v_r_plus_pool_ids[j];
          EXIT;
        END IF;
      END LOOP;

      -- 替换最后一个记录
      v_last_record_id := (v_results->(jsonb_array_length(v_results) - 1)->>'id')::uuid;
      UPDATE gacha_records SET item_id = v_chosen.id WHERE id = v_last_record_id;

      v_results := jsonb_set(
        v_results,
        ARRAY[(jsonb_array_length(v_results) - 1)::text],
        jsonb_build_object(
          'id', v_last_record_id,
          'user_id', p_user_id,
          'item_id', v_chosen.id,
          'item_name', v_chosen.name,
          'item_emoji', v_chosen.emoji,
          'item_rarity', v_chosen.rarity,
          'item_job', v_chosen.job,
          'rarity_display', CASE v_chosen.rarity
            WHEN 'SSR' THEN '传说'
            WHEN 'SR' THEN '史诗'
            WHEN 'R' THEN '稀有'
            WHEN 'N' THEN '普通'
          END
        )
      );

      IF v_chosen.rarity = 'SSR' THEN
        v_dry := 0;
      END IF;
    END IF;
  END IF;

  -- ── 9. 获取新余额并返回 ──
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM token_records
  WHERE user_id = p_user_id AND claimed = true
    AND created_at >= (v_ym || '-01T04:00:00+08:00')::timestamptz;

  RETURN jsonb_build_object(
    'results', v_results,
    'balance', v_balance,
    'cost', v_cost,
    'pity_ssr', v_dry,
    'free_pull', v_free,
    'ssr_target_consumed', v_target_consumed,
    'ssr_target_item', v_target_item_data
  );
END;
$$;

-- 允许 authenticated 用户调用
GRANT EXECUTE ON FUNCTION gacha_pull(uuid, int, text, text) TO authenticated;
