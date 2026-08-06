import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardStats, fetchTodayPlan, updateDailyPlan, addTokenRecord } from '../services/api';
import type { DashboardStats, DailyPlan } from '../types';
import { TASK_STATUS_MAP, DAILY_PLAN_STATUS_MAP } from '../types';
import StatusBadge from '../components/StatusBadge';
import PomodoroTimer from '../components/PomodoroTimer';
import Tutorial from '../components/Tutorial';
import Icon from '../components/Icons';

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxLabel: React.CSSProperties = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };
const pxBody: React.CSSProperties = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      fetchTodayPlan().catch(() => null),
    ]).then(([s, p]) => { setStats(s as any); setTodayPlan(p); setLoading(false); });
  }, []);

  const completePlan = async () => {
    if (!todayPlan) return;
    const updated = await updateDailyPlan(todayPlan.id, { status: 'COMPLETED' });
    setTodayPlan(updated);
    if (stats) setStats({ ...stats, today_plan: { ...stats.today_plan, status: 'COMPLETED', status_display: '已完成' } });
    // Token reward for daily plan completion
    addTokenRecord(60, '每日计划完成', true, true).catch(() => {});
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center animate-fade-in">
        <div className="animate-spin mb-4"><Icon name="loading" size={44} /></div>
        <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>加载看板数据...</p>
        <div className="flex justify-center gap-3 mt-6">
          <div className="oto-skeleton w-32 h-4" />
          <div className="oto-skeleton w-20 h-4" />
        </div>
      </div>
    </div>
  );
  if (!stats) return null;

  return (
    <div className="space-y-6 oto-stagger">
      {/* Page header */}
      <div className="oto-window rounded-none! p-4 flex items-center relative oto-card-stamped oto-weathered">
        <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="dashboard" size={20} /> 工作看板</h2>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="oto-badge oto-badge-blue">单核定方向</span>
          <span className="text-xs" style={{ color: 'var(--oto-text-muted)' }}>+</span>
          <span className="oto-badge oto-badge-red">番茄保执行</span>
        </div>
      </div>

      <Tutorial />

      {/* ═══ TOP ROW: Two methodology cards ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 单核工作法 Panel ── */}
        <div className="overflow-hidden flex flex-col oto-window oto-card-shimmer oto-inner-corners oto-pinned" style={{ borderColor: 'var(--oto-gold)' }}>
          <div className="oto-page-header-blue px-5 py-3 flex items-center justify-between" style={{ background: 'var(--oto-page-header-blue)' }}>
            <div className="flex items-center gap-2">
              <Icon name="target" size={22} />
              <div>
                <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', color: 'var(--oto-text)' }}>单核工作法</h3>
                <p style={{ fontFamily: "'HYPixel'", fontSize: '12px', color: 'var(--oto-text-dim)' }}>Monotasking Method</p>
              </div>
            </div>
            <span className="oto-badge" style={{ background: '#dce4f8', color: '#1a2a48', borderColor: '#6880b0' }}>战略层</span>
          </div>
          <div className="p-5 flex flex-col flex-1">
            <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: '#304868', ...pxLabel }}>
              今日核心任务 · ONE Thing
            </label>
            {todayPlan?.core_task ? (
              <div className="p-4 oto-window flex flex-col flex-1">
                <div className="flex items-start gap-3">
                  <Icon name="target" size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg break-words" style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }}>{todayPlan.core_task_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>
                        状态: {TASK_STATUS_MAP[todayPlan.core_task_status || ''] || todayPlan.core_task_status}
                      </span>
                      <StatusBadge label={DAILY_PLAN_STATUS_MAP[todayPlan.status] || todayPlan.status} status={todayPlan.status} />
                    </div>
                  </div>
                </div>
                {[
                  { key: 'morning_reflection' as const, label: <><Icon name="sun" size={14} /> 晨间规划</> },
                  { key: 'evening_review' as const, label: <><Icon name="moon" size={14} /> 晚间回顾</> },
                  { key: 'notes' as const, label: <><Icon name="notebook" size={14} /> 备注</> },
                ].map(({ key, label }, i) => {
                  return (
                    <Link key={key} to="/daily-plans" className={`block group cursor-pointer ${i > 0 ? 'mt-1.5' : 'mt-2'}`}>
                      <span className="text-xs mb-0.5" style={{ ...pxLabel, fontSize: '10px', color: 'var(--oto-text-muted)' }}>{label}</span>
                      <div className="p-3 oto-inset text-sm min-h-[68px]">
                        {todayPlan[key] ? (
                          <span style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{todayPlan[key]}</span>
                        ) : (
                          <span style={{ ...pxBody, fontSize: '15px', color: '#a08060' }}>
                            {i === 0 ? '去每日计划记录今天的计划吧' : i === 1 ? '完成核心任务之后回来总结吧' : '有什么需要备注的呢'}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {todayPlan?.core_task && (
                  <div className="flex justify-center gap-2 mt-auto pt-3 mx-8 mb-3">
                    {todayPlan.status === 'PLANNED' && (
                      <button onClick={completePlan} className="oto-btn oto-btn-green"><Icon name="check" size={14} /> 完成核心任务</button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 oto-inset text-center" style={{ border: '2px dashed #333' }}>
                <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>尚未设定今日核心任务</p>
                <Link to="/daily-plans" className="text-blue-400 text-xs hover:underline mt-1 inline-block">前往每日计划 → 设定核心任务</Link>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 pt-3 mt-auto" style={{ borderTop: '2px solid #1a2438' }}>
              {[
                { v: stats.tasks.todo, l: '待办任务' },
                { v: stats.tasks.in_progress, l: '进行中' },
                { v: stats.projects.active, l: '待办项目' },
              ].map(s => (
                <div key={s.l} className="text-center p-2 oto-inset">
                  <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '20px', fontWeight: 'bold', color: 'var(--oto-text-dim)' }}>{s.v}</p>
                  <p style={{ ...pxLabel, fontSize: '10px', color: '#a08060' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 番茄工作法 Panel ── */}
        <div className="overflow-hidden flex flex-col oto-window oto-card-shimmer oto-inner-corners oto-pinned" style={{ borderColor: 'var(--oto-gold)' }}>
          <div className="oto-page-header-red px-5 py-3 flex items-center justify-between" style={{ background: 'var(--oto-page-header-red)' }}>
            <div className="flex items-center gap-2">
              <Icon name="tomato" size={22} />
              <div>
                <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', color: 'var(--oto-text)' }}>番茄工作法</h3>
                <p style={{ fontFamily: "'HYPixel'", fontSize: '12px', color: 'var(--oto-text-dim)' }}>Pomodoro Technique</p>
              </div>
            </div>
            <span className="oto-badge" style={{ background: '#fce4dc', color: '#6a2018', borderColor: '#d09888' }}>执行层</span>
          </div>
          <div className="p-5 flex flex-col flex-1">
            <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: '#8a3030', ...pxLabel }}>
              专注计时 · 25分钟心流
            </label>
            <PomodoroTimer />
            <div className="grid grid-cols-3 gap-2 pt-3 mt-auto" style={{ borderTop: '2px solid #28181a' }}>
              {[
                { k: 'today', v: stats.pomodoros.today, l: <><Icon name="tomato" size={12} /> 今日</> },
                { k: 'this_week', v: stats.pomodoros.this_week, l: <><Icon name="tomato" size={12} /> 本周</> },
                { k: 'total', v: stats.pomodoros.total, l: <><Icon name="tomato" size={12} /> 总计</> },
              ].map(s => (
                <div key={s.k} className="text-center p-2 oto-inset">
                  <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '20px', fontWeight: 'bold', color: '#8a3030' }}>{s.v}</p>
                  <p style={{ ...pxLabel, fontSize: '10px', color: '#a08060' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="oto-chain-divider"><span>◆</span></div>

      {/* ═══ BOTTOM ROW: Task overview + Today's sessions ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task overview — 4 clickable status cards */}
        <div className="oto-window p-5 oto-card-stamped oto-stitch-corner">
          <h3 className="oto-title-flourish" style={{ ...pxH2, fontSize: '11px', color: 'var(--oto-text)' }}><Icon name="task" size={14} /> 任务总览</h3>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: '全部', value: stats.tasks.total, icon: 'archive' as const, status: '' },
              { label: '待办', value: stats.tasks.todo, icon: 'pin' as const, status: 'TODO' },
              { label: '进行中', value: stats.tasks.in_progress, icon: 'refresh' as const, status: 'IN_PROGRESS' },
              { label: '已完成', value: stats.tasks.completed, icon: 'check' as const, status: 'DONE' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(`/tasks?status=${item.status}`)}
                className="text-left p-4 oto-window cursor-pointer group oto-card-lift">
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ ...pxLabel, fontSize: '10px', color: 'var(--oto-text-muted)' }}>{item.label}</p>
                    <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '24px', fontWeight: 'bold', color: 'var(--oto-text-dim)', marginTop: '2px' }}>{item.value}</p>
                  </div>
                  <Icon name={item.icon} size={28} className="opacity-50 group-hover:opacity-100" />
                </div>
                <p style={{ fontFamily: "'HYPixel'", fontSize: '12px', color: '#a08060', marginTop: '8px', opacity: 0 }} className="group-hover:opacity-100">点击查看 →</p>
              </button>
            ))}
          </div>
        </div>

        {/* Today's sessions */}
        <div className="oto-window p-5 oto-card-stamped oto-stitch-corner">
          <h3 className="oto-title-flourish" style={{ ...pxH2, fontSize: '11px', color: 'var(--oto-text)' }}><Icon name="tomato" size={14} /> 今日番茄记录</h3>
          <div className="mt-4">
            {stats.today_sessions.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {stats.today_sessions.map(s => (
                  <div key={s.id} className="flex items-center py-2 hover:brightness-105 transition-all" style={{
                    borderBottom: '1px solid var(--oto-border-light)',
                    borderLeft: `3px solid ${s.type === 'WORK' ? '#8a3030' : s.type === 'SHORT_BREAK' ? '#406838' : '#304868'}`,
                    paddingLeft: '8px',
                  }}>
                    <div className="min-w-0 flex-1">
                      <p style={{ ...pxBody, fontSize: '16px', color: '#4a3020', fontWeight: 500 }} className="break-words">{(s as any).tasks?.name || (s as any).task_name || '未知任务'}</p>
                      <p style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-muted)' }}>
                        {new Date(s.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        {s.end_time && ` - ${new Date(s.end_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    <div className="ml-3 mr-6">
                      <StatusBadge label={s.type === 'WORK' ? `${s.duration_minutes}min` : '休息'} status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }} className="text-center py-8">今天还没有番茄钟记录，开始你的第一个专注吧！</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary rows ── */}
      {[
        { title: <><Icon name="sun" size={14} /> 本日摘要</>, tKey: 'today_completed' as const, pKey: 'today' as const, pMax: 8 },
        { title: <><Icon name="bars" size={14} /> 本周摘要</>, tKey: 'week_completed' as const, pKey: 'this_week' as const, pMax: 40 },
        { title: <><Icon name="bars" size={14} /> 本月摘要</>, tKey: 'month_completed' as const, pKey: 'this_month' as const, pMax: 160 },
      ].map(row => (
        <div key={row.pKey} className="oto-window p-5 oto-card-lift">
          <h3 style={{ ...pxH2, fontSize: '10px', color: 'var(--oto-text)', marginBottom: '12px' }}>{row.title}</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="flex items-center gap-3">
              <div className="flex-1 oto-progress">
                <div className="animate-progress-pulse" style={{ width: `${Math.min(((stats.tasks as any)[row.tKey] || 0) / Math.max(stats.tasks.total, 1) * 100, 100)}%`, backgroundColor: '#304868' }} />
              </div>
              <span style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }} className="whitespace-nowrap">完成 {(stats.tasks as any)[row.tKey] || 0} 个任务</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 oto-progress">
                <div className="animate-progress-pulse" style={{ width: `${Math.min(((stats.pomodoros as any)[row.pKey] || 0) / Math.max(row.pMax, 1) * 100, 100)}%`, backgroundColor: '#8a3030' }} />
              </div>
              <span style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }} className="whitespace-nowrap">{(stats.pomodoros as any)[row.pKey] || 0} 个番茄钟</span>
            </div>
          </div>
        </div>
      ))}


    </div>
  );
}
