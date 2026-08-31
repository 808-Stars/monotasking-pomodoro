-- 撤消“日报／周报／月报自适应工作法”的数据库部分。
-- 仅删除计时事件遥测表；报告本身没有其他专用业务表或函数。
-- 注意：执行后 focus_timer_events 中已有的事件数据不可恢复。

BEGIN;

DROP TABLE IF EXISTS public.focus_timer_events;

COMMIT;

-- 预期结果：NULL
SELECT to_regclass('public.focus_timer_events') AS remaining_table;
