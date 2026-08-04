-- ============================================================
-- 单核 × 番茄 工作法 — Supabase 数据库建表脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 项目
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#1890ff',
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);

-- ============================================================
-- 2. 任务
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  status TEXT DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  estimated_pomodoros INT DEFAULT 1,
  completed_pomodoros INT DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);

-- ============================================================
-- 3. 番茄钟记录
-- ============================================================
CREATE TABLE pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INT DEFAULT 25,
  type TEXT DEFAULT 'WORK' CHECK (type IN ('WORK', 'SHORT_BREAK', 'LONG_BREAK')),
  status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'INTERRUPTED', 'CANCELLED')),
  interruption_reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pomodoro_user ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_task ON pomodoro_sessions(task_id);

-- ============================================================
-- 4. 每日计划
-- ============================================================
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  core_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'UNPLANNED' CHECK (status IN ('UNPLANNED', 'PLANNED', 'COMPLETED', 'FAILED', 'REVIEWED')),
  morning_reflection TEXT DEFAULT '',
  evening_review TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_plans_user ON daily_plans(user_id);

-- ============================================================
-- 5. 回顾记录
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'DAILY' CHECK (type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  date DATE NOT NULL,
  content TEXT DEFAULT '',
  completed_tasks_count INT DEFAULT 0,
  total_pomodoros INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ============================================================
-- 6. 随手清单
-- ============================================================
CREATE TABLE quick_memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quick_memos_user ON quick_memos(user_id);

-- ============================================================
-- 7. 扭蛋物品（共享池，无 user_id）
-- ============================================================
CREATE TABLE gacha_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  rarity TEXT DEFAULT 'N' CHECK (rarity IN ('N', 'R', 'SR', 'SSR')),
  job TEXT DEFAULT 'CLERIC' CHECK (job IN ('CLERIC', 'SCHOLAR', 'MERCHANT', 'WARRIOR', 'DANCER', 'APOTHECARY', 'THIEF', 'HUNTER')),
  emoji TEXT DEFAULT '',
  weight INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. 代币流水
-- ============================================================
CREATE TABLE token_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  source TEXT NOT NULL,
  claimed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ
);

CREATE INDEX idx_token_records_user ON token_records(user_id);

-- ============================================================
-- 9. 扭蛋抽取记录
-- ============================================================
CREATE TABLE gacha_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES gacha_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gacha_records_user ON gacha_records(user_id);

-- ============================================================
-- 10. 周任务领取记录
-- ============================================================
CREATE TABLE weekly_task_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  week_start DATE NOT NULL,
  amount INT DEFAULT 0,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_key, week_start)
);

CREATE INDEX idx_weekly_claims_user ON weekly_task_claims(user_id);

-- ============================================================
-- 11. 藏品室月度快照
-- ============================================================
CREATE TABLE showcase_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- "2026-08"
  bounty_level INT DEFAULT 0,
  pomodoro_level INT DEFAULT 0,
  trophy_level INT DEFAULT 0,
  bounty_value INT DEFAULT 0,
  pomodoro_value INT DEFAULT 0,
  trophy_value INT DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year_month)
);

CREATE INDEX idx_showcase_user ON showcase_snapshots(user_id);

-- ============================================================
-- 12. SSR 锁定目标
-- ============================================================
CREATE TABLE gacha_ssr_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES gacha_items(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  consumed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS 策略（行级安全）
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_task_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_ssr_targets ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own pomodoro_sessions" ON pomodoro_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily_plans" ON daily_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reviews" ON reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quick_memos" ON quick_memos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read gacha_items" ON gacha_items FOR SELECT USING (true);
CREATE POLICY "Users can manage own token_records" ON token_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own gacha_records" ON gacha_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own weekly_task_claims" ON weekly_task_claims FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own showcase_snapshots" ON showcase_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own gacha_ssr_targets" ON gacha_ssr_targets FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 自动更新 updated_at 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON daily_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON quick_memos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
