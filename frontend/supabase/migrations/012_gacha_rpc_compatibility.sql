-- 扭蛋 RPC 兼容补丁
--
-- 目的：兼容以下两类客户端调用：
--   1. 新客户端：gacha_pull(p_count)
--   2. 旧客户端：gacha_pull(p_count, p_today, p_user_id, p_ym)
--
-- 旧参数中的 user_id、日期和月份全部忽略，统一以 auth.uid() 和服务端当前
-- 上海逻辑日计算，避免旧入口被用来替他人抽取或伪造结算月份。

DO $$
BEGIN
  IF to_regprocedure('public.gacha_pull_internal(uuid,integer,text,text)') IS NULL THEN
    IF to_regprocedure('public.gacha_pull(uuid,integer,text,text)') IS NOT NULL THEN
      ALTER FUNCTION public.gacha_pull(uuid, integer, text, text) RENAME TO gacha_pull_internal;
    ELSE
      RAISE EXCEPTION '缺少 gacha_pull 核心函数，请先执行 001_atomic_gacha_pull.sql';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.gacha_pull_internal(uuid, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gacha_pull_internal(uuid, integer, text, text) FROM authenticated;
ALTER FUNCTION public.gacha_pull_internal(uuid, integer, text, text) SET search_path = public;

-- 新安全入口：只接受抽取次数，用户身份由 auth.uid() 决定。
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

-- 旧入口兼容层：保留参数名和顺序，防止旧客户端因 schema cache 报错。
CREATE OR REPLACE FUNCTION public.gacha_pull(
  p_count integer,
  p_today text,
  p_user_id uuid,
  p_ym text
)
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
REVOKE ALL ON FUNCTION public.gacha_pull(integer, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gacha_pull(integer, text, uuid, text) TO authenticated;
