import { useEffect, useState, useMemo, useRef } from 'react';
import { fetchDailyPlans, fetchTodayPlan, updateDailyPlan, deleteDailyPlan, fetchTasks, addTokenRecord } from '../services/api';
import type { DailyPlan, Task } from '../types';
import { DAILY_PLAN_STATUS_MAP, TASK_STATUS_MAP, PRIORITY_MAP } from '../types';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icons';
import type { IconName } from '../components/Icons';
import { useOnboarding } from '../contexts/OnboardingContext';

const STATUS_DOT: Record<string, string> = { UNPLANNED: '#222', PLANNED: '#687898', COMPLETED: '#689050', FAILED: '#a03038', REVIEWED: '#786890' };
const STATUS_BG: Record<string, string> = { UNPLANNED: 'transparent', PLANNED: '#e8e4f0', COMPLETED: '#e0ece0', FAILED: '#f0e0e0', REVIEWED: '#ece4f0' };
const STATUS_BORDER: Record<string, string> = { UNPLANNED: 'transparent', PLANNED: '#a098b8', COMPLETED: '#90b090', FAILED: '#c08080', REVIEWED: '#a898b8' };

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };

export default function DailyPlans() {
  const { activeQuest, completeQuest } = useOnboarding();
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // 文本框本地草稿 + 防抖计时器，避免每次按键都发 PATCH
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = () => {
    fetchDailyPlans().then(setPlans);
    fetchTodayPlan().then(setTodayPlan).catch(() => {});
    fetchTasks().then(d => { const active = (Array.isArray(d) ? d : []).filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS'); setAllTasks(active); }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!taskDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTaskDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [taskDropdownOpen]);

  const planMap = useMemo(() => { const m: Record<string, DailyPlan> = {}; for (const p of plans) m[p.date] = p; return m; }, [plans]);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const monthLabel = `${calYear}年${calMonth + 1}月`;

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); setSelectedDate(null); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); setSelectedDate(null); };
  const selectedPlan = selectedDate ? planMap[selectedDate] : null;
  const selectedPlanVisible = selectedPlan && selectedPlan.status !== 'UNPLANNED' ? selectedPlan : null;

  const handleSetCoreTask = async (taskId: string | null) => {
    if (!todayPlan) return; setSaving(true);
    await updateDailyPlan(todayPlan.id, { core_task_id: taskId });
    // 新手教程：只有从新手教程跳过来时才算设定核心任务步骤完成
    if (taskId && activeQuest?.id === 'set-core-task') completeQuest('set-core-task');
    const updated = await fetchTodayPlan(); setTodayPlan(updated); load(); setSaving(false);
    if (taskId) addTokenRecord(20, '确定核心任务', true, true).catch(() => {});
  };
  const handleUpdatePlan = async (field: string, value: string) => {
    if (!todayPlan) return; setSaving(true);
    await updateDailyPlan(todayPlan.id, { [field]: value });
    const updated = await fetchTodayPlan(); setTodayPlan(updated); setSaving(false);
    setDrafts(prev => { const next = { ...prev }; delete next[field]; return next; });
    if (field === 'morning_reflection' && value.trim()) {
      addTokenRecord(40, '晨间规划', true, true).catch(() => {});
    }
    if (field === 'evening_review' && value.trim()) {
      addTokenRecord(40, '晚间回顾', true, true).catch(() => {});
    }
  };

  // 输入时只更新本地草稿，停止输入 800ms 后才真正保存
  const handleDraftChange = (field: string, value: string) => {
    setDrafts(prev => ({ ...prev, [field]: value }));
    if (draftTimers.current[field]) clearTimeout(draftTimers.current[field]);
    draftTimers.current[field] = setTimeout(() => {
      handleUpdatePlan(field, value);
    }, 800);
  };

  // 失焦立即保存，避免用户切走时丢失未保存的输入
  const handleDraftBlur = (field: string) => {
    const pending = draftTimers.current[field];
    if (!pending) return;
    clearTimeout(pending);
    delete draftTimers.current[field];
    const value = drafts[field];
    if (value !== undefined) handleUpdatePlan(field, value);
  };

  // 卸载时清理所有未触发的计时器
  useEffect(() => {
    const timers = draftTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);
  const handleStatusChange = async (status: DailyPlan['status']) => {
    if (!todayPlan) return;
    await updateDailyPlan(todayPlan.id, { status }); const updated = await fetchTodayPlan(); setTodayPlan(updated);
    if (status === 'COMPLETED') {
      addTokenRecord(60, '每日计划完成', true, true).catch(() => {});
    }
  };
  const handleDelete = async (id: string) => { if (!confirm('确定删除此计划？')) return; await deleteDailyPlan(id); load(); };

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header — matches original gradient→solid pixel header */}
      <div className="oto-window oto-page-header-blue rounded-none! p-5 oto-card-shimmer oto-card-stamped relative" style={{ background: 'var(--oto-page-header-blue)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="target" size={20} /> 每日计划</h2>
            <p className="hidden md:block" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>单核工作法 · 每天只聚焦一件最重要的事</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>单核工作法</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', marginTop: '2px' }}>每天只聚焦一件最重要的事</p>
          </div>
          <span className="oto-badge oto-badge-blue absolute top-7 right-7 md:static">战略层</span>
        </div>
      </div>

      {/* Today's Plan card */}
      <div className="oto-window p-6">
        <h3 className="font-bold mb-4 flex items-center gap-3" style={{ ...pxH2, fontSize: '12px', color: 'var(--oto-text)' }}>
          <Icon name="target" size={16} /> 今日计划
          {todayPlan && <StatusBadge label={DAILY_PLAN_STATUS_MAP[todayPlan.status] || todayPlan.status} status={todayPlan.status} />}
        </h3>

        {/* Core task selection */}
        <div className="mb-4">
          <label className="text-sm block mb-2" style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-dim)' }}>
            <span className="oto-quest-marker" style={{ width: '16px', height: '16px', fontSize: '10px', marginRight: '6px', verticalAlign: 'middle' }}>!</span><Icon name="target" size={14} /> 核心任务<br className="md:hidden" /><span className="md:hidden" style={{ fontSize: '9px' }}>（「未计划」状态下可选，仅限「待办」或「进行中」状态的任务）</span><span className="hidden md:inline">（「未计划」状态下可选，仅限「待办」或「进行中」状态的任务）</span>
          </label>
          {allTasks.length === 0 ? (
            <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无可选任务，请先在任务管理中创建</p>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => todayPlan?.status === 'UNPLANNED' && setTaskDropdownOpen(!taskDropdownOpen)}
                className={`oto-select w-full text-left flex items-center justify-between ${todayPlan?.status !== 'UNPLANNED' ? 'opacity-70 cursor-default' : ''}`}>
                {todayPlan?.core_task_id ? (() => {
                  const t = allTasks.find(x => x.id === todayPlan.core_task_id);
                  return (
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium" style={{ color: 'var(--oto-text)' }}>{(todayPlan.tasks?.name?.length ?? 0) > 20 ? todayPlan.tasks?.name?.slice(0, 20) + '…' : todayPlan.tasks?.name}</span>
                      {t && <span className="flex items-center gap-1 flex-shrink-0">
                        <StatusBadge label={PRIORITY_MAP[t.priority]} status={t.priority} />
                        <StatusBadge label={TASK_STATUS_MAP[t.status]} status={t.status} />
                        {t.project_name && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--oto-text-dim)' }}><span className="w-1.5 h-1.5" style={{ backgroundColor: t.project_color }} />{t.project_name.length > 20 ? t.project_name.slice(0, 20) + '…' : t.project_name}</span>}
                      </span>}
                    </span>
                  );
                })() : <span style={{ color: 'var(--oto-text-muted)' }}>-- 暂不设置核心任务 --</span>}
              </button>
              {taskDropdownOpen && todayPlan?.status === 'UNPLANNED' && (
                <div className="absolute z-20 mt-1 w-full oto-window overflow-auto max-h-64" style={{ background: 'var(--oto-bg-card)' }}>
                  <button type="button" onMouseDown={() => { handleSetCoreTask(null); setTaskDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800" style={{ ...pxBody, color: 'var(--oto-text-dim)', borderBottom: '1px solid var(--oto-border-light)' }}>
                    -- 暂不设置核心任务 --
                  </button>
                  {allTasks.map(t => (
                    <button key={t.id} type="button" onMouseDown={() => { handleSetCoreTask(t.id); setTaskDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-900/30 flex items-center justify-between gap-2 ${todayPlan?.core_task_id === t.id ? 'bg-blue-900/20' : ''}`}
                      style={pxBody}>
                      <span className="font-medium truncate" style={{ color: 'var(--oto-text)' }}>{t.name.length > 20 ? t.name.slice(0, 20) + '…' : t.name}</span>
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <StatusBadge label={PRIORITY_MAP[t.priority]} status={t.priority} />
                        <StatusBadge label={TASK_STATUS_MAP[t.status]} status={t.status} />
                        {t.project_name && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--oto-text-dim)' }}><span className="w-1.5 h-1.5" style={{ backgroundColor: t.project_color }} />{t.project_name.length > 20 ? t.project_name.slice(0, 20) + '…' : t.project_name}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reflection fields */}
        {[
          { icon: 'sun', label: '晨间规划', field: 'morning_reflection', rows: 3, ph: '今天的目标是什么？准备如何安排？' },
          { icon: 'moon', label: '晚间回顾', field: 'evening_review', rows: 3, ph: '今天完成了什么？有什么收获和反思？' },
          { icon: 'notebook', label: '备注', field: 'notes', rows: 2, ph: '额外备注' },
        ].map(f => (
          <div key={f.field} className="mb-4">
            <label className="text-sm block mb-1" style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-text-dim)' }}><Icon name={f.icon as IconName} size={14} /> {f.label}</label>
            <textarea value={drafts[f.field] ?? (todayPlan?.[f.field as keyof DailyPlan] as string) ?? ''}
              onChange={e => handleDraftChange(f.field, e.target.value)}
              onBlur={() => handleDraftBlur(f.field)} rows={f.rows}
              className="oto-textarea w-full placeholder:text-[14px] md:placeholder:text-[15px]" placeholder={f.ph} />
          </div>
        ))}

        {/* Status actions */}
        <div className="flex gap-2 items-center flex-wrap">
          {todayPlan?.status === 'UNPLANNED' && (
            <button onClick={() => handleStatusChange('PLANNED')} className="oto-btn text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="target" size={14} /> 开始计划</button>
          )}
          {todayPlan?.status === 'PLANNED' && (<>
            <button onClick={() => handleStatusChange('COMPLETED')} className="oto-btn oto-btn-green text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="check" size={14} /> 完成计划</button>
            <button onClick={() => handleStatusChange('FAILED')} className="oto-btn oto-btn-red text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="close" size={14} /> 标记未完成</button>
            <button onClick={() => handleStatusChange('UNPLANNED')} className="oto-btn oto-btn-gray text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="undo" size={14} /> 回退</button>
          </>)}
          {todayPlan?.status === 'COMPLETED' && (<>
            <button onClick={() => handleStatusChange('REVIEWED')} className="oto-btn text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="notebook" size={14} /> 标记已回顾</button>
            <button onClick={() => handleStatusChange('PLANNED')} className="oto-btn oto-btn-gray text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="undo" size={14} /> 回退</button>
          </>)}
          {todayPlan?.status === 'FAILED' && (
            <button onClick={() => handleStatusChange('PLANNED')} className="oto-btn oto-btn-gray text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="undo" size={14} /> 回退</button>
          )}
          {todayPlan?.status === 'REVIEWED' && (
            <button onClick={() => handleStatusChange('COMPLETED')} className="oto-btn oto-btn-gray text-xs! px-2! py-1! md:text-base! md:px-4! md:py-2!"><Icon name="undo" size={14} /> 回退</button>
          )}
          {saving && <span className="text-xs self-center" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>保存中...</span>}
        </div>
      </div>

      <hr className="oto-hr-ornament" />

      {/* Calendar History — matches original structure */}
      <div className="oto-window overflow-hidden oto-card-stamped">
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 items-center gap-2 md:gap-0" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
          <h3 style={{ ...pxH2, fontSize: '12px', color: 'var(--oto-text)' }}><Icon name="calendar" size={16} /> 历史计划</h3>
          <div className="flex items-center justify-center gap-3">
            <button onClick={prevMonth} className="oto-btn-sm"><Icon name="arrowLeft" size={14} /></button>
            <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', color: '#4a3020' }}>{monthLabel}</span>
            <button onClick={nextMonth} className="oto-btn-sm"><Icon name="arrowRight" size={14} /></button>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-3 flex-wrap" style={{ ...pxBody, fontSize: '10px', color: 'var(--oto-text-muted)' }}>
            {Object.entries({ UNPLANNED: '未计划', PLANNED: '已计划', COMPLETED: '已完成', FAILED: '未完成', REVIEWED: '已回顾' }).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1"><span className="w-1 h-1 md:w-1.5 md:h-1.5" style={{ backgroundColor: STATUS_DOT[k] }} />{v}</span>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 mb-1">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-center text-xs font-medium py-2" style={{ fontFamily: 'var(--oto-font-body)', fontSize: '11px', color: 'var(--oto-text-muted)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px" style={{ background: '#d4b860' }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} className="min-h-[40px] md:min-h-[64px]" style={{ background: '#e8d4a8' }} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const plan = planMap[dateStr];
              const planVisible = plan && plan.status !== 'UNPLANNED' ? plan : null;
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const isSelected = dateStr === selectedDate;
              return (
                <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className="oto-cal-day min-h-[40px] md:min-h-[64px] p-1 md:p-1.5 text-left relative"
                  style={{
                    background: planVisible ? (STATUS_BG[planVisible.status] || 'var(--oto-bg-inset)') : 'var(--oto-bg-inset)',
                    border: planVisible ? `1px solid ${STATUS_BORDER[planVisible.status] || '#d4b860'}` : '1px solid transparent',
                    outline: isSelected ? '2px solid #4da6ff' : 'none', outlineOffset: '-2px',
                  }}>
                  <div className="flex items-center gap-1 md:flex md:justify-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 text-xs font-medium flex-shrink-0"
                      style={{
                        fontFamily: 'var(--oto-font-body)', fontSize: '11px',
                        background: isToday ? '#687898' : 'transparent',
                        color: isToday ? '#fff' : planVisible ? '#aaa' : '#556',
                        boxShadow: isToday ? '0 0 0 4px rgba(104,120,152,0.2)' : 'none',
                      }}>
                      {day}
                    </span>
                    {planVisible && (
                      <span className="inline-block w-1.5 h-1.5 md:w-2 md:h-2 flex-shrink-0 md:hidden" style={{ backgroundColor: STATUS_DOT[planVisible.status] || '#556' }} />
                    )}
                  </div>
                  <div className="mt-0.5 hidden md:block text-center">
                    <p className="text-xs truncate mt-0.5 leading-tight" style={{ ...pxBody, fontSize: '11px', color: 'var(--oto-text-dim)', opacity: planVisible ? 1 : 0.4 }}>{planVisible?.tasks?.name || '未计划'}</p>
                  </div>
                  {/* 桌面端：状态方点移至右上角（计划/未计划都显示） */}
                  <span className="hidden md:block absolute top-1 right-1 w-1.5 h-1.5" style={{ backgroundColor: planVisible ? (STATUS_DOT[planVisible.status] || '#556') : '#222' }} />
                  {planVisible && planVisible.tasks?.name && (
                    <p className="text-xs mt-0.5 leading-tight md:hidden line-clamp-2" style={{ ...pxBody, fontSize: '10px', color: 'var(--oto-text-dim)' }}>{planVisible.tasks?.name}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date detail */}
        {selectedPlanVisible && (
          <div className="p-5 oto-inset" style={{ borderTop: '1px solid var(--oto-border-light)' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold flex items-center gap-2" style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', color: 'var(--oto-text)' }}>
                <Icon name="calendar" size={16} /> {selectedDate}
                <StatusBadge label={DAILY_PLAN_STATUS_MAP[selectedPlanVisible.status] || selectedPlanVisible.status} status={selectedPlanVisible.status} />
              </h4>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(selectedPlanVisible.id)} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /></button>
                <button onClick={() => setSelectedDate(null)} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={12} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs block mb-1" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}><Icon name="target" size={14} /> 核心任务</label>
                <p className="text-sm font-medium break-words cursor-pointer" style={{ ...pxBody, color: '#4a3020', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} onClick={(e) => { const el = e.currentTarget; if (el.style.webkitLineClamp === 'none') { el.style.webkitLineClamp = '1'; } else { el.style.webkitLineClamp = 'none'; } }}>{selectedPlanVisible.tasks?.name || <span style={{ color: '#a08060' }}>未设置</span>}</p>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}><Icon name="tomato" size={14} /> 番茄钟</label>
                <p className="text-sm" style={{ ...pxBody, color: '#4a3020' }}>{selectedPlanVisible.work_pomodoros_today ?? 0} 个</p>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {[{ icon: 'sun' as const, label: '晨间规划', key: 'morning_reflection' }, { icon: 'moon' as const, label: '晚间回顾', key: 'evening_review' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs block mb-1" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}><Icon name={f.icon as IconName} size={14} /> {f.label}</label>
                  <p className="text-sm whitespace-pre-wrap break-words cursor-pointer" style={{ ...pxBody, color: 'var(--oto-text-dim)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} onClick={(e) => { const el = e.currentTarget; el.style.webkitLineClamp = el.style.webkitLineClamp === 'none' ? '3' : 'none'; }}>{(selectedPlanVisible as any)[f.key] || '—'}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--oto-border-light)' }}>
              <label className="text-xs block mb-1" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}><Icon name="notebook" size={14} /> 备注</label>
              <p className="text-sm whitespace-pre-wrap break-words cursor-pointer" style={{ ...pxBody, color: 'var(--oto-text-dim)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} onClick={(e) => { const el = e.currentTarget; el.style.webkitLineClamp = el.style.webkitLineClamp === 'none' ? '3' : 'none'; }}>{selectedPlanVisible.notes || '—'}</p>
            </div>
          </div>
        )}
        {!selectedPlanVisible && selectedDate && (
          <div className="p-5 text-center" style={{ borderTop: '1px solid var(--oto-border-light)', ...pxBody, color: 'var(--oto-text-muted)' }}>
            该日期暂无计划记录
            <button onClick={() => setSelectedDate(null)} className="ml-2 text-blue-400 hover:underline">关闭</button>
          </div>
        )}
      </div>
    </div>
  );
}
