// ============================================================
// TypeScript type definitions
// ============================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
  project: string | null;
  project_name?: string;
  project_color?: string;
  status_display?: string;
  priority_display?: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  today_pomodoros?: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSession {
  id: string;
  task: string;
  task_name?: string;
  tasks?: { name?: string } | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  type: 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';
  type_display?: string;
  status: 'COMPLETED' | 'INTERRUPTED' | 'CANCELLED';
  status_display?: string;
  interruption_reason: string;
  notes: string;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  core_task: string | null;
  core_task_name?: string;
  core_task_status?: string;
  tasks?: { name?: string; status?: string } | null;
  status: 'UNPLANNED' | 'PLANNED' | 'COMPLETED' | 'FAILED' | 'REVIEWED';
  status_display?: string;
  morning_reflection: string;
  evening_review: string;
  notes: string;
  work_pomodoros_today?: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  type_display?: string;
  date: string;
  content: string;
  completed_tasks_count: number;
  total_pomodoros: number;
  created_at: string;
}

export interface QuickMemo {
  id: string;
  content: string;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  today_plan: {
    id: number | null;
    status: string;
    status_display: string;
    core_task: {
      id: string;
      name: string;
      status: string;
      status_display: string;
    } | null;
  };
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    completed: number;
    today_completed: number;
    week_completed: number;
    month_completed: number;
  };
  pomodoros: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  projects: {
    active: number;
  };
  today_sessions: {
    id: string;
    task__name: string;
    type: string;
    status: string;
    duration_minutes: number;
    start_time: string;
    end_time: string | null;
  }[];
}

export interface PomodoroStats {
  today: number;
  this_week: number;
  this_month: number;
  total: number;
}

// Data dictionary display maps
export const TASK_STATUS_MAP: Record<string, string> = {
  TODO: '待办', IN_PROGRESS: '进行中', DONE: '已完成', ARCHIVED: '已归档',
};
export const PRIORITY_MAP: Record<string, string> = {
  HIGH: '高', MEDIUM: '中', LOW: '低',
};
export const PROJECT_STATUS_MAP: Record<string, string> = {
  ACTIVE: '待办', ARCHIVED: '归档', COMPLETED: '完成',
};
export const POMODORO_TYPE_MAP: Record<string, string> = {
  WORK: '工作', SHORT_BREAK: '短休息', LONG_BREAK: '长休息',
};
export const POMODORO_STATUS_MAP: Record<string, string> = {
  COMPLETED: '已完成', INTERRUPTED: '中断', CANCELLED: '取消',
};
export const DAILY_PLAN_STATUS_MAP: Record<string, string> = {
  UNPLANNED: '未计划', PLANNED: '已计划', COMPLETED: '已完成', FAILED: '未完成', REVIEWED: '已回顾',
};

export const STATUS_COLOR_MAP: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700', ARCHIVED: 'bg-gray-200 text-gray-500',
  HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700', ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700', INTERRUPTED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-gray-100 text-gray-500', UNPLANNED: 'bg-gray-100 text-gray-500', PLANNED: 'bg-purple-100 text-purple-700', FAILED: 'bg-red-100 text-red-700',
  REVIEWED: 'bg-green-100 text-green-700', WORK: 'bg-red-100 text-red-700',
  SHORT_BREAK: 'bg-green-100 text-green-700', LONG_BREAK: 'bg-blue-100 text-blue-700',
};

// ============================================================
// Gacha types
// ============================================================
export interface GachaItem {
  id: string;
  name: string;
  description: string;
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  rarity_display?: string;
  job: 'CLERIC' | 'SCHOLAR' | 'MERCHANT' | 'WARRIOR' | 'DANCER' | 'APOTHECARY' | 'THIEF' | 'HUNTER';
  job_display?: string;
  emoji: string;
  image?: string;
  weight: number;
  owned_count?: number;
  created_at: string;
}

export interface TokenRecord {
  id: string;
  amount: number;
  source: string;
  created_at: string;
}

export interface GachaRecord {
  id: string;
  item: string;
  item_name?: string;
  item_emoji?: string;
  item_image?: string;
  item_rarity?: string;
  item_job?: string;
  item_job_display?: string;
  rarity_display?: string;
  created_at: string;
}

export interface TokenBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface SSRTarget {
  id: string;
  target_item: string;
  target_item_name: string;
  target_item_emoji: string;
  target_item_image?: string;
  target_item_rarity: string;
  target_item_job: string;
  target_item_job_display: string;
  created_at: string;
}

export interface SSRTargetStatus {
  target: SSRTarget | null;
  total_pulls: number;
  eligible: boolean;
  monthly_used: boolean;
}

export interface PullResult {
  results: GachaRecord[];
  balance: number;
  cost: number;
  pity_ssr?: number;
  ssr_target_consumed?: boolean;
  ssr_target_item?: SSRTarget;
  free_pull?: boolean;
}

export const RARITY_MAP: Record<string, string> = {
  N: '普通', R: '稀有', SR: '史诗', SSR: '传说',
};

export const RARITY_COLOR_MAP: Record<string, string> = {
  N: '#888888', R: '#4a90d9', SR: '#9b59b6', SSR: '#e8a840',
};
