import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icons';
import { fetchProjects, fetchTasks, fetchTodayPlan, fetchPomodoroSessions, fetchReviews, fetchGachaRecords, getShowcaseCurrent } from '../services/api';

interface Quest {
  id: string; icon: IconName; title: string; subtitle: string; description: React.ReactNode;
  actionLabel: string; actionTo: string; color: string; bg: string;
  checkFn: () => Promise<boolean>;
}

function buildQuests(): Quest[] {
  return [
    {
      id: 'create-project', icon: 'folder', title: '第 1 步：创建你的第一个项目', subtitle: '项目管理',
      description: '项目是用来分组管理任务的容器。比如「课程学习」「个人提升」「实验室项目」。\n\n去创建一个新项目，给它起个名字、选个颜色。项目用彩色左边框标识，点击卡片可展开查看详情。',
      actionLabel: '去创建项目', actionTo: '/projects', color: '#b89848', bg: '#faf0e8',
      checkFn: async () => { try { const data = await fetchProjects(); return data.filter((p: any) => !p.name.startsWith('[示例]')).length > 0; } catch { return false; } },
    },
    {
      id: 'create-task', icon: 'task', title: '第 2 步：创建你的第一个任务', subtitle: '任务管理',
      description: '任务是你要完成的具体工作。每个任务可设定优先级、所属项目、预估番茄钟数和截止日期。\n\n去任务页面创建一个新任务，记得关联到刚才创建的项目。',
      actionLabel: '去创建任务', actionTo: '/tasks', color: '#b89848', bg: '#faf0e8',
      checkFn: async () => { try { const data = await fetchTasks(); return data.filter((t: any) => !t.name.startsWith('[示例]')).length > 0; } catch { return false; } },
    },
    {
      id: 'set-core-task', icon: 'target', title: '第 3 步：设定今日核心任务', subtitle: '每日计划 · 单核工作法',
      description: '单核工作法的核心动作：每天只选一个最重要的任务作为「核心任务」。\n\n去每日计划页面，从自定义下拉菜单中选一个核心任务（菜单中能看到优先级、状态和项目）。然后在「晨间规划」写下今天的目标。',
      actionLabel: '去设定核心任务', actionTo: '/daily-plans', color: '#687898', bg: '#e8e4f0',
      checkFn: async () => { try { const plan = await fetchTodayPlan(); return !!(plan && plan.core_task && !(plan as any).tasks?.name?.startsWith('[示例]')); } catch { return false; } },
    },
    {
      id: 'do-pomodoro', icon: 'tomato', title: '第 4 步：完成一个番茄钟', subtitle: '番茄钟 · 番茄工作法',
      description: <>番茄工作法的核心：25 分钟专注 + 5 分钟休息。{'\n\n'}去番茄钟页面，选择刚才创建的任务，点击 <Icon name="play" size={14} /> 开始按钮启动计时。完成后系统自动记录并更新任务的番茄钟计数，同时获得代币奖励。</>,
      actionLabel: '去开启番茄钟', actionTo: '/pomodoro', color: '#a05858', bg: '#f0e0e0',
      checkFn: async () => { try { const data = await fetchPomodoroSessions(); return data.filter((s: any) => !s.notes?.startsWith('[示例]') && !s.tasks?.name?.startsWith('[示例]')).length > 0; } catch { return false; } },
    },
    {
      id: 'complete-task', icon: 'check', title: '第 5 步：完成一个任务', subtitle: '任务管理',
      description: <>完成实际工作后，来标记任务状态。{'\n\n'}去任务页面，找到创建的任务，点击「<Icon name="check" size={14} /> 完成」按钮。完成后可以点击「<Icon name="undo" size={14} /> 回退」回到进行中状态。</>,
      actionLabel: '去完成任务', actionTo: '/tasks', color: '#689868', bg: '#e0ece0',
      checkFn: async () => { try { const data = await fetchTasks(); return data.filter((t: any) => t.status === 'DONE' && !t.name.startsWith('[示例]')).length > 0; } catch { return false; } },
    },
    {
      id: 'write-review', icon: 'notebook', title: '第 6 步：写一条笔记', subtitle: '笔记本',
      description: '笔记是持续进步的关键。花几分钟记录今天的收获、完成任务数、番茄钟数以及心得体会。\n\n去笔记本页面新建一条笔记（日记/周记/月记），把今天的体验写下来。不追求完美——一句话也可以是一条好笔记。',
      actionLabel: '去写笔记', actionTo: '/reviews', color: '#687898', bg: '#e8e4f0',
      checkFn: async () => { try { const data = await fetchReviews(); return data.filter((r: any) => !r.content?.startsWith('[示例]') && r.content?.trim() !== '').length > 0; } catch { return false; } },
    },
    {
      id: 'try-gacha', icon: 'joystick', title: '第 7 步：体验一次扭蛋', subtitle: '扭蛋机 · 游戏化激励',
      description: <>完成工作赚取代币后，来扭蛋机试试手气！{'\n\n'}每天首次单抽<strong>免费</strong>（不消耗代币）。单抽 50 币，十连 500 币。物品分 N/R/SR/SSR 四种稀有度，集齐全部 8 种 SSR 是终极目标。</>,
      actionLabel: '去体验扭蛋', actionTo: '/gacha', color: '#b89848', bg: '#f4e8d0',
      checkFn: async () => { try { const data = await fetchGachaRecords(); return data.length > 0; } catch { return false; } },
    },
    {
      id: 'check-showcase', icon: 'building', title: '第 8 步：查看藏品室', subtitle: '藏品室 · 成就系统',
      description: '藏品室展示你的成就：赏金猎人勋章（代币数）、番茄大厨怀表（番茄钟数）、卡牌大师奖杯（集齐稀有度）。\n\n去藏品室看看你的当前进度，记得点击「同步到月度记录」保存快照。',
      actionLabel: '去查看藏品室', actionTo: '/showcase', color: '#b89848', bg: '#f4e8d0',
      checkFn: async () => { try { await getShowcaseCurrent(); return true; } catch { return false; } },
    },
  ];
}

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxH3: React.CSSProperties = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', lineHeight: '1.8' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

export default function Onboarding() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);

  useEffect(() => { const qs = buildQuests(); setQuests(qs); checkAll(qs); }, []);

  const checkAll = async (qs?: Quest[]) => {
    const list = qs || quests; setChecking(true); const newCompleted = new Set<string>();
    for (const q of list) {
      // 限制完成顺序：前面的步骤未完成时，后续步骤不算完成
      const prevDone = list.indexOf(q) === 0 || newCompleted.has(list[list.indexOf(q) - 1].id);
      if (!prevDone) break;
      try { const ok = await q.checkFn(); if (ok) newCompleted.add(q.id); else break; } catch { break; }
    }
    setCompleted(newCompleted); setChecking(false);
  };

  const doneCount = completed.size; const totalCount = quests.length;
  const allDone = doneCount === totalCount && totalCount > 0;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const nextQuest = quests.find(q => !completed.has(q.id));

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header */}
      <div className="oto-window rounded-none! p-5 oto-card-stamped" style={{ borderColor: 'var(--oto-gold)', background: 'var(--oto-bg-card)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="graduate" size={20} /> 新手教程</h2>
            <p style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>8 步走完核心功能，亲手体验 monopomo</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="oto-window p-5">
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "'HYPixel'", fontSize: '10px', color: '#4a3020' }}>学习进度</span>
          <span style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>{progressPct}%</span>
        </div>
        <div className="oto-progress animate-progress-pulse">
          <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #689050, #78a860, #509030)' }} />
        </div>
        <div className="flex justify-between mt-2">
          {quests.map((q, i) => {
            const isDone = completed.has(q.id);
            const isCurrent = nextQuest?.id === q.id;
            const c = isDone ? 'var(--oto-green)' : isCurrent ? q.color : 'var(--oto-text-muted)';
            return (
              <div key={q.id} className="flex flex-col items-center">
                <div className="w-7 h-7 flex items-center justify-center font-bold"
                  style={{
                    fontFamily: 'var(--oto-font-body)', fontSize: '13px',
                    background: isDone ? '#38683018' : isCurrent ? `${q.color}18` : 'var(--oto-bg-inset)',
                    color: c,
                    border: `2px solid ${c}`,
                  }}>
                  {isDone ? <Icon name="check" size={14} /> : i + 1}
                </div>
                <span className="text-xs mt-0.5 hidden md:block" style={{ ...pxBody, fontSize: '12px', color: 'var(--oto-text-dim)' }}>{q.subtitle.split('·')[0].trim()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status text */}
      <div className="flex items-center justify-between">
        <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
          {checking ? <><Icon name="clock" size={14} /> 检查进度中...</> :
           allDone ? <><Icon name="star" size={14} /> 恭喜完成全部新手任务！现在你已经掌握了系统的所有核心功能。</> :
           `↓ 下一步：${nextQuest?.title || ''}`}
        </p>
        <button onClick={() => checkAll()} disabled={checking}
          className="oto-btn-sm"><Icon name="refresh" size={14} /> 刷新进度</button>
      </div>

      {/* Quest cards */}
      <div className="space-y-4">
        {quests.map(q => {
          const isDone = completed.has(q.id);
          const isNext = !isDone && nextQuest?.id === q.id;
          const isLocked = !isDone && !isNext;
          return (
            <div key={q.id} className="oto-window overflow-hidden relative"
              style={{ borderColor: isDone ? 'var(--oto-green)' : isNext ? 'var(--oto-gold)' : 'var(--oto-border-light)', opacity: isLocked ? 0.5 : 1 }}>
              {isDone && (
                <div className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center text-white text-lg z-10"
                  style={{ background: 'var(--oto-green)', border: '2px solid var(--oto-green)' }}><Icon name="check" size={14} /></div>
              )}
              <div className="flex">
                <div className="w-1.5 flex-shrink-0" style={{ background: isDone ? 'var(--oto-green)' : isNext ? 'var(--oto-gold)' : 'var(--oto-border-light)' }} />
                <div className="flex-1 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0 oto-inset"
                      style={{ opacity: isLocked ? 0.5 : 1 }}>
                      <Icon name={q.icon} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>{q.subtitle}</span>
                        {isNext && <span className="oto-badge animate-oto-pulse" style={{ background: '#f8f0e0', color: 'var(--oto-gold-dark)', borderColor: 'var(--oto-gold)' }}>当前任务</span>}
                        {isLocked && <span className="oto-badge" style={{ background: 'var(--oto-bg-inset)', color: 'var(--oto-text-muted)', borderColor: 'var(--oto-border-light)' }}><Icon name="lock" size={14} /> 等待前置</span>}
                      </div>
                      <h3 style={{ ...pxH3, fontSize: '10px', color: isDone ? 'var(--oto-text-muted)' : 'var(--oto-text)', textDecoration: isDone ? 'line-through' : 'none', marginBottom: '8px' }}>
                        {q.title}
                      </h3>
                      <div className="text-sm leading-relaxed whitespace-pre-line" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>{q.description}</div>
                    </div>
                    <div className="flex-shrink-0 self-center">
                      {isDone ? (
                        <span className="oto-badge" style={{ background: '#e8f0e4', color: 'var(--oto-green)', borderColor: 'var(--oto-green)' }}>已完成 <Icon name="check" size={14} /></span>
                      ) : isLocked ? (
                        <span className="oto-badge" style={{ background: 'var(--oto-bg-inset)', color: 'var(--oto-text-muted)', borderColor: 'var(--oto-border-light)' }}>请先完成上一步</span>
                      ) : (
                        <button onClick={() => navigate(q.actionTo)} className="oto-btn"
                          style={{ background: `${q.color}18`, color: q.color, borderColor: q.color }}>
                          {q.actionLabel} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion celebration */}
      {allDone && (
        <div className="rounded-none! p-8 text-center oto-splash-ring" style={{ background: 'var(--oto-bg-card)', border: '3px solid var(--oto-gold)' }}>
          <div className="text-6xl mb-4 animate-float"><Icon name="cup" size={48} /></div>
          <h3 style={{ ...pxH3, fontSize: '12px', color: 'var(--oto-gold-dark)' }}>全部完成！</h3>
          <p className="text-sm mb-4 leading-relaxed" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)' }}>
            你已经体验了系统的全部核心功能：<br/>
            项目管理 → 任务管理 → 每日计划 → 番茄钟 → 完成任务 → 笔记本 → 扭蛋机 → 藏品室
          </p>
          <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>
            现在去工作看板开始你真正的工作吧！
          </p>
        </div>
      )}

      {!allDone && nextQuest && (
        <div className="text-center py-4">
          <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }}><Icon name="bulb" size={14} /> 完成当前任务后，点击「<Icon name="refresh" size={14} /> 刷新进度」查看最新状态</p>
        </div>
      )}
    </div>
  );
}
