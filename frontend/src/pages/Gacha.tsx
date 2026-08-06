import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/Icons';
import type { IconName } from '../components/Icons';
import { supabase } from '../services/supabase';
import {
  fetchGachaItems, fetchGachaRecords, gachaPull,
  getTokenBalance, addTokenRecord, getDailyTasks,
  claimDailyTokens, claimAllDailyTokens,
  getWeeklyTasks, claimWeeklyTask,
  getSSRTargetStatus, setSSRTarget, clearSSRTarget,
  getTodayCounts,
} from '../services/api';
import type { GachaItem, GachaRecord, TokenBalance } from '../types';
import { RARITY_MAP, RARITY_COLOR_MAP } from '../types';

const RARITY_ROW: Record<string, number> = { SSR: 1, SR: 2, R: 3, N: 4 };
const JOB_COL: Record<string, number> = { CLERIC: 1, SCHOLAR: 2, MERCHANT: 3, WARRIOR: 4, DANCER: 5, APOTHECARY: 6, THIEF: 7, HUNTER: 8 };

function itemImage(item: { rarity: string; job: string }) {
  const r = RARITY_ROW[item.rarity] || 1;
  const c = JOB_COL[item.job] || 1;
  return `${import.meta.env.BASE_URL}items/_r${r}c${c}.webp`;
}

const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };
const pxH2 = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxH3 = { fontFamily: 'var(--oto-font-title)', fontSize: '16px', lineHeight: '1.8' };

const COST_SINGLE = 50;
const COST_TEN = 500;

interface EarnSource {
  desc: string;
  amount: number;
  icon: IconName;
  daily: boolean;
  note: string;
}
const EARN_SOURCES: EarnSource[] = [
  { desc: '番茄钟', amount: 0, icon: 'tomato', daily: false, note: '分级奖励：1-4个40币 / 5-8个50币 / 9+个60币' },
  { desc: '首次番茄钟', amount: 60, icon: 'tomato', daily: true, note: '今日第一次完成工作番茄钟' },
  { desc: '休息', amount: 20, icon: 'coffee', daily: true, note: '完成一个休息时段' },
  { desc: '创建任务', amount: 20, icon: 'plus', daily: true, note: '新建任意任务' },
  { desc: '完成任务', amount: 20, icon: 'check', daily: true, note: '将任务标记为已完成' },
  { desc: '确定核心任务', amount: 20, icon: 'target', daily: true, note: '在每日计划中选定核心要事' },
  { desc: '晨间规划', amount: 40, icon: 'sun', daily: true, note: '完成早间反思填写' },
  { desc: '晚间回顾', amount: 40, icon: 'moon', daily: true, note: '完成晚间回顾填写' },
  { desc: '每日计划完成', amount: 60, icon: 'calendar', daily: true, note: '将每日计划标记为完成' },
  { desc: '写笔记', amount: 40, icon: 'notebook', daily: true, note: '新建一篇回顾笔记' },
  { desc: '创建清单', amount: 20, icon: 'edit', daily: true, note: '新建一条随手清单' },
  { desc: '完成清单', amount: 20, icon: 'task', daily: true, note: '勾选完成一条清单' },
  { desc: '抽扭蛋', amount: 40, icon: 'star', daily: true, note: '完成一次扭蛋抽取' },
];

interface DailyTaskStatus {
  source: string;
  amount: number;
  completed: boolean;
  claimed: boolean;
  can_claim: boolean;
}

interface DailyTasksResponse {
  date: string;
  today_earned: number;
  daily_target: number;
  tasks: DailyTaskStatus[];
}

interface WeeklyTask {
  key: string;
  name: string;
  desc: string;
  amount: number;
  icon: string;
  target: number;
  progress: number;
  claimed: boolean;
  can_claim: boolean;
}

export default function Gacha() {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [items, setItems] = useState<GachaItem[]>([]);
  const [records, setRecords] = useState<GachaRecord[]>([]);
  const [ownedCounts, setOwnedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [pullResult, setPullResult] = useState<GachaRecord[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [showRepeatable, setShowRepeatable] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<DailyTaskStatus[]>([]);
  const [todayEarned, setTodayEarned] = useState<number>(0);
  const [dailyTarget, setDailyTarget] = useState<number>(400);
  const [showMechanics, setShowMechanics] = useState(false);
  const [pitySsr, setPitySsr] = useState(0);
  const [freePullUsed, setFreePullUsed] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GachaItem | null>(null);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [weekStart, setWeekStart] = useState<string>('');
  const [weekEarned, setWeekEarned] = useState<number>(0);
  const [weekTarget, setWeekTarget] = useState<number>(0);
  const [ssrTargetStatus, setSSRTargetStatus] = useState<any>(null);
  const [showSSRLock, setShowSSRLock] = useState(false);
  const [pullMeta, setPullMeta] = useState<{ ssr_target_consumed?: boolean; ssr_target_item?: any } | null>(null);
  const [todayTomatoCount, setTodayTomatoCount] = useState<number>(0);
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});
  const [settingSSRTarget, setSettingSSRTarget] = useState(false);

  const refreshDaily = useCallback(async () => {
    try {
      const dt: DailyTasksResponse = await getDailyTasks();
      setDailyTasks(dt.tasks);
      setTodayEarned(dt.today_earned);
      setDailyTarget(dt.daily_target);
    } catch { /* */ }
  }, []);

  const load = useCallback(async () => {
    const [itemsData, recordsData, balanceData, dailyData, weeklyData, ssrData, todayCountsData] = await Promise.all([
      fetchGachaItems(),
      fetchGachaRecords(),
      getTokenBalance(),
      getDailyTasks().catch(() => ({ date: '', today_earned: 0, daily_target: 400, tasks: [] as DailyTaskStatus[] } as DailyTasksResponse)),
      getWeeklyTasks().catch(() => ({ tasks: [] as WeeklyTask[], week_start: '', week_earned: 0, week_target: 0 })),
      getSSRTargetStatus().catch(() => ({ target: null, total_pulls: 0, eligible: false, monthly_used: false })),
      getTodayCounts().catch(() => ({})),
    ]);
    setItems(itemsData);
    setRecords(recordsData);
    setBalance(balanceData);
    setSSRTargetStatus(ssrData);

    // Today tomato count for tier display
    const todayCounts = todayCountsData as Record<string, number>;
    setTodayCounts(todayCounts);
    setTodayTomatoCount(todayCounts['番茄钟'] ?? 0);

    // Daily tasks
    setDailyTasks(dailyData.tasks);
    setTodayEarned(dailyData.today_earned);
    setDailyTarget(dailyData.daily_target);

    // Check if free pull already used today via token_records
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: freeRec } = await supabase
          .from('token_records')
          .select('id')
          .eq('user_id', user.id)
          .eq('source', '每日首免')
          .gte('created_at', todayStr)
          .limit(1);
        if (freeRec && freeRec.length > 0) setFreePullUsed(true);
      }
    } catch { /* */ }

    // Weekly tasks
    setWeeklyTasks(weeklyData.tasks);
    setWeekStart(weeklyData.week_start);
    setWeekEarned(weeklyData.week_earned ?? 0);
    setWeekTarget(weeklyData.week_target ?? 0);

    // Compute owned counts and pity
    const counts: Record<string, number> = {};
    recordsData.forEach((r: GachaRecord) => {
      counts[r.item] = (counts[r.item] ?? 0) + 1;
    });
    setOwnedCounts(counts);

    // Compute pity: count consecutive non-SSR from most recent pull
    {
      let dry = 0;
      for (const r of recordsData) {
        if (r.item_rarity === 'SSR') break;
        dry++;
      }
      setPitySsr(dry);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePull = async (count: number) => {
    setPulling(true);
    try {
      const result = await gachaPull(count as 1 | 10);
      setPullResult(result.results);
      setPitySsr(result.pity_ssr ?? 0);
      setPullMeta({ ssr_target_consumed: result.ssr_target_consumed, ssr_target_item: result.ssr_target_item });
      if (result.ssr_target_consumed) {
        setSSRTargetStatus((prev: any) => prev ? { ...prev, target: null } : null);
      }
      if (result.free_pull) setFreePullUsed(true);
      addTokenRecord(40, '抽扭蛋', true, true).catch(() => {});
      setShowResult(true);
      // Refresh balance, records, and owned counts
      const [balanceData, recordsData] = await Promise.all([
        getTokenBalance(),
        fetchGachaRecords(),
      ]);
      setBalance(balanceData);
      setRecords(recordsData);
      const counts: Record<string, number> = {};
      recordsData.forEach((r: GachaRecord) => {
        counts[r.item] = (counts[r.item] ?? 0) + 1;
      });
      setOwnedCounts(counts);
    } catch (e: any) {
      const msg = e?.message || '抽取失败，请稍后重试';
      alert(msg);
    } finally {
      setPulling(false);
    }
  };

  const handleClaimWeekly = async (taskKey: string) => {
    try {
      const amount = await claimWeeklyTask(taskKey);
      const [b, wt] = await Promise.all([getTokenBalance(), getWeeklyTasks()]);
      setBalance(b);
      setWeeklyTasks(wt.tasks);
      setWeekEarned(wt.week_earned ?? 0);
      setWeekTarget(wt.week_target ?? 0);
      setWeeklyTasks(prev => prev.map(t =>
        t.key === taskKey ? { ...t, claimed: true, can_claim: false } : t
      ));
      alert(`领取成功！+${amount} 币`);
    } catch (e: any) {
      alert(e?.message || '领取失败');
    }
  };

  const handleClaimDaily = async (source: string) => {
    try {
      await claimDailyTokens(source);
      const [b, dt] = await Promise.all([getTokenBalance(), getDailyTasks()]);
      setBalance(b);
      setDailyTasks(dt.tasks);
      setTodayEarned(dt.today_earned);
      setDailyTarget(dt.daily_target);
    } catch (e: any) {
      alert(e?.message || '领取失败');
    }
  };

  const handleClaimAllDaily = async () => {
    try {
      const count = await claimAllDailyTokens();
      const [b, dt] = await Promise.all([getTokenBalance(), getDailyTasks()]);
      setBalance(b);
      setDailyTasks(dt.tasks);
      setTodayEarned(dt.today_earned);
      setDailyTarget(dt.daily_target);
      alert(`一键领取 ${count} 项任务！`);
    } catch (e: any) {
      alert(e?.message || '领取失败');
    }
  };

  const freePullAvailable = !freePullUsed;
  const canSingle = freePullAvailable || (balance ? balance.balance >= COST_SINGLE : false);
  const canTen = balance ? balance.balance >= COST_TEN : false;

  const grouped = items.reduce((acc, item) => {
    const r = item.rarity;
    if (!acc[r]) acc[r] = [];
    acc[r].push(item);
    return acc;
  }, {} as Record<string, GachaItem[]>);
  const rarityOrder = ['SSR', 'SR', 'R', 'N'].filter(r => grouped[r]);

  if (loading) {
    return (
      <div className="space-y-6 oto-stagger">
        <div className="oto-window rounded-none! p-6 flex items-center gap-4">
          <Icon name="loading" size={32} className="animate-spin" />
          <span style={pxBody}>加载扭蛋机中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header */}
      <div className="oto-window rounded-none! p-4 flex items-center justify-between flex-wrap gap-3 oto-card-stamped">
        <div className="flex items-center gap-3">
          <Icon name="joystick" size={36} />
          <h1 style={pxH2} className="m-0!">扭蛋机</h1>
        </div>
      </div>

      {/* Token Balance + Pull */}
      <div className="oto-window-gold rounded-none! p-6 px-10">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon name="coins" size={40} />
              <span style={{ ...pxH2, fontSize: '36px', color: 'var(--oto-gold-dark)' }}>
                {balance?.balance ?? 0}
              </span>
              <span style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>本月代币</span>
            </div>
            <div className="flex gap-4 items-center" style={pxSm}>
              <span style={{ color: 'var(--oto-text-muted)' }}>
                本月获得 <span style={{ color: 'var(--oto-green)' }}>+{balance?.total_earned ?? 0}</span>
              </span>
              <span style={{ color: 'var(--oto-text-muted)' }}>
                本月消费 <span style={{ color: 'var(--oto-accent-alt)' }}>-{balance?.total_spent ?? 0}</span>
              </span>
              <span style={{ color: 'var(--oto-text-muted)' }}>
                本月抽取 <span style={{ color: 'var(--oto-text-dim)' }}>{ssrTargetStatus?.total_pulls ?? '...'}</span> 次
              </span>
              <span style={{ color: 'var(--oto-text-muted)' }}>
                !&nbsp;&nbsp;&nbsp;每月 1 号 0 点自动清零（用于藏品室结算）
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <button
              className="oto-btn"
              disabled={!canSingle || pulling}
              onClick={() => handlePull(1)}
              style={{ ...pxBody, fontSize: '22px', padding: '10px 32px', opacity: canSingle ? 1 : 0.4, cursor: canSingle ? 'pointer' : 'not-allowed' }}
            >
              <span style={{ marginRight: 6 }}><Icon name="sword" size={22} /></span>
              单抽
              <span style={{ ...pxSm, display: 'block', marginTop: 2, color: freePullAvailable ? 'var(--oto-green)' : 'inherit' }}>
                {freePullAvailable ? '免费' : `${COST_SINGLE} 币`}
              </span>
            </button>
            <button
              className="oto-btn"
              disabled={!canTen || pulling}
              onClick={() => handlePull(10)}
              style={{
                ...pxBody, fontSize: '22px', padding: '10px 32px',
                background: 'linear-gradient(135deg, #e8dcc0, #efe8d4)',
                opacity: canTen ? 1 : 0.4, cursor: canTen ? 'pointer' : 'not-allowed',
              }}
            >
              <span style={{ marginRight: 6 }}><Icon name="gift" size={22} /></span>
              十连抽
              <span style={{ ...pxSm, display: 'block', marginTop: 2 }}>{COST_TEN} 币</span>
            </button>
          </div>
        </div>
        {pulling && (
          <div className="mt-3 flex items-center justify-center gap-2" style={{ color: 'var(--oto-gold-dark)' }}>
            <Icon name="loading" size={20} className="animate-spin" />
            <span style={pxBody}>扭蛋机转动中...</span>
          </div>
        )}
      </div>

      {/* Daily Tasks */}
      <div className="oto-window rounded-none! p-4">
        <div className="flex items-center justify-between cursor-pointer"
             onClick={() => { setShowSources(!showSources); if (!showSources) refreshDaily(); }}>
          <h2 style={pxH3} className="m-0! flex items-center gap-2">
            <Icon name="sun" size={16} /> 日任务
            {dailyTasks.some(t => t.can_claim) ? (
              <span className="oto-badge" style={{
                ...pxSm, fontSize: '10px', padding: '1px 8px',
                background: 'var(--oto-gold)', color: '#fff',
                borderColor: 'var(--oto-gold-dark)',
              }}>可领取</span>
            ) : dailyTasks.length > 0 && dailyTasks.every(t => t.claimed) ? (
              <span className="oto-badge" style={{
                ...pxSm, fontSize: '10px', padding: '1px 8px',
                background: 'var(--oto-green)', color: '#fff',
                borderColor: 'var(--oto-green)',
              }}>今日已领</span>
            ) : null}
          </h2>
          <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{showSources ? '▲ 收起' : '▼ 展开'}</span>
        </div>
        {showSources && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p style={{ ...pxSm, color: 'var(--oto-text-dim)' }}>
                今日 ({new Date().toISOString().slice(0, 10).replace(/-/g, '/')}) 已获得{' '}
                <span style={{
                  color: todayEarned >= dailyTarget ? 'var(--oto-green)' : 'var(--oto-gold-dark)',
                  fontWeight: 'bold',
                }}>{todayEarned}</span>
                /{dailyTarget} 币
                {todayEarned >= dailyTarget && <span style={{ marginLeft: 2 }}><Icon name="check" size={14} /></span>}
              </p>
              {dailyTasks.some(t => t.can_claim) && (
                <button onClick={handleClaimAllDaily}
                        className="oto-btn oto-btn-sm"
                        style={{ ...pxSm, padding: '2px 10px' }}>
                  一键领取
                </button>
              )}
            </div>
            {EARN_SOURCES.filter(s => s.daily).map(s => {
              const task = dailyTasks.find(t => t.source === s.desc);
              const isClaimed = task?.claimed ?? false;
              const isCompleted = task?.completed ?? false;
              const canClaim = task?.can_claim ?? false;
              const displayAmount = task?.amount ?? s.amount;
              const pct = isClaimed ? 100 : isCompleted ? 50 : 0;
              return (
                <div key={s.desc} className="oto-inset rounded-none! p-3"
                     style={{ opacity: isClaimed ? 0.5 : 1 }}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon name={s.icon} size={20} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ ...pxSm, fontWeight: 'bold' }}>{s.desc}</span>
                        <span style={{ ...pxSm, color: 'var(--oto-gold-dark)', fontWeight: 'bold' }}>
                          +{displayAmount} 币
                        </span>
                      </div>
                      <p style={{ ...pxSm, color: 'var(--oto-text-muted)', marginTop: 2 }}>
                        {s.note}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span style={{ ...pxSm, color: isClaimed ? 'var(--oto-green)' : canClaim ? 'var(--oto-gold-dark)' : 'var(--oto-text-dim)' }}>
                        {isClaimed ? '1/1' : isCompleted ? '可领取' : '0/1'}
                      </span>
                      {isClaimed ? (
                        <span style={{ ...pxSm, color: 'var(--oto-green)' }}><Icon name="check" size={14} /> 已领取</span>
                      ) : canClaim ? (
                        <button onClick={() => handleClaimDaily(s.desc)}
                                className="oto-btn oto-btn-sm"
                                style={{ ...pxSm, padding: '2px 10px' }}>
                          领取
                        </button>
                      ) : (
                        <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{isCompleted ? '已完成' : '未完成'}</span>
                      )}
                    </div>
                  </div>
                  <div className="oto-progress" style={{ height: '6px' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: isClaimed
                        ? 'linear-gradient(90deg, #4a8a4a, #6aaa6a)'
                        : canClaim
                          ? 'linear-gradient(90deg, #c89030, #d4b860)'
                          : 'linear-gradient(90deg, #888, #aaa)',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Weekly Tasks ── */}
      <div className="oto-window rounded-none! p-4">
        <div className="flex items-center justify-between cursor-pointer"
             onClick={() => setShowWeekly(!showWeekly)}>
          <h2 style={pxH3} className="m-0! flex items-center gap-2">
            <Icon name="calendar" size={16} /> 周任务
            {weeklyTasks.some(t => t.can_claim) && (
              <span className="oto-badge" style={{
                ...pxSm, fontSize: '10px', padding: '1px 8px',
                background: 'var(--oto-gold)', color: '#fff',
                borderColor: 'var(--oto-gold-dark)',
              }}>可领取</span>
            )}
          </h2>
          <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{showWeekly ? '▲ 收起' : '▼ 展开'}</span>
        </div>
        {showWeekly && (
          <div className="mt-4 space-y-2">
            <p style={{ ...pxSm, color: 'var(--oto-text-dim)' }}>
              本周 ({weekStart ? `${weekStart.slice(5).replace('-', '/')} - ${new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(5, 10).replace('-', '/')}` : ''}) 已获得{' '}
              <span style={{
                color: weekEarned >= weekTarget && weekTarget > 0 ? 'var(--oto-green)' : 'var(--oto-gold-dark)',
                fontWeight: 'bold',
              }}>{weekEarned}</span>
              /{weekTarget} 币
              {weekEarned >= weekTarget && weekTarget > 0 && <span style={{ marginLeft: 2 }}><Icon name="check" size={14} /></span>}
            </p>
            {weeklyTasks.map(t => {
              const pct = Math.min(t.progress / t.target * 100, 100);
              const isClaimed = t.claimed;
              const isComplete = t.progress >= t.target;
              return (
                <div key={t.key} className="oto-inset rounded-none! p-3"
                     style={{ opacity: isClaimed ? 0.5 : 1 }}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon name={t.icon as IconName} size={20} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ ...pxSm, fontWeight: 'bold' }}>{t.name}</span>
                        <span style={{ ...pxSm, color: 'var(--oto-gold-dark)', fontWeight: 'bold' }}>
                          +{t.amount} 币
                        </span>
                      </div>
                      <p style={{ ...pxSm, color: 'var(--oto-text-muted)', marginTop: 2 }}>
                        {t.desc}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span style={{ ...pxSm, color: isComplete ? 'var(--oto-green)' : 'var(--oto-text-dim)' }}>
                        {t.progress}/{t.target}
                      </span>
                      {isClaimed ? (
                        <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>已领取</span>
                      ) : t.can_claim ? (
                        <button onClick={() => handleClaimWeekly(t.key)}
                                className="oto-btn oto-btn-sm"
                                style={{ ...pxSm, padding: '2px 10px' }}>
                          领取
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="oto-progress" style={{ height: '6px' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: isComplete
                        ? 'linear-gradient(90deg, #4a8a4a, #6aaa6a)'
                        : 'linear-gradient(90deg, var(--oto-gold-dark), #d4b860)',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Earn Tokens (可多次完成) ── */}
      <div className="oto-window rounded-none! p-4">
        <div className="flex items-center justify-between cursor-pointer"
             onClick={() => { setShowRepeatable(!showRepeatable); if (!showRepeatable) getTodayCounts().then(setTodayCounts).catch(() => {}); }}>
          <h2 style={pxH3} className="m-0! flex items-center gap-2">
            <Icon name="tomato" size={16} /> 番茄钟任务
          </h2>
          <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{showRepeatable ? '▲ 收起' : '▼ 展开'}</span>
        </div>
        {showRepeatable && (
          <div className="mt-4 space-y-2">
            <p style={{ ...pxSm, color: 'var(--oto-text-dim)' }}>
              完成工作番茄钟即可获得代币，可无限次完成（代币分级奖励）
            </p>
            {(() => {
              const src = EARN_SOURCES.find(s => !s.daily)!;
              const done = todayCounts[src.desc] || 0;
              const tiers = [
                { name: '入门', range: '1-4', amount: 40, current: Math.min(done, 4), target: 4 },
                { name: '进阶', range: '5-8', amount: 50, current: Math.max(0, Math.min(done - 4, 4)), target: 4 },
                { name: '大师', range: '9+',  amount: 60, current: Math.max(0, done - 8), target: Infinity },
              ];
              return tiers.map((tier, idx) => {
                const isComplete = tier.target === Infinity ? tier.current > 0 : tier.current >= tier.target;
                const active = (idx === 0 && done > 0) || (idx === 1 && done > 4) || (idx === 2 && done > 8);
                const pct = tier.target === Infinity ? Math.min(tier.current * 12.5, 100) : Math.min(tier.current / tier.target * 100, 100);
                return (
                  <div key={tier.name} className="oto-inset rounded-none! p-3"
                       style={{ opacity: !active && idx > 0 ? 0.5 : 1 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon name={src.icon} size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span style={{ ...pxSm, fontWeight: 'bold' }}>
                            番茄钟 · {tier.name}（第 {tier.range} 个）
                          </span>
                          <span style={{
                            ...pxSm, fontWeight: 'bold',
                            color: active ? 'var(--oto-gold-dark)' : 'var(--oto-text-muted)',
                          }}>
                            +{tier.amount} 币/个
                          </span>
                        </div>
                        <p style={{ ...pxSm, color: 'var(--oto-text-muted)', marginTop: 2 }}>
                          本档完成第 {tier.range} 个番茄钟时按此档奖励
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span style={{
                          ...pxSm,
                          color: isComplete ? 'var(--oto-green)' : 'var(--oto-text-dim)',
                        }}>
                          {tier.target === Infinity ? `${tier.current}/∞` : `${tier.current}/${tier.target}`}
                        </span>
                        {isComplete && idx < 2 && (
                          <span style={{ ...pxSm, color: 'var(--oto-green)' }}><Icon name="check" size={14} /> 已达成</span>
                        )}
                      </div>
                    </div>
                    <div className="oto-progress" style={{ height: '6px' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: isComplete
                          ? 'linear-gradient(90deg, #4a8a4a, #6aaa6a)'
                          : 'linear-gradient(90deg, var(--oto-gold-dark), #d4b860)',
                        transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Pull Mechanics */}
      <div className="oto-window rounded-none! p-4">
        <div className="flex items-center justify-between cursor-pointer"
             onClick={() => setShowMechanics(!showMechanics)}>
          <h2 style={pxH3} className="m-0! flex items-center gap-2">
            <Icon name="bulb" size={16} /> 抽取机制
          </h2>
          <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{showMechanics ? '▲ 收起' : '▼ 展开'}</span>
        </div>
        {showMechanics && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="oto-inset rounded-none! p-3 text-center">
                <div style={{ marginBottom: 4, color: 'var(--oto-green)' }}>
                    <Icon name="star" size={24} />
                  </div>
                <div style={{ fontWeight: 'bold', color: 'var(--oto-green)', marginBottom: 4 }}>每日首免</div>
                <div style={{ ...pxSm, color: 'var(--oto-text-dim)', lineHeight: '1.6' }}>
                  每天首次单抽免费<br />不消耗代币
                </div>
              </div>
              <div className="oto-inset rounded-none! p-3 text-center">
                <div style={{ marginBottom: 4, color: 'var(--oto-gold-dark)' }}>
                    <Icon name="pity" size={24} />
                  </div>
                <div style={{ fontWeight: 'bold', color: 'var(--oto-gold-dark)', marginBottom: 4 }}>渐进保底</div>
                <div style={{ ...pxSm, color: 'var(--oto-text-dim)', lineHeight: '1.6' }}>
                  50 抽后每抽 +2%<br />4% → 6% → … → 100%
                </div>
              </div>
              <div className="oto-inset rounded-none! p-3 text-center">
                <div style={{ marginBottom: 4, color: '#4a90d9' }}>
                    <Icon name="gift" size={24} />
                  </div>
                <div style={{ fontWeight: 'bold', color: '#4a90d9', marginBottom: 4 }}>十连保底</div>
                <div style={{ ...pxSm, color: 'var(--oto-text-dim)', lineHeight: '1.6' }}>
                  十连不会全 N<br />至少包含 1 件 R+
                </div>
              </div>
              <div className="oto-inset rounded-none! p-3 text-center">
                <div style={{ marginBottom: 4, color: RARITY_COLOR_MAP.SSR }}>
                  <Icon name="lock" size={24} />
                </div>
                <div style={{ fontWeight: 'bold', color: RARITY_COLOR_MAP.SSR, marginBottom: 4 }}>SSR 锁定</div>
                <div style={{ ...pxSm, color: 'var(--oto-text-dim)', lineHeight: '1.6' }}>
                  300 抽解锁·每月一次<br />锁定后下次 SSR 必出
                </div>
              </div>
              <div className="oto-inset rounded-none! p-3 text-center">
                <div style={{ marginBottom: 4, color: 'var(--oto-red)' }}>
                    <Icon name="bars" size={24} />
                  </div>
                <div style={{ fontWeight: 'bold', color: 'var(--oto-red)', marginBottom: 4 }}>概率公示</div>
                <div style={{ ...pxSm, color: 'var(--oto-text-dim)', lineHeight: '1.6' }}>
                  SSR 2% · SR 8%<br />R 50% · N 40%
                </div>
              </div>
            </div>

            {/* Pity progress bar */}
            <div className="oto-inset rounded-none! p-3">
              <div className="flex items-center justify-between mb-2">
                <span style={{ ...pxSm, fontWeight: 'bold' }}>保底进度</span>
                <span style={{ ...pxSm, color: 'var(--oto-text-dim)' }}>
                  {pitySsr > 0
                    ? `${pitySsr} / 50 抽`
                    : '已重置'}
                </span>
              </div>
              <div className="oto-progress" style={{ height: '12px' }}>
                <div style={{
                  height: '100%', width: `${Math.min(pitySsr / 50 * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #c8a040, #d4b860)',
                  transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ ...pxSm, color: 'var(--oto-text-dim)', marginTop: 4, textAlign: 'center' }}>
                {pitySsr >= 50
                  ? <><Icon name="pity" size={14} /> 保底已触发！当前 SSR 概率 {Math.min(2 + (pitySsr - 49) * 2, 100)}%</>
                  : pitySsr > 0
                    ? `SSR 概率 2% · 距保底还差 ${50 - pitySsr} 抽`
                    : '最近一次已出 SSR · 概率 2%'}
              </div>
            </div>

            {/* SSR Target Lock */}
            <div className="oto-inset rounded-none! p-3" style={{
              borderColor: ssrTargetStatus?.eligible || ssrTargetStatus?.target
                ? RARITY_COLOR_MAP.SSR : 'var(--oto-border)',
            }}>
              <div className="flex items-center mb-2" style={{ gap: '6px' }}>
                <span style={{ ...pxSm, fontWeight: 'bold' }}>
                  <Icon name="lock" size={14} /> SSR 目标锁定
                </span>
                <span style={{ transform: 'translateY(-4px)' }}>
                {ssrTargetStatus?.target ? (
                  <span className="oto-badge" style={{
                    fontSize: '9px', padding: '0px 5px',
                    background: `${RARITY_COLOR_MAP.SSR}22`, color: RARITY_COLOR_MAP.SSR,
                    borderColor: RARITY_COLOR_MAP.SSR,
                  }}>已锁定</span>
                ) : ssrTargetStatus?.eligible && !ssrTargetStatus?.monthly_used ? (
                  <span className="oto-badge" style={{
                    fontSize: '9px', padding: '0px 5px',
                    background: 'transparent', color: 'var(--oto-green)',
                    borderColor: 'var(--oto-green)',
                  }}>可锁定</span>
                ) : ssrTargetStatus?.monthly_used ? (
                  <span className="oto-badge" style={{
                    fontSize: '9px', padding: '0px 5px',
                    background: 'transparent', color: 'var(--oto-red)',
                    borderColor: 'var(--oto-red)',
                  }}>不可锁定</span>
                ) : null}
                </span>
              </div>

              {ssrTargetStatus?.eligible ? (
                ssrTargetStatus.monthly_used && !ssrTargetStatus.target ? (
                  /* 本月已消费 — 不可锁定 */
                  <div className="flex items-center justify-between">
                    <span style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-dim)' }}>
                      本月已使用过 SSR 锁定，下月刷新后可再次使用
                    </span>
                    <span className="oto-btn oto-btn-sm" style={{
                      ...pxSm, fontSize: '11px', padding: '1px 10px',
                      opacity: 0.35, cursor: 'not-allowed',
                    }}>选择目标</span>
                  </div>
                ) : ssrTargetStatus.target ? (
                  /* 已锁定 */
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={itemImage({ rarity: 'SSR', job: ssrTargetStatus.target.target_item_job || 'CLERIC' })} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                      </span>
                      <span style={{ ...pxSm, color: RARITY_COLOR_MAP.SSR, fontWeight: 'bold' }}>
                        {ssrTargetStatus.target.target_item_name}
                      </span>
                      {ssrTargetStatus.target.target_item_job_display && (
                        <span style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)' }}>
                          {ssrTargetStatus.target.target_item_job_display}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-muted)', flex: 1 }}>
                        下次 SSR 必出此物品
                      </span>
                      <button
                        onClick={async () => {
                          await clearSSRTarget();
                          const d = await getSSRTargetStatus();
                          setSSRTargetStatus(d);
                        }}
                        className="oto-btn oto-btn-sm oto-btn-gray"
                        style={{ ...pxSm, fontSize: '11px', padding: '1px 8px' }}
                      >清除</button>
                    </div>
                  </div>
                ) : showSSRLock ? (
                  <div>
                    <div className="grid grid-cols-8 gap-2 mb-3">
                      {items.filter(i => i.rarity === 'SSR').map(item => (
                        <div key={item.id}
                          className="oto-inset rounded-none! p-2 text-center cursor-pointer hover:brightness-105"
                          style={{ borderColor: `${RARITY_COLOR_MAP.SSR}33` }}
                          onClick={async () => {
                            if (settingSSRTarget) return;
                            try {
                              setSettingSSRTarget(true);
                              await setSSRTarget(item.id);
                              const d = await getSSRTargetStatus();
                              setSSRTargetStatus(d);
                              setShowSSRLock(false);
                            } catch (e: any) { alert(e?.message || '设置失败'); }
                            finally { setSettingSSRTarget(false); }
                          }}
                        >
                          <div style={{ width: 32, height: 32, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={itemImage(item)} alt={item.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                          </div>
                          <div style={{ ...pxSm, fontSize: '10px', marginTop: 1 }}>{item.name}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setShowSSRLock(false)} className="oto-btn oto-btn-sm oto-btn-gray" style={{ ...pxSm, fontSize: '11px', padding: '1px 8px', width: '100%' }}>收起</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-muted)' }}>可指定一个 SSR 为下次必出目标</span>
                    <button onClick={() => setShowSSRLock(true)} disabled={settingSSRTarget} className="oto-btn oto-btn-sm" style={{ ...pxSm, fontSize: '11px', padding: '1px 10px', opacity: settingSSRTarget ? 0.5 : 1, cursor: settingSSRTarget ? 'not-allowed' : 'pointer' }}>选择目标</button>
                  </div>
                )
              ) : (
                <div>
                  <div className="oto-progress" style={{ height: '8px', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${Math.min((ssrTargetStatus?.total_pulls ?? 0) / 300 * 100, 100)}%`, background: 'linear-gradient(90deg, #a08040, #c8a040)', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-dim)', textAlign: 'center' }}>
                    本月 {ssrTargetStatus?.total_pulls ?? 0} / 300 抽 · 还差 {300 - (ssrTargetStatus?.total_pulls ?? 0)} 抽解锁
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collection Gallery */}
      <div className="oto-window rounded-none! p-4">
        <div className="flex items-center justify-between cursor-pointer"
             onClick={() => setShowCollection(!showCollection)}>
          <h2 style={pxH3} className="m-0! flex items-center gap-2">
            <Icon name="gallery" size={18} /> 本月已收集图鉴
          </h2>
          <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{showCollection ? '▲ 收起' : '▼ 展开'}</span>
        </div>
        {showCollection && (
          <div className="mt-3">
            <p className="mb-3" style={{
              fontSize: '11px',
              color: 'var(--oto-text-muted)',
              fontFamily: 'var(--oto-font-body)',
            }}>
              <Icon name="gallery" size={10} /> 本月收集图鉴月末自动清零（用于藏品室结算）
            </p>
        {rarityOrder.map(rarity => (
          <div key={rarity} className="mb-4">
            <h3 style={{
              ...pxSm, marginBottom: 8, paddingLeft: 4,
              color: RARITY_COLOR_MAP[rarity] || 'var(--oto-text)',
              fontWeight: 'bold',
            }}>
              {RARITY_MAP[rarity] || rarity} ({rarity})
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
              {grouped[rarity].map(item => {
                const owned = (item.owned_count ?? 0) > 0;
                return (
                  <div key={item.id} className="oto-window rounded-none! p-3 text-center"
                       onClick={() => owned && setSelectedItem(item)}
                       style={{
                         opacity: owned ? 1 : 0.45,
                         filter: owned ? 'none' : 'grayscale(1)',
                         borderColor: owned ? RARITY_COLOR_MAP[item.rarity] : 'var(--oto-border)',
                         cursor: owned ? 'pointer' : 'default',
                         transition: 'transform 0.15s, box-shadow 0.15s',
                       }}
                       onMouseEnter={e => { if (owned) { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 0 12px ${RARITY_COLOR_MAP[item.rarity]}44`; }}}
                       onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                    <div style={{ width: 48, height: 48, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {owned ? (
                        <img src={itemImage(item)} alt={item.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '2rem', color: 'var(--oto-text-muted)' }}>{owned ? item.emoji : '?'}</span>
                      )}
                    </div>
                    <div style={{ ...pxSm, fontWeight: 'bold', marginTop: 4 }}>{owned ? item.name : '???'}</div>
                    {owned && item.job_display && (
                      <div style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', marginTop: 1 }}>
                        {item.job_display}
                      </div>
                    )}
                    <div className="oto-badge mt-1" style={{
                      ...pxSm, fontSize: '10px', padding: '1px 6px',
                      background: owned ? `${RARITY_COLOR_MAP[item.rarity]}22` : 'var(--oto-bg-inset)',
                      color: RARITY_COLOR_MAP[item.rarity],
                      borderColor: RARITY_COLOR_MAP[item.rarity],
                    }}>
                      {RARITY_MAP[item.rarity]}
                    </div>
                    {owned && <div style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', marginTop: 2 }}>
                      ×{item.owned_count}
                    </div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
        )}
      </div>

      {/* Pull History */}
      <div className="oto-window rounded-none! p-4">
        <div className="flex items-center justify-between cursor-pointer"
             onClick={() => setShowHistory(!showHistory)}>
          <h2 style={pxH3} className="m-0! flex items-center gap-2">
            <Icon name="history" size={18} /> 抽取记录
          </h2>
          <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{showHistory ? '▲ 收起' : '▼ 展开'}</span>
        </div>
        {showHistory && (
          <div className="mt-3">
            <p style={{ ...pxSm, color: 'var(--oto-text-dim)', marginBottom: 8 }}>最近 20 条抽取记录</p>
            {records.length === 0 ? (
              <p style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>还没有抽取记录，快去试试手气吧！</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="oto-table oto-table-striped w-full" style={pxSm}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th style={{ width: '50px' }}>图标</th>
                      <th>物品</th>
                      <th style={{ width: '80px' }}>稀有度</th>
                      <th style={{ width: '160px' }}>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 20).map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--oto-text-muted)' }}>{i + 1}</td>
                        <td style={{ width: 36, height: 36 }}>
                          {r.item_image ? (
                            <img src={r.item_image} alt={r.item_name} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          ) : (
                            <img src={itemImage({ rarity: r.item_rarity || 'N', job: r.item_job || 'CLERIC' })} alt={r.item_name} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          )}
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{r.item_name}
                          {r.item_job_display && <span style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', marginLeft: 6 }}>{r.item_job_display}</span>}
                        </td>
                        <td>
                          <span className="oto-badge" style={{
                            ...pxSm, fontSize: '10px', padding: '1px 6px',
                            color: RARITY_COLOR_MAP[r.item_rarity || 'N'],
                            borderColor: RARITY_COLOR_MAP[r.item_rarity || 'N'],
                          }}>
                            {r.rarity_display || RARITY_MAP[r.item_rarity || 'N']}
                          </span>
                        </td>
                        <td style={{ color: 'var(--oto-text-muted)' }}>
                          {new Date(r.created_at).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pull Result Modal */}
      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'var(--oto-overlay-bg)' }}
             onClick={() => setShowResult(false)}>
          <div className="oto-modal oto-window-gold rounded-none! p-6 max-w-2xl w-[92vw] max-h-[85vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={pxH2} className="m-0! flex items-center gap-2">
                <Icon name="trophy" size={22} />
                {pullResult.length === 1 ? '获得物品' : '十连结果'}
              </h2>
              <button className="oto-btn oto-btn-sm oto-btn-gray" onClick={() => setShowResult(false)}>
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* SSR 锁定目标达成横幅 */}
            {pullMeta?.ssr_target_consumed && pullMeta.ssr_target_item && (
              <div className="oto-window-gold rounded-none! p-4 mb-4 text-center"
                   style={{ borderColor: RARITY_COLOR_MAP.SSR, boxShadow: `0 0 24px ${RARITY_COLOR_MAP.SSR}44` }}>
                <div style={{ width: 64, height: 64, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pullMeta.ssr_target_item.target_item_image ? (
                    <img src={pullMeta.ssr_target_item.target_item_image} alt="" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '3rem' }}>{pullMeta.ssr_target_item.target_item_emoji || '⭐'}</span>
                  )}
                </div>
                <div style={{ ...pxH3, color: RARITY_COLOR_MAP.SSR, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="target" size={20} /> 锁定目标达成！
                </div>
                <div style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
                  获得了 SSR 物品：{pullMeta.ssr_target_item.target_item_name}
                </div>
              </div>
            )}

            <div className={pullResult.length === 1
              ? 'flex justify-center mb-4'
              : 'grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4'
            }>
              {pullResult.map((r, i) => (
                <div key={i} className="oto-window rounded-none! p-3 text-center oto-scale-in"
                     style={{
                       borderColor: RARITY_COLOR_MAP[r.item_rarity || 'N'],
                       boxShadow: r.item_rarity === 'SSR' ? `0 0 20px ${RARITY_COLOR_MAP.SSR}66` :
                                  r.item_rarity === 'SR' ? `0 0 10px ${RARITY_COLOR_MAP.SR}44` :
                                  'none',
                       animationDelay: `${i * 0.08}s`,
                     }}>
                  <div style={{ width: pullResult.length === 1 ? 80 : 48, height: pullResult.length === 1 ? 80 : 48, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.item_image ? (
                      <img src={r.item_image} alt={r.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <img src={itemImage({ rarity: r.item_rarity || 'N', job: r.item_job || 'CLERIC' })} alt={r.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}
                  </div>
                  <div style={{ ...pxBody, fontWeight: 'bold', marginTop: 4 }}>{r.item_name}</div>
                  {r.item_job_display && (
                    <div style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', marginTop: 2, marginBottom: 4 }}>
                      {r.item_job_display}
                    </div>
                  )}
                  <span className="oto-badge mt-1" style={{
                    ...pxSm, fontSize: '10px', padding: '2px 8px',
                    color: RARITY_COLOR_MAP[r.item_rarity || 'N'],
                    borderColor: RARITY_COLOR_MAP[r.item_rarity || 'N'],
                  }}>
                    {r.rarity_display || RARITY_MAP[r.item_rarity || 'N']}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="oto-btn w-full"
              onClick={() => setShowResult(false)}
              style={pxBody}
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
             style={{ background: 'rgba(6,8,12,0.85)' }}
             onClick={() => setSelectedItem(null)}>
          <div className="oto-window rounded-none! p-6 w-full max-w-sm text-center"
               style={{ borderColor: RARITY_COLOR_MAP[selectedItem.rarity] }}
               onClick={e => e.stopPropagation()}>
            <div style={{ width: 80, height: 80, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedItem.image ? (
                <img src={selectedItem.image} alt={selectedItem.name} style={{ width: 80, height: 80, objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '4rem' }}>{selectedItem.emoji}</span>
              )}
            </div>
            <h3 style={{ ...pxH3, fontSize: '14px', color: 'var(--oto-text)', marginTop: 8 }}>{selectedItem.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="oto-badge" style={{
                ...pxSm, fontSize: '11px', padding: '2px 8px',
                background: `${RARITY_COLOR_MAP[selectedItem.rarity]}22`,
                color: RARITY_COLOR_MAP[selectedItem.rarity],
                borderColor: RARITY_COLOR_MAP[selectedItem.rarity],
              }}>
                {RARITY_MAP[selectedItem.rarity]}
              </span>
              {selectedItem.job_display && (
                <span style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-muted)' }}>{selectedItem.job_display}</span>
              )}
            </div>
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', marginTop: 12, lineHeight: 1.6 }}>
              {selectedItem.description}
            </p>
            <div style={{ ...pxSm, color: 'var(--oto-text-muted)', marginTop: 8 }}>
              本月拥有 ×{selectedItem.owned_count ?? 0}
            </div>
            <button onClick={() => setSelectedItem(null)}
                    className="oto-btn w-full mt-4" style={pxSm}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
