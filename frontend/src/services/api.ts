import { supabase } from './supabase'
import { RARITY_MAP } from '../types'

const JOBS_MAP: Record<string, string> = {
  CLERIC: '牧师', SCHOLAR: '学者', MERCHANT: '商人', WARRIOR: '战士',
  DANCER: '舞者', APOTHECARY: '药师', THIEF: '盗贼', HUNTER: '猎人',
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createProject(project: { name: string; description?: string; color?: string; status?: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// Tasks
// ============================================================
export async function fetchTasks(filters?: { status?: string; priority?: string; project_id?: string; search?: string }) {
  const { data: { user } } = await supabase.auth.getUser()
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
  const { data } = await query
  return data ?? []
}

export async function createTask(task: { name: string; description?: string; priority?: string; status?: string; project_id?: string | null; estimated_pomodoros?: number; due_date?: string | null }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id })
    .select()
    .single()
  if (error) throw error
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
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function getTodayCoreTasks() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .eq('user_id', user.id)
    .in('status', ['TODO', 'IN_PROGRESS'])
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

// ============================================================
// Pomodoro Sessions
// ============================================================
export async function fetchPomodoroSessions(filters?: { task_id?: string; type?: string; status?: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let query = supabase
    .from('pomodoro_sessions')
    .select('*, tasks(name)')
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })
  if (filters?.task_id) query = query.eq('task_id', filters.task_id)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data } = await query
  return data ?? []
}

export async function createPomodoroSession(session: {
  task_id: string; start_time: string; end_time?: string;
  duration_minutes?: number; type?: string; status?: string; notes?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert({ ...session, user_id: user.id })
    .select()
    .single()
  if (error) throw error

  // 自动累加任务的 completed_pomodoros
  if (session.type === 'WORK' && session.status === 'COMPLETED') {
    const { count } = await supabase
      .from('pomodoro_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', session.task_id)
      .eq('type', 'WORK')
      .eq('status', 'COMPLETED')
    await supabase
      .from('tasks')
      .update({ completed_pomodoros: count ?? 0 })
      .eq('id', session.task_id)
  }

  return data
}

export async function deletePomodoroSession(id: string) {
  const { error } = await supabase.from('pomodoro_sessions').delete().eq('id', id)
  if (error) throw error
}

export async function getPomodoroStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { today: 0, this_week: 0, this_month: 0, total: 0 }

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekStr = weekStart.toISOString().slice(0, 10)
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [today, week, month, total] = await Promise.all([
    supabase.from('pomodoro_sessions').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED')
      .gte('start_time', todayStr),
    supabase.from('pomodoro_sessions').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED')
      .gte('start_time', weekStr),
    supabase.from('pomodoro_sessions').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED')
      .gte('start_time', monthStr),
    supabase.from('pomodoro_sessions').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED'),
  ])

  return {
    today: today.count ?? 0,
    this_week: week.count ?? 0,
    this_month: month.count ?? 0,
    total: total.count ?? 0,
  }
}

// ============================================================
// Daily Plans
// ============================================================
export async function fetchTodayPlan() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const todayStr = new Date().toISOString().slice(0, 10)
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
}

export async function fetchDailyPlans() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('daily_plans')
    .select('*, tasks(name, status)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
  return data ?? []
}

export async function updateDailyPlan(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('daily_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDailyPlan(id: string) {
  const { error } = await supabase.from('daily_plans').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// Reviews
// ============================================================
export async function fetchReviews(type?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
  if (type) query = query.eq('type', type)
  const { data } = await query
  return data ?? []
}

export async function createReview(review: { type?: string; date: string; content: string; completed_tasks_count?: number; total_pomodoros?: number }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...review, user_id: user.id })
    .select()
    .single()
  if (error) throw error
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
  return data
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// Quick Memos
// ============================================================
export async function fetchQuickMemos() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('quick_memos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createQuickMemo(content: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('quick_memos')
    .insert({ content, user_id: user.id })
    .select()
    .single()
  if (error) throw error
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
  return data
}

export async function deleteQuickMemo(id: string) {
  const { error } = await supabase.from('quick_memos').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// Token Records
// ============================================================
export async function getTokenBalance() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { balance: 0, total_earned: 0, total_spent: 0 }
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data } = await supabase
    .from('token_records')
    .select('amount')
    .eq('user_id', user.id)
    .eq('claimed', true)
    .gte('created_at', `${ym}-01`)
  const records = data ?? []
  const earned = records.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const spent = records.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)
  return { balance: earned - spent, total_earned: earned, total_spent: spent }
}

export async function addTokenRecord(amount: number, source: string, claimed = true, daily = false) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 日任务限一次：同 source 今日已有记录则跳过
  if (daily) {
    const todayStr = new Date().toISOString().slice(0, 10)
    const { data: existing } = await supabase
      .from('token_records')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', source)
      .gte('created_at', todayStr)
      .limit(1)
    if (existing && existing.length > 0) return existing[0]
  }

  const { data, error } = await supabase
    .from('token_records')
    .insert({ amount, source, claimed, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDailyTasks() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('token_records')
    .select('source, amount, claimed')
    .eq('user_id', user.id)
    .gte('created_at', todayStr)
    .gt('amount', 0)
  return data ?? []
}

export async function claimDailyTokens(source: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('token_records')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('source', source)
    .eq('claimed', false)
    .gte('created_at', todayStr)
    .select()
  if (error) throw error
  return data?.length ?? 0
}

export async function claimAllDailyTokens() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('token_records')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('claimed', false)
    .gt('amount', 0)
    .gte('created_at', todayStr)
    .select()
  if (error) throw error
  return data?.length ?? 0
}

// ============================================================
// Gacha Items
// ============================================================
export async function fetchGachaItems() {
  const { data } = await supabase
    .from('gacha_items')
    .select('*')
    .order('weight', { ascending: false })
  return data ?? []
}

export async function fetchGachaRecords() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('gacha_records')
    .select('*, gacha_items(name, description, rarity, job, emoji)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []).map(flattenRecord)
}

export async function gachaPull(count: 1 | 10) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const items = await fetchGachaItems()
  if (items.length === 0) throw new Error('扭蛋池为空')

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 检查免费单抽
  let freePull = false
  if (count === 1) {
    const { data: existing } = await supabase
      .from('token_records')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', '每日首免')
      .gte('created_at', todayStr)
      .limit(1)
    if (!existing || existing.length === 0) freePull = true
  }

  // 计算余额
  const balanceData = await getTokenBalance()
  const cost = freePull ? 0 : count === 1 ? 50 : 500
  if (balanceData.balance < cost) throw new Error(`代币不足！需要 ${cost} 币，当前余额 ${balanceData.balance} 币`)

  // 扣费（记录 ID 用于失败回滚）
  let deductionId: string | null = null
  if (cost > 0) {
    const { data: rec } = await supabase
      .from('token_records')
      .insert({ amount: -cost, source: '扭蛋消耗', claimed: true, user_id: user.id })
      .select('id')
      .single()
    deductionId = rec?.id ?? null
  } else if (freePull) {
    await addTokenRecord(0, '每日首免', true)
  }

  try {
  // 保底计数
  const { data: monthRecords } = await supabase
    .from('gacha_records')
    .select('id, gacha_items(rarity)')
    .eq('user_id', user.id)
    .gte('created_at', `${ym}-01`)
    .order('created_at', { ascending: true })

  let dryCount = monthRecords?.length ?? 0
  const records = monthRecords ?? []
  // 从后往前找最后一个 SSR
  let lastSsrIdx = -1
  for (let i = records.length - 1; i >= 0; i--) {
    if ((records[i] as any).gacha_items?.rarity === 'SSR') { lastSsrIdx = i; break }
  }
  if (lastSsrIdx >= 0) {
    dryCount = records.length - 1 - lastSsrIdx
  }

  const ssrPool = items.filter(i => i.rarity === 'SSR')
  const nonSsrPool = items.filter(i => i.rarity !== 'SSR')
  const rPlusPool = items.filter(i => ['R', 'SR', 'SSR'].includes(i.rarity))

  function ssrRate(dry: number) {
    if (dry < 50) return 0.02
    return Math.min(2 + (dry - 49) * 2, 100) / 100
  }

  function weightedRandom(pool: typeof items) {
    const totalWeight = pool.reduce((s, i) => s + i.weight, 0)
    let r = Math.random() * totalWeight
    for (const item of pool) {
      r -= item.weight
      if (r <= 0) return item
    }
    return pool[pool.length - 1]
  }

  // 抽取
  const results: any[] = []
  let ssrTargetConsumed = false
  let ssrTargetItemData: any = null

  // 读取 SSR 锁定目标
  let ssrTarget: any = null
  try {
    const { data } = await supabase
      .from('gacha_ssr_targets')
      .select('*, gacha_items(*)')
      .eq('user_id', user.id)
      .eq('consumed', false)
      .single()
    if (data && data.year_month === ym) ssrTarget = data
  } catch { /* no target */ }

  for (let i = 0; i < count; i++) {
    dryCount++
    const rate = ssrRate(dryCount)
    let chosen
    if (Math.random() < rate) {
      // SSR 出了！检查是否有锁定目标
      if (ssrTarget && !ssrTargetConsumed) {
        chosen = ssrTarget.gacha_items
        ssrTargetConsumed = true
        ssrTargetItemData = ssrTarget
        // 标记已消耗
        await supabase.from('gacha_ssr_targets').update({ consumed: true }).eq('id', ssrTarget.id)
      } else {
        chosen = weightedRandom(ssrPool)
      }
      dryCount = 0
    } else {
      chosen = weightedRandom(nonSsrPool)
    }
    const { data: record } = await supabase
      .from('gacha_records')
      .insert({ user_id: user.id, item_id: chosen.id })
      .select('*, gacha_items(name, description, rarity, job, emoji)')
      .single()
    results.push(record)
  }

  // 十连保底
  if (count === 10) {
    const rarities = results.map(r => r.gacha_items?.rarity)
    if (!rarities.some(r => ['R', 'SR', 'SSR'].includes(r))) {
      const chosen = weightedRandom(rPlusPool)
      const lastId = results[results.length - 1].id
      await supabase
        .from('gacha_records')
        .update({ item_id: chosen.id })
        .eq('id', lastId)
      results[results.length - 1] = { ...results[results.length - 1], gacha_items: chosen }
      if (chosen.rarity === 'SSR') dryCount = 0
    }
  }

  const newBalance = await getTokenBalance()
  return {
    results: results.map(flattenRecord),
    balance: newBalance.balance,
    cost,
    pity_ssr: dryCount,
    free_pull: freePull,
    ssr_target_consumed: ssrTargetConsumed,
    ssr_target_item: ssrTargetItemData,
  }

  } catch (err) {
    // 事务回滚：删除扣费记录
    if (deductionId) {
      await supabase.from('token_records').delete().eq('id', deductionId)
    }
    throw err
  }
}

// ============================================================
// SSR Target Lock
// ============================================================
export async function getSSRTargetStatus() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { target: null, total_pulls: 0, eligible: false, monthly_used: false }

  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { count } = await supabase
    .from('gacha_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', `${ym}-01`)
  const totalPulls = count ?? 0
  const eligible = totalPulls >= 300

  let target: any = null
  let monthlyUsed = false
  try {
    const { data } = await supabase
      .from('gacha_ssr_targets')
      .select('*, gacha_items(*)')
      .eq('user_id', user.id)
      .single()
    if (data) {
      if (data.year_month !== ym) {
        // 跨月，删除旧目标
        await supabase.from('gacha_ssr_targets').delete().eq('id', data.id)
      } else if (data.consumed) {
        monthlyUsed = true
      } else {
        target = {
          id: data.id,
          target_item: data.target_item_id,
          target_item_name: data.gacha_items?.name,
          target_item_emoji: data.gacha_items?.emoji,
          target_item_rarity: data.gacha_items?.rarity,
          target_item_job: data.gacha_items?.job,
        }
      }
    }
  } catch { /* no target */ }

  return { target, total_pulls: totalPulls, eligible, monthly_used: monthlyUsed }
}

export async function setSSRTarget(targetItemId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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

  return getSSRTargetStatus()
}

export async function clearSSRTarget() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('gacha_ssr_targets').delete().eq('user_id', user.id)
}

// ============================================================
// Weekly Tasks
// ============================================================
export async function getWeeklyTasks() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tasks: [], week_start: '', week_earned: 0, week_target: 0 }

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const ws = weekStart.toISOString().slice(0, 10)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const we = weekEnd.toISOString().slice(0, 10)

  const WEEKLY_TASKS = [
    { key: 'core_5_days', name: '完成核心任务 5 天', desc: '本周至少 5 天完成核心任务', amount: 400, icon: 'target', target: 5 },
    { key: 'pomodoros_25', name: '番茄钟 40 个', desc: '本周累计完成 40 个工作番茄钟', amount: 400, icon: 'tomato', target: 40 },
    { key: 'reviews_3', name: '写日记3篇+周记1篇', desc: '本周新建 3 篇日记和 1 篇周记', amount: 200, icon: 'notebook', target: 4 },
    { key: 'streak_7', name: '连续打卡 7 天', desc: '每天至少 1 次获得代币', amount: 400, icon: 'star', target: 7 },
  ]

  const { data: claims } = await supabase
    .from('weekly_task_claims')
    .select('task_key')
    .eq('user_id', user.id)
    .eq('week_start', ws)
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
        .gte('start_time', ws).lt('start_time', we)
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
      let streak = 0
      const cursor = new Date(now)
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor)
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().slice(0, 10)
        const nextDay = new Date(d)
        nextDay.setDate(nextDay.getDate() + 1)
        const ns = nextDay.toISOString().slice(0, 10)
        const { count } = await supabase
          .from('token_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gt('amount', 0)
          .gte('created_at', ds)
          .lt('created_at', ns)
        if ((count ?? 0) > 0) streak++
        else break
      }
      progress = Math.min(streak, 7)
    }

    const claimed = claimedKeys.has(t.key)
    return { ...t, progress, claimed, can_claim: !claimed && progress >= t.target }
  }))

  const weekEarned = claims?.reduce((s, c) => {
    const task = WEEKLY_TASKS.find(t => t.key === c.task_key)
    return s + (task?.amount ?? 0)
  }, 0) ?? 0

  return { tasks, week_start: ws, week_earned: weekEarned, week_target: WEEKLY_TASKS.reduce((s, t) => s + t.amount, 0) }
}

export async function claimWeeklyTask(taskKey: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const ws = weekStart.toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('weekly_task_claims')
    .select('id')
    .eq('user_id', user.id)
    .eq('task_key', taskKey)
    .eq('week_start', ws)
    .limit(1)
  if (existing && existing.length > 0) throw new Error('已领取')

  const WEEKLY_TASKS: Record<string, number> = {
    core_5_days: 400, pomodoros_25: 400, reviews_3: 200, streak_7: 400,
  }
  const amount = WEEKLY_TASKS[taskKey] ?? 0

  await supabase.from('weekly_task_claims').insert({
    user_id: user.id, task_key: taskKey, week_start: ws, amount,
  })
  await addTokenRecord(amount, `周任务·${taskKey}`)
  return amount
}

// ============================================================
// Showcase
// ============================================================
export async function getShowcaseCurrent() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [balance, pomoCount, gachaData] = await Promise.all([
    getTokenBalance(),
    supabase.from('pomodoro_sessions').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED')
      .gte('start_time', `${ym}-01`),
    supabase.from('gacha_records')
      .select('gacha_items(rarity)')
      .eq('user_id', user.id)
      .gte('created_at', `${ym}-01`),
  ])

  const bountyTotal = balance.total_earned
  const pomodoroTotal = pomoCount.count ?? 0

  // 计算稀有度完成度
  const rarityOrder = ['N', 'R', 'SR', 'SSR']
  const collected = new Set(gachaData.data?.map((r: any) => r.gacha_items?.rarity) ?? [])
  let rarityCompletion = 0
  let rarityValue = 0  // 最高已完整集齐的稀有度索引
  for (let i = 0; i < rarityOrder.length; i++) {
    const r = rarityOrder[i]
    const { count } = await supabase.from('gacha_items').select('*', { count: 'exact', head: true }).eq('rarity', r)
    const owned = gachaData.data?.filter((rec: any) => rec.gacha_items?.rarity === r).length ?? 0
    if (owned >= (count ?? 8)) {
      rarityCompletion++
      rarityValue = i
    } else {
      break
    }
  }

  function calcLevel(total: number, thresholds: number[]) {
    let level = 0
    for (let i = 0; i < thresholds.length; i++) {
      if (total >= thresholds[i]) level = i + 1
    }
    return level
  }

  return {
    year_month: ym,
    bounty_level: calcLevel(bountyTotal, [3000, 9800, 19800, 32800]),
    pomodoro_level: calcLevel(pomodoroTotal, [30, 60, 120, 240]),
    trophy_level: Math.min(rarityCompletion, 4),
    bounty_value: bountyTotal,
    pomodoro_value: pomodoroTotal,
    trophy_value: rarityValue,
    thresholds: { bounty: [0, 3000, 9800, 19800, 32800], pomodoro: [0, 30, 60, 120, 240] },
  }
}

export async function getShowcaseSnapshots(year?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { snapshots: [], years: [] }
  let query = supabase.from('showcase_snapshots').select('*').eq('user_id', user.id)
  if (year) query = query.like('year_month', `${year}-%`)
  const { data } = await query.order('year_month', { ascending: false })
  const years = [...new Set(data?.map(s => s.year_month.slice(0, 4)) ?? [])]
  return { snapshots: data ?? [], years }
}

export async function snapshotShowcaseNow() {
  const current = await getShowcaseCurrent()
  if (!current) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('showcase_snapshots').upsert({
    user_id: user.id,
    year_month: current.year_month,
    bounty_level: current.bounty_level,
    pomodoro_level: current.pomodoro_level,
    trophy_level: current.trophy_level,
    bounty_value: current.bounty_value,
    pomodoro_value: current.pomodoro_value,
    trophy_value: current.trophy_value,
  }, { onConflict: 'user_id,year_month' })
}

// ============================================================
// Dashboard Stats
// ============================================================
export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const todayStr = new Date().toISOString().slice(0, 10)

  const [todayPlan, tasks, pomodoros, projects, todaySessions] = await Promise.all([
    fetchTodayPlan(),
    supabase.from('tasks').select('status').eq('user_id', user.id),
    getPomodoroStats(),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'ACTIVE'),
    supabase.from('pomodoro_sessions')
      .select('id, tasks(name), type, status, duration_minutes, start_time, end_time')
      .eq('user_id', user.id)
      .gte('start_time', todayStr)
      .order('start_time', { ascending: false })
      .limit(10),
  ])

  const taskList = tasks.data ?? []
  return {
    today_plan: todayPlan,
    tasks: {
      total: taskList.length,
      todo: taskList.filter(t => t.status === 'TODO').length,
      in_progress: taskList.filter(t => t.status === 'IN_PROGRESS').length,
      completed: taskList.filter(t => t.status === 'DONE').length,
    },
    pomodoros,
    projects: { active: projects.count ?? 0 },
    today_sessions: todaySessions.data ?? [],
  }
}

// ============================================================
// Daily Earned (for calendar)
// ============================================================
export async function getDailyEarned(month: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { month, days: {}, rarities: {}, pomodoros: {}, month_total: 0, month_pomodoros: 0 }

  const [year, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const last = `${month}-${String(lastDay).padStart(2, '0')}`

  const [tokens, gacha, pomo] = await Promise.all([
    supabase.from('token_records').select('amount, created_at')
      .eq('user_id', user.id).eq('claimed', true).gt('amount', 0)
      .gte('created_at', first).lte('created_at', `${last}T23:59:59`),
    supabase.from('gacha_records').select('created_at, gacha_items(rarity)')
      .eq('user_id', user.id)
      .gte('created_at', first).lte('created_at', `${last}T23:59:59`),
    supabase.from('pomodoro_sessions').select('start_time')
      .eq('user_id', user.id).eq('type', 'WORK').eq('status', 'COMPLETED')
      .gte('start_time', first).lte('start_time', `${last}T23:59:59`),
  ])

  const days: Record<string, number> = {}
  tokens.data?.forEach(r => {
    const d = r.created_at.slice(0, 10)
    days[d] = (days[d] ?? 0) + r.amount
  })

  const rarities: Record<string, string> = {}
  gacha.data?.forEach((r: any) => {
    const d = r.created_at.slice(0, 10)
    const rarity = r.gacha_items?.rarity
    if (rarity && (!rarities[d] || ['N', 'R', 'SR', 'SSR'].indexOf(rarity) > ['N', 'R', 'SR', 'SSR'].indexOf(rarities[d]))) {
      rarities[d] = rarity
    }
  })

  const pomodoros: Record<string, number> = {}
  pomo.data?.forEach(r => {
    const d = r.start_time.slice(0, 10)
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
}
