import { supabase } from './supabase'
import { RARITY_MAP } from '../types'
import { localDate, localMonth } from '../utils/date'
import { RequestCache } from './cache'
import { assertValidGachaCount } from './gachaRules'
import { getLogicalDayKey, getLogicalDayStartIso, getLogicalMonthStartIso, getMonthBounds, getWeekStartKey } from './queryBounds'

const JOBS_MAP: Record<string, string> = {
  CLERIC: '牧师', SCHOLAR: '学者', MERCHANT: '商人', WARRIOR: '战士',
  DANCER: '舞者', APOTHECARY: '药师', THIEF: '盗贼', HUNTER: '猎人',
}

const JOB_ORDER: Record<string, number> = {
  CLERIC: 1, SCHOLAR: 2, MERCHANT: 3, WARRIOR: 4,
  DANCER: 5, APOTHECARY: 6, THIEF: 7, HUNTER: 8,
}

// ============================================================
// 简易内存缓存 — 避免每次切换页面都重新请求
// TTL 默认 30 秒，切换页面时优先返回缓存数据
// ============================================================
const CACHE_TTL = 30_000 // 30秒
const requestCache = new RequestCache()

async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const scope = getUserIdFromStorage() ?? 'anonymous'
  return requestCache.get(key, fetcher, ttl, scope)
}

// 用户缓存
let _cachedUser: any = null
let _cachedUserTs = 0
const USER_CACHE_TTL = 5 * 60 * 1000

/** 从 localStorage 直接读取用户 ID，零网络请求 */
function getUserIdFromStorage(): string | null {
  try {
    // Supabase v2 存储 key 格式: sb-<ref>-auth-token
    const keys = Object.keys(localStorage).filter(k => k.endsWith('-auth-token'))
    for (const key of keys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const data = JSON.parse(raw)
      const token = data?.access_token || data?.currentSession?.access_token
      if (!token) continue
      // 解码 JWT payload (第二段)
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.sub) return payload.sub
    }
  } catch { /* */ }
  return null
}

/** 获取当前用户（优先从缓存/本地读取，无网络请求） */
async function currentUser() {
  if (_cachedUser && Date.now() - _cachedUserTs < USER_CACHE_TTL) return _cachedUser
  // 先尝试从 JWT 直接读取（瞬间完成）
  const userId = getUserIdFromStorage()
  if (userId) {
    _cachedUser = { id: userId }
    _cachedUserTs = Date.now()
    return _cachedUser
  }
  // fallback: 兜底用 getSession（可能触发网络请求）
  const { data: { session } } = await supabase.auth.getSession()
  _cachedUser = session?.user ?? null
  _cachedUserTs = Date.now()
  return _cachedUser
}

/** 登出时清除用户缓存 */
export function clearAuthCache() {
  _cachedUser = null
  _cachedUserTs = 0
  requestCache.clear()
}

/** 写操作后清除相关缓存（支持前缀匹配） */
function invalidate(...keys: string[]) {
  const expanded = new Set(keys)
  if (expanded.has('dashboard-stats')) {
    expanded.add('dashboard-core')
    expanded.add('dashboard-secondary')
  }
  if (expanded.has('token-balance') || expanded.has('gacha-summary')) expanded.add('token-records')
  if ([...expanded].some(key => ['tasks', 'pomo', 'daily-plan', 'today-plan', 'reviews', 'token'].some(prefix => key.startsWith(prefix)))) {
  }
  requestCache.invalidate(...expanded)
}

function flattenRecord(r: any) {
  const item = r.gacha_items
  return {
    ...r,
    item: r.item_id,  // 兼容前端类型（GachaRecord.item）
    item_name: item?.name,
    item_emoji: item?.emoji,
    item_rarity: item?.rarity,
    item_job: item?.job,
    item_job_display: item?.job ? JOBS_MAP[item.job] : undefined,
    rarity_display: item?.rarity ? RARITY_MAP[item.rarity] : undefined,
  }
}

// ============================================================
// Projects
// ============================================================
export async function fetchProjects() {
  return cached('projects', async () => {
    const user = await currentUser()
    if (!user) return []
    // 通过 PostgREST 关系计数（tasks.project_id 是 projects.id 的外键），
    // 一次性拿到每个项目的任务数，避免 N+1 查询
    const { data } = await supabase
      .from('projects')
      .select('*, tasks(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    return (data ?? []).map((p: any) => {
      // 只保留 projects 表的真实列 + 计算出的 task_count，
      // 丢弃 PostgREST 关系字段 tasks，避免被误传到 update/create
      const { tasks, ...rest } = p
      const task_count = Array.isArray(tasks) && tasks.length > 0 ? (tasks[0] as any).count : 0
      return { ...rest, task_count }
    })
  })
}

export async function createProject(project: { name: string; description?: string; color?: string; status?: string }) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  invalidate('projects', 'dashboard-stats')
  return data
}

// projects 表允许外部更新的列（防御性白名单，避免 form 里携带的
// PostgREST 关系字段或计算字段被误传到 UPDATE 语句导致失败）
const PROJECT_UPDATABLE_COLUMNS = ['name', 'description', 'color', 'status']

export async function updateProject(id: string, updates: Record<string, any>) {
  const safe: Record<string, any> = {}
  for (const key of PROJECT_UPDATABLE_COLUMNS) {
    if (key in updates) safe[key] = updates[key]
  }
  const { data, error } = await supabase
    .from('projects')
    .update(safe)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidate('projects', 'dashboard-stats')
  return data
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  invalidate('projects', 'dashboard-stats')
}

// ============================================================
// Tasks
// ============================================================
export async function fetchTasks(filters?: { status?: string; priority?: string; project_id?: string; search?: string }) {
  return cached(`tasks:${JSON.stringify(filters || {})}`, async () => {
    const user = await currentUser()
    if (!user) return []
    let query = supabase
      .from('tasks')
      .select('*, projects(name, color)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.project_id) query = query.eq('project_id', filters.project_id)
    if (filters?.search) query = query.ilike('name', `%${filters.search}%`)
    query = query.limit(100)
    const { data } = await query
    return data ?? []
  })
}

export async function createTask(task: { name: string; description?: string; priority?: string; status?: string; project_id?: string | null; estimated_pomodoros?: number; due_date?: string | null }) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  invalidate('tasks:', 'today-core', 'dashboard-stats')
  return data
}

export async function updateTask(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidate('tasks:', 'today-core', 'dashboard-stats')
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
  invalidate('tasks:', 'today-core', 'dashboard-stats')
}

export async function getTodayCoreTasks() {
  return cached('today-core', async () => {
    const user = await currentUser()
    if (!user) return []
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(name, color)')
      .eq('user_id', user.id)
      .in('status', ['TODO', 'IN_PROGRESS'])
      .limit(10)
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return (data ?? []).sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 3
      const pb = priorityOrder[b.priority] ?? 3
      if (pa !== pb) return pa - pb
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
  })
}

// ============================================================
// Pomodoro Sessions
// ============================================================
export async function fetchPomodoroSessions(filters?: { task_id?: string; type?: string; status?: string }) {
  return cached(`pomo-sessions:${JSON.stringify(filters || {})}`, async () => {
    const user = await currentUser()
    if (!user) return []
    let query = supabase
      .from('pomodoro_sessions')
      .select('*, tasks(name)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
    if (filters?.task_id) query = query.eq('task_id', filters.task_id)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.status) query = query.eq('status', filters.status)
    query = query.limit(100)
    const { data } = await query
    return data ?? []
  })
}

export async function createPomodoroSession(session: {
  task_id?: string | null; start_time: string; end_time?: string;
  duration_minutes?: number; pomodoro_count?: number; type?: string; status?: string; notes?: string
}) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert({ ...session, user_id: user.id })
    .select()
    .single()
  if (error) throw error

  // 自动累加任务的 completed_pomodoros
  if (session.type === 'WORK' && session.status === 'COMPLETED') {
    const { data: completedSessions } = await supabase
      .from('pomodoro_sessions')
      .select('pomodoro_count, duration_minutes')
      .eq('task_id', session.task_id)
      .eq('type', 'WORK')
      .eq('status', 'COMPLETED')
    const count = (completedSessions ?? []).reduce((sum, item) => sum + (item.pomodoro_count ?? Math.min(4, Math.floor((item.duration_minutes ?? 0) / 25))), 0)
    await supabase
      .from('tasks')
      .update({ completed_pomodoros: count })
      .eq('id', session.task_id)
  }

  invalidate('pomo-', 'dashboard-stats', 'token-balance', 'showcase-current')
  return data
}

export async function deletePomodoroSession(id: string) {
  const { error } = await supabase.from('pomodoro_sessions').delete().eq('id', id)
  if (error) throw error
  invalidate('pomo-', 'dashboard-stats', 'token-balance', 'showcase-current')
}

export async function getPomodoroStats() {
  return cached('pomo-stats', async () => {
    const user = await currentUser()
    if (!user) return { today: 0, this_week: 0, this_month: 0, total: 0 }
    const { data, error } = await supabase.rpc('get_pomodoro_stats')
    if (error) throw error
    return data ?? { today: 0, this_week: 0, this_month: 0, total: 0 }
  })
}

// ============================================================
// Daily Plans
// ============================================================
export async function fetchTodayPlan() {
  return cached('today-plan', async () => {
    const user = await currentUser()
    if (!user) return null
    const todayStr = localDate()
    let { data } = await supabase
      .from('daily_plans')
      .select('*, tasks(name, status)')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .single()
    if (!data) {
      const { data: created } = await supabase
        .from('daily_plans')
        .insert({ user_id: user.id, date: todayStr, status: 'UNPLANNED' })
        .select('*, tasks(name, status)')
        .single()
      data = created
    }
    return data
  })
}

export async function fetchDailyPlans(month = localMonth()) {
  return cached(`daily-plans:${month}`, async () => {
    const user = await currentUser()
    if (!user) return []
    const { start, end } = getMonthBounds(month)
    const { data } = await supabase
      .from('daily_plans')
      .select('*, tasks(name, status)')
      .eq('user_id', user.id)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .limit(31)
    return data ?? []
  })
}

export async function updateDailyPlan(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('daily_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidate('today-plan', 'daily-plans', 'dashboard-stats')
  return data
}

export async function deleteDailyPlan(id: string) {
  const { error } = await supabase.from('daily_plans').delete().eq('id', id)
  if (error) throw error
  invalidate('today-plan', 'daily-plans', 'dashboard-stats')
}

// ============================================================
// Reviews
// ============================================================
export async function fetchReviews(type?: string, limit = 100) {
  return cached(`reviews:${type || 'all'}:${limit}`, async () => {
    const user = await currentUser()
    if (!user) return []
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
    .order('date', { ascending: false })
    if (type) query = query.eq('type', type)
    query = query.limit(limit)
    const { data } = await query
    return data ?? []
  })
}

export async function createReview(review: { type?: string; date: string; content: string; completed_tasks_count?: number; total_pomodoros?: number }) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...review, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  invalidate('reviews')
  return data
}

export async function updateReview(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidate('reviews')
  return data
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw error
  invalidate('reviews')
}

// ============================================================
// Quick Memos
// ============================================================
export async function fetchQuickMemos() {
  return cached('quick-memos', async () => {
    const user = await currentUser()
    if (!user) return []
    const { data } = await supabase
      .from('quick_memos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    return data ?? []
  })
}

export async function createQuickMemo(content: string) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('quick_memos')
    .insert({ content, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  invalidate('quick-memos')
  return data
}

export async function updateQuickMemo(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('quick_memos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidate('quick-memos')
  return data
}

export async function deleteQuickMemo(id: string) {
  const { error } = await supabase.from('quick_memos').delete().eq('id', id)
  if (error) throw error
  invalidate('quick-memos')
}

// ============================================================
// Token Records
// ============================================================

// ── 关闭代币系统开关（per-user）──
const TOKEN_DISABLED_KEY = 'token_system_disabled'

export function isTokenSystemDisabled(): boolean {
  try { return localStorage.getItem(TOKEN_DISABLED_KEY) === 'true' } catch { return false }
}

export function setTokenSystemDisabled(disabled: boolean) {
  try { localStorage.setItem(TOKEN_DISABLED_KEY, disabled ? 'true' : 'false') } catch {}
  // 通知 Layout 侧栏、Showcase 等组件实时更新
  window.dispatchEvent(new Event('oto:token-system-changed'))
}

// ── 关闭操作指南开关（per-user）──
const GUIDE_DISABLED_KEY = 'guide_disabled'

export function isGuideDisabled(): boolean {
  try { return localStorage.getItem(GUIDE_DISABLED_KEY) === 'true' } catch { return false }
}

export function setGuideDisabled(disabled: boolean) {
  try { localStorage.setItem(GUIDE_DISABLED_KEY, disabled ? 'true' : 'false') } catch {}
  window.dispatchEvent(new Event('oto:settings-changed'))
}

// ── 关闭新手教程开关（per-user）──
const ONBOARDING_DISABLED_KEY = 'onboarding_disabled'

export function isOnboardingDisabled(): boolean {
  try { return localStorage.getItem(ONBOARDING_DISABLED_KEY) === 'true' } catch { return false }
}

export function setOnboardingDisabled(disabled: boolean) {
  try { localStorage.setItem(ONBOARDING_DISABLED_KEY, disabled ? 'true' : 'false') } catch {}
  window.dispatchEvent(new Event('oto:settings-changed'))
}

export async function getTokenBalance() {
  return cached('token-balance', async () => {
    const user = await currentUser()
    if (!user) return { balance: 0, total_earned: 0, total_spent: 0 }
    const monthStart = getLogicalMonthStartIso()
    const { data, error } = await supabase
      .from('token_records')
      .select('amount')
      .eq('user_id', user.id)
      .eq('claimed', true)
      .gte('created_at', monthStart)
    if (error) throw error
    const records = data ?? []
    const earned = records.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
    const spent = records.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)
    return { balance: earned - spent, total_earned: earned, total_spent: spent }
  })
}

export async function addTokenRecord(amount: number, source: string, claimed = true, daily = false) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.rpc('grant_token_reward', {
    p_source: source,
    p_amount: amount,
    p_daily: daily,
  })
  if (error) throw error
  invalidate('token-balance', 'gacha-summary', 'daily-tasks', 'today-counts', 'dashboard-stats', 'showcase-current')
  return data
}

export async function fetchTokenRecords(limit = 20) {
  return cached(`token-records:${limit}`, async () => {
    const user = await currentUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('token_records')
      .select('id, amount, source, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  })
}

export async function getDailyTasks() {
  return cached('daily-tasks', async () => {
    const user = await currentUser()
    if (!user) return { date: '', today_earned: 0, daily_target: 0, tasks: [] }

    const DAILY_TASK_SOURCES: Record<string, number> = {
      '首次番茄钟': 60, '休息': 20, '创建任务': 20, '完成任务': 20,
      '确定核心任务': 20, '晨间规划': 40, '晚间回顾': 40,
      '每日计划完成': 60, '写笔记': 40, '创建清单': 20,
      '完成清单': 20, '抽扭蛋': 40,
    }

    const todayStr = localDate()
    const dayStart = getLogicalDayStartIso()
    const { data, error } = await supabase
      .from('token_records')
      .select('source, amount, claimed')
      .eq('user_id', user.id)
      .gte('created_at', dayStart)
      .gt('amount', 0)
    if (error) throw error

    const records = data ?? []
    const sourceMap: Record<string, { total: number; pending: number }> = {}
    records.forEach(r => {
      if (!sourceMap[r.source]) sourceMap[r.source] = { total: 0, pending: 0 }
      sourceMap[r.source].total++
      if (!r.claimed) sourceMap[r.source].pending++
    })

    const tasks = Object.entries(DAILY_TASK_SOURCES).map(([source, amount]) => {
      const info = sourceMap[source] ?? { total: 0, pending: 0 }
      return {
        source,
        amount,
        completed: info.total > 0,
        claimed: info.total > 0 && info.pending === 0,
        can_claim: info.pending > 0,
      }
    })

    const todayEarned = tasks.filter(t => t.claimed).reduce((s, t) => s + t.amount, 0)
    const dailyTarget = Object.values(DAILY_TASK_SOURCES).reduce((s, v) => s + v, 0)

    return { date: todayStr, today_earned: todayEarned, daily_target: dailyTarget, tasks }
  })
}

export async function getTodayCounts() {
  return cached('today-counts', async () => {
    const user = await currentUser()
    if (!user) return {}
    const todayStr = localDate()
    const dayStart = getLogicalDayStartIso()
    const { data, error } = await supabase
      .from('token_records')
      .select('source')
      .eq('user_id', user.id)
      .gte('created_at', dayStart)
      .gt('amount', 0)
    if (error) throw error
    const counts: Record<string, any> = {}
    data?.forEach(r => { counts[r.source] = (counts[r.source] ?? 0) + 1 })
    // Check free pull
    const { data: freePull, error: freePullError } = await supabase
      .from('token_records')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', '每日首免')
      .gte('created_at', dayStart)
      .limit(1)
    if (freePullError) throw freePullError
    counts['_free_pull_used'] = (freePull && freePull.length > 0) ? true : false
    return counts
  })
}

export async function claimDailyTokens(source: string) {
  const user = await currentUser()
  if (!user) return 0
  const { data, error } = await supabase.rpc('claim_daily_rewards', { p_source: source })
  if (error) throw error
  invalidate('token-balance', 'gacha-summary', 'daily-tasks')
  const balance = await getTokenBalance()
  return { claimed: data ?? 0, balance: balance.balance }
}

export async function claimAllDailyTokens() {
  const user = await currentUser()
  if (!user) return { claimed: 0, balance: 0 }
  const { data, error } = await supabase.rpc('claim_daily_rewards', { p_source: null })
  if (error) throw error
  invalidate('token-balance', 'gacha-summary', 'daily-tasks')
  const balance = await getTokenBalance()
  return { claimed: data ?? 0, balance: balance.balance }
}

// ============================================================
// Gacha Items
// ============================================================
export async function fetchGachaItems() {
  return cached('gacha-items', async () => {
    const user = await currentUser()
    const { data: items } = await supabase
      .from('gacha_items')
      .select('*')
      .order('weight', { ascending: false })
    if (!items || items.length === 0) return []
    if (!user) return items.map(i => ({ ...i, owned_count: 0 }))

    const ym = localMonth()
    const { data: records } = await supabase
      .from('gacha_records')
      .select('item_id')
      .eq('user_id', user.id)
      .gte('created_at', getLogicalMonthStartIso())

    const ownedMap: Record<string, number> = {}
    records?.forEach(r => {
      ownedMap[r.item_id] = (ownedMap[r.item_id] ?? 0) + 1
    })

    // 同权重内按职业顺序排序
    return items
      .map(i => ({ ...i, owned_count: ownedMap[i.id] ?? 0 }))
      .sort((a, b) => (a.weight !== b.weight ? b.weight - a.weight : (JOB_ORDER[a.job] ?? 99) - (JOB_ORDER[b.job] ?? 99)))
  })
}

export async function fetchGachaRecords(limit = 100) {
  return cached(`gacha-records:${limit}`, async () => {
    const user = await currentUser()
    if (!user) return []
    const { data } = await supabase
      .from('gacha_records')
      .select('*, gacha_items(name, description, rarity, job, emoji)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []).map(flattenRecord)
  })
}

export async function gachaPull(count: 1 | 10) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  assertValidGachaCount(count)

  const { data, error } = await supabase.rpc('gacha_pull', { p_count: count })
  if (error) throw new Error(error.message)

  // RPC 返回的已经是扁平结构，不需要 flattenRecord
  const results = ((data as any).results || []).map((r: any) => ({
    ...r,
    item: r.item_id,
    item_job_display: r.item_job ? JOBS_MAP[r.item_job] : undefined,
  }))

  invalidate('token-balance', 'gacha-summary', 'gacha-items', 'gacha-records', 'ssr-target', 'showcase-current')
  return {
    results,
    balance: (data as any).balance,
    cost: (data as any).cost,
    pity_ssr: (data as any).pity_ssr,
    free_pull: (data as any).free_pull,
    ssr_target_consumed: (data as any).ssr_target_consumed,
    ssr_target_item: (data as any).ssr_target_item,
  }
}

// ============================================================
// SSR Target Lock
// ============================================================
export async function getSSRTargetStatus() {
  return cached('ssr-target', async () => {
    const user = await currentUser()
    if (!user) return { target: null, total_pulls: 0, eligible: false, monthly_used: false }

    const ym = localMonth()

    const { count } = await supabase
      .from('gacha_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', getLogicalMonthStartIso())
    const totalPulls = count ?? 0
    const eligible = totalPulls >= 300

    let target: any = null
    let monthlyUsed = false
    try {
      const { data } = await supabase
        .from('gacha_ssr_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('year_month', ym)
        .single()
      if (data) {
        if (data.consumed) {
          monthlyUsed = true
        } else {
          // 分步获取物品信息
          const { data: item } = await supabase
            .from('gacha_items')
            .select('name, emoji, rarity, job')
            .eq('id', data.target_item_id)
            .single()
          target = {
            id: data.id,
            target_item: data.target_item_id,
            target_item_name: item?.name,
            target_item_emoji: item?.emoji,
            target_item_rarity: item?.rarity,
            target_item_job: item?.job,
          }
        }
      }
    } catch { /* no target */ }

    return { target, total_pulls: totalPulls, eligible, monthly_used: monthlyUsed }
  })
}

export async function setSSRTarget(targetItemId: string) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.rpc('set_ssr_target', { p_target_item_id: targetItemId })
  if (error) throw error
  invalidate('ssr-target', 'gacha-summary')
  return getSSRTargetStatus()
}

async function setSSRTargetLegacy(targetItemId: string) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')

  const ym = localMonth()

  // 检查 300 抽门槛
  const { count } = await supabase
    .from('gacha_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', `${ym}-01`)
  if ((count ?? 0) < 300) throw new Error(`本月累计需要 300 抽才能解锁（当前 ${count} 抽）`)

  // 检查当月是否已消耗
  const { data: existing } = await supabase
    .from('gacha_ssr_targets')
    .select('id, year_month, consumed')
    .eq('user_id', user.id)
    .single()
  if (existing && existing.year_month === ym && existing.consumed) {
    throw new Error('本月已使用过 SSR 锁定')
  }

  // 验证目标物品是 SSR
  const { data: item } = await supabase
    .from('gacha_items')
    .select('id, rarity')
    .eq('id', targetItemId)
    .single()
  if (!item || item.rarity !== 'SSR') throw new Error('只能锁定 SSR 物品')

  // 设置或更新目标
  if (existing) {
    await supabase.from('gacha_ssr_targets').update({
      target_item_id: targetItemId, year_month: ym, consumed: false,
    }).eq('id', existing.id)
  } else {
    await supabase.from('gacha_ssr_targets').insert({
      user_id: user.id, target_item_id: targetItemId, year_month: ym, consumed: false,
    })
  }

  invalidate('ssr-target', 'gacha-summary')
  return getSSRTargetStatus()
}

export async function clearSSRTarget() {
  const user = await currentUser()
  if (!user) return
  const { error } = await supabase.rpc('clear_ssr_target')
  if (error) throw error
  invalidate('ssr-target', 'gacha-summary')
}

// ============================================================
// Weekly Tasks
// ============================================================
export async function getWeeklyTasks() {
  return cached('weekly-tasks', async () => {
    const user = await currentUser()
    if (!user) return { tasks: [], week_start: '', week_earned: 0, week_target: 0 }

    const ws = getWeekStartKey()
    const weDate = new Date(`${ws}T12:00:00Z`)
    weDate.setUTCDate(weDate.getUTCDate() + 7)
    const we = weDate.toISOString().slice(0, 10)
    const weekStartIso = getLogicalDayStartIso(new Date(`${ws}T12:00:00+08:00`))
    const weekEndIso = getLogicalDayStartIso(new Date(`${we}T12:00:00+08:00`))

    const WEEKLY_TASKS = [
      { key: 'core_5_days', name: '完成核心任务 5 天', desc: '本周至少 5 天完成核心任务', amount: 400, icon: 'target', target: 5 },
      { key: 'pomodoros_25', name: '番茄钟 40 个', desc: '本周累计完成 40 个工作番茄钟', amount: 400, icon: 'tomato', target: 40 },
      { key: 'reviews_3', name: '写日记3篇+周记1篇', desc: '本周新建 3 篇日记和 1 篇周记', amount: 200, icon: 'notebook', target: 4 },
      { key: 'streak_7', name: '连续打卡 7 天', desc: '每天至少 1 次获得代币', amount: 400, icon: 'star', target: 7 },
    ]

    const { data: claims, error: claimsError } = await supabase
      .from('weekly_task_claims')
      .select('task_key')
      .eq('user_id', user.id)
      .eq('week_start', ws)
    if (claimsError) throw claimsError
    const claimedKeys = new Set(claims?.map(c => c.task_key) ?? [])

    const tasks = await Promise.all(WEEKLY_TASKS.map(async t => {
      let progress = 0
      if (t.key === 'core_5_days') {
        const { count } = await supabase
          .from('daily_plans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('date', ws).lt('date', we)
          .in('status', ['COMPLETED', 'REVIEWED'])
        progress = Math.min(count ?? 0, 5)
      } else if (t.key === 'pomodoros_25') {
        const { count } = await supabase
          .from('pomodoro_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'WORK').eq('status', 'COMPLETED')
          .gte('start_time', weekStartIso).lt('start_time', weekEndIso)
        progress = count ?? 0
      } else if (t.key === 'reviews_3') {
        const [daily, weekly] = await Promise.all([
          supabase.from('reviews').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('type', 'DAILY').gte('date', ws).lt('date', we),
          supabase.from('reviews').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('type', 'WEEKLY').gte('date', ws).lt('date', we),
        ])
        progress = Math.min(daily.count ?? 0, 3) + Math.min(weekly.count ?? 0, 1)
      } else if (t.key === 'streak_7') {
        progress = Math.min(await getUserWeekStreak(), 7)
      }

      let claimed = claimedKeys.has(t.key)

      // 自动发放：进度达标且未领取
      if (!claimed && progress >= t.target) {
        try {
          const { error } = await supabase.rpc('claim_weekly_task', { p_task_key: t.key })
          if (error) throw error
          claimed = true
          claimedKeys.add(t.key)
        } catch { /* 发放失败，保留 claimed=false，can_claim 为 true 供手动领取 */ }
      }

      return { ...t, progress, claimed, can_claim: !claimed && progress >= t.target }
    }))

    const weekEarned = [...claimedKeys].reduce((s, taskKey) => {
      const task = WEEKLY_TASKS.find(t => t.key === taskKey)
      return s + (task?.amount ?? 0)
    }, 0) ?? 0

    return { tasks, week_start: ws, week_earned: weekEarned, week_target: WEEKLY_TASKS.reduce((s, t) => s + t.amount, 0) }
  })
}

export async function claimWeeklyTask(taskKey: string) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.rpc('claim_weekly_task', { p_task_key: taskKey })
  if (error) throw error
  invalidate('token-balance', 'gacha-summary', 'weekly-tasks')
  return data as number
}

// ============================================================
// Streak Task（连续打卡）— 与工作看板的连续打卡天数同步
// 自动发放：与日任务一致，无需手动领取
// ============================================================
async function getUserStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_streak')
  if (error) throw error
  return Number(data ?? 0)
}

export async function getGachaSummary() {
  return cached('gacha-summary', async () => {
    const { data, error } = await supabase.rpc('get_gacha_summary')
    if (error) throw error
    return data
  })
}

async function getUserWeekStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_week_streak')
  if (error) throw error
  return Number(data ?? 0)
}

export async function getStreakTaskStatus() {
  return cached('streak-task', async () => {
    const user = await currentUser()
    if (!user) return { streak: 0, amount: 0, distributed: true }

    const streak = await getUserStreak()
    const amount = streak * 10

    if (streak === 0) return { streak: 0, amount: 0, distributed: true }

    // daily=true 保证同一 source 同一天只插入一次，从根源避免并发重复
    await addTokenRecord(amount, '连续打卡', true, true)
    invalidate('token-balance', 'gacha-summary', 'streak-task', 'dashboard-stats', 'today-counts', 'showcase-current')
    return { streak, amount, distributed: true }
  })
}

// ============================================================
// Showcase
// ============================================================
export async function getShowcaseCurrent() {
  return cached('showcase-current', async () => {
    const user = await currentUser()
    if (!user) return null
    const { data, error } = await supabase.rpc('get_showcase_current')
    if (error) throw error
    return data
  })
}

export async function getShowcaseSnapshots(year?: string) {
  return cached(`showcase-snapshots:${year || 'all'}`, async () => {
    const user = await currentUser()
    if (!user) return { snapshots: [], years: [] }
    const { data, error } = await supabase
      .from('showcase_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('year_month', { ascending: false })
    if (error) throw error
    const years = [...new Set(data?.map(s => s.year_month.slice(0, 4)) ?? [])]
    const currentYear = String(new Date().getFullYear())
    if (!years.includes(currentYear)) years.push(currentYear)
    const snapshots = year ? (data ?? []).filter(s => s.year_month.startsWith(`${year}-`)) : (data ?? [])
    return { snapshots, years, last_snapshot_at: data?.[0]?.snapshot_at ?? null }
  })
}

export async function snapshotShowcaseNow() {
  const current = await getShowcaseCurrent()
  if (!current) return { ok: false }
  const user = await currentUser()
  if (!user) return { ok: false }
  const { data: snap, error } = await supabase.from('showcase_snapshots').upsert({
    user_id: user.id,
    year_month: current.year_month,
    bounty_level: current.bounty_level,
    pomodoro_level: current.pomodoro_level,
    trophy_level: current.trophy_level,
    bounty_value: current.bounty_value,
    pomodoro_value: current.pomodoro_value,
    trophy_value: current.trophy_value,
    snapshot_at: new Date().toISOString(),
  }, { onConflict: 'user_id,year_month' }).select('id').single()
  if (error) throw error
  invalidate('showcase-snapshots')
  return { ok: true, snapshot_id: snap?.id }
}

// ============================================================
// Dashboard Stats
// ============================================================
export async function getDashboardStats() {
  return cached('dashboard-stats', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_summary')
    if (error) throw error
    return data
  })
}

export async function getDashboardCore() {
  return cached('dashboard-core', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_core')
    if (error) throw error
    return data
  })
}

export async function getDashboardSecondary() {
  return cached('dashboard-secondary', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_secondary')
    if (error) throw error
    return data
  })
}

// ============================================================
// Daily Earned (for calendar)
// ============================================================
export async function getDailyEarned(month: string) {
  return cached(`daily-earned:${month}`, async () => {
    const user = await currentUser()
    if (!user) return { month, days: {}, rarities: {}, pomodoros: {}, month_total: 0, month_pomodoros: 0 }

    const [year, m] = month.split('-').map(Number)
    const first = getLogicalMonthStartIso(new Date(`${month}-01T12:00:00+08:00`))
    const nextMonthKey = m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`
    const nextMonth = getLogicalMonthStartIso(new Date(`${nextMonthKey}-01T12:00:00+08:00`))

    const [tokens, gacha, pomo] = await Promise.all([
      supabase.from('token_records').select('amount, created_at')
        .eq('user_id', user.id).eq('claimed', true).gt('amount', 0)
        .gte('created_at', first).lt('created_at', nextMonth),
      supabase.from('gacha_records').select('created_at, gacha_items(rarity)')
        .eq('user_id', user.id)
        .gte('created_at', first).lt('created_at', nextMonth),
      supabase.from('pomodoro_sessions').select('start_time')
        .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED')
        .gte('start_time', first).lt('start_time', nextMonth),
    ])

    const days: Record<string, number> = {}
    tokens.data?.forEach(r => {
      const d = getLogicalDayKey(r.created_at)
      days[d] = (days[d] ?? 0) + r.amount
    })

    const rarities: Record<string, string> = {}
    gacha.data?.forEach((r: any) => {
      const d = getLogicalDayKey(r.created_at)
      const rarity = r.gacha_items?.rarity
      if (rarity && (!rarities[d] || ['N', 'R', 'SR', 'SSR'].indexOf(rarity) > ['N', 'R', 'SR', 'SSR'].indexOf(rarities[d]))) {
        rarities[d] = rarity
      }
    })

    const pomodoros: Record<string, number> = {}
    pomo.data?.forEach(r => {
      const d = getLogicalDayKey(r.start_time)
      pomodoros[d] = (pomodoros[d] ?? 0) + 1
    })

    return {
      month,
      days,
      rarities,
      pomodoros,
      month_total: Object.values(days).reduce((s, v) => s + v, 0),
      month_pomodoros: Object.values(pomodoros).reduce((s, v) => s + v, 0),
    }
  })
}

// ============================================================
// User Feedback (公开论坛)
// ============================================================
export interface FeedbackEntry {
  id: string
  content: string
  type: 'bug' | 'suggestion' | 'question' | 'general'
  created_at: string
  user_id: string
  username?: string
}

export interface FeedbackComment {
  id: string
  feedback_id: string
  content: string
  created_at: string
  user_id: string
  username?: string
}

export async function fetchFeedback() {
  return cached('feedback', async () => {
    // 分两步查询，避免 PostgREST join 失败（feedback.user_id → auth.users ← profiles.id 是间接关系）
    const { data: feedbacks } = await supabase
      .from('feedback')
      .select('id, content, type, created_at, user_id')
      .order('created_at', { ascending: false })
    if (!feedbacks || feedbacks.length === 0) return []
    // 批量查询相关用户的用户名
    const userIds = [...new Set(feedbacks.map(f => f.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)
    const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) ?? [])
    return feedbacks.map(f => ({
      ...f,
      username: usernameMap.get(f.user_id) || '匿名用户',
    })) as FeedbackEntry[]
  })
}

export async function submitFeedback(content: string, type: FeedbackEntry['type']) {
  const user = await currentUser()
  if (!user) throw new Error('未登录')
  const { data, error } = await supabase
    .from('feedback')
    .insert({ user_id: user.id, content, type })
    .select('id, content, type, created_at, user_id')
    .single()
  if (error) throw error
  invalidate('feedback')
  // 获取当前用户的 username
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  return { ...data, username: profile?.username || '匿名用户' } as FeedbackEntry
}

export async function fetchComments(feedbackId: string) {
  // 同样分两步查询
  const { data: comments } = await supabase
    .from('feedback_comments')
    .select('id, feedback_id, content, created_at, user_id')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true })
  if (!comments || comments.length === 0) return []
  const userIds = [...new Set(comments.map(c => c.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds)
  const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) ?? [])
  return comments.map(c => ({
    ...c,
    username: usernameMap.get(c.user_id) || '匿名用户',
  })) as FeedbackComment[]
}

export async function submitComment(feedbackId: string, content: string) {
  const user = await currentUser()
  if (!user) throw new Error('未登录')
  const { data, error } = await supabase
    .from('feedback_comments')
    .insert({ feedback_id: feedbackId, user_id: user.id, content })
    .select('id, feedback_id, content, created_at, user_id')
    .single()
  if (error) throw error
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  return { ...data, username: profile?.username || '匿名用户' } as FeedbackComment
}

// ============================================================
// Account Management
// ============================================================

/** 获取当前用户的用户名 */
export async function getCurrentUsername() {
  const user = await currentUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  return data?.username ?? null
}

/** 修改用户名 */
export async function updateUsername(newUsername: string) {
  const user = await currentUser()
  if (!user) throw new Error('未登录')
  if (!/^[\w一-鿿]{3,20}$/.test(newUsername)) throw new Error('用户名需3-20位，只允许字母、数字、下划线、中文')
  const { data: existing } = await supabase.from('profiles').select('id').eq('username', newUsername).maybeSingle()
  if (existing && existing.id !== user.id) throw new Error('该用户名已被使用')
  const { error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', user.id)
  if (error) throw error
  return true
}

/** 修改密码 */
export async function updatePassword(newPassword: string) {
  if (newPassword.length < 6) throw new Error('密码至少需要6个字符')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return true
}

/** 发送密码重置邮件 */
export async function requestPasswordReset(email: string, redirectTo?: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) throw new Error('请输入有效的邮箱地址')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/reset-password`,
  })
  if (error) throw error
  return true
}
