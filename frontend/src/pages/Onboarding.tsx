import { useState, useEffect } from 'react';
import Icon, { type IconName } from '../components/Icons';
import WelcomeModal from '../components/WelcomeModal';
import { useOnboarding } from '../contexts/OnboardingContext';

interface Quest {
  id: string; icon: IconName; title: string; subtitle: string; description: React.ReactNode;
  actionLabel: string; actionTo: string; color: string; bg: string;
}

function buildQuests(): Quest[] {
  return [
    {
      id: 'create-project', icon: 'folder', title: '第 1 步：创建你的第一个项目', subtitle: '项目管理',
      description: '项目是用来分组管理任务的容器。比如「课程学习」「个人提升」「实验室项目」。\n\n去创建一个新项目，给它起个名字、选个颜色。项目用彩色左边框标识，点击卡片可展开查看详情。',
      actionLabel: '去创建项目', actionTo: '/projects', color: '#b89848', bg: '#faf0e8',
    },
    {
      id: 'create-task', icon: 'task', title: '第 2 步：创建你的第一个任务', subtitle: '任务管理',
      description: '任务是你要完成的具体工作。每个任务可设定优先级、所属项目、预估番茄钟数和截止日期。\n\n去任务页面创建一个新任务，记得关联到刚才创建的项目。',
      actionLabel: '去创建任务', actionTo: '/tasks', color: '#b89848', bg: '#faf0e8',
    },
    {
      id: 'set-core-task', icon: 'target', title: '第 3 步：设定今日核心任务', subtitle: '每日计划 · 单核工作法',
      description: '单核工作法的核心动作：每天只选一个最重要的任务作为「核心任务」。\n\n去每日计划页面，从自定义下拉菜单中选一个核心任务（菜单中能看到优先级、状态和项目）。然后在「晨间规划」写下今天的目标。',
      actionLabel: '去设定核心任务', actionTo: '/daily-plans', color: '#687898', bg: '#e8e4f0',
    },
    {
      id: 'do-pomodoro', icon: 'tomato', title: '第 4 步：开启一个番茄钟', subtitle: '番茄钟 · 番茄工作法',
      description: <>番茄工作法的核心：25 分钟专注 + 5 分钟休息。{'\n\n'}去番茄钟页面，选择刚才创建的任务，点击 <Icon name="play" size={14} /> 开始按钮启动计时（启动即算完成本步骤）。系统会自动开始记录，完成后更新任务的番茄钟计数并发放代币奖励。</>,
      actionLabel: '去开启番茄钟', actionTo: '/pomodoro', color: '#a05858', bg: '#f0e0e0',
    },
    {
      id: 'complete-task', icon: 'check', title: '第 5 步：完成一个任务', subtitle: '任务管理',
      description: <>完成实际工作后，来标记任务状态。{'\n\n'}去任务页面，找到创建的任务，点击「<Icon name="check" size={14} /> 完成」按钮。完成后可以点击「<Icon name="undo" size={14} /> 回退」回到进行中状态。</>,
      actionLabel: '去完成任务', actionTo: '/tasks', color: '#689868', bg: '#e0ece0',
    },
    {
      id: 'write-review', icon: 'notebook', title: '第 6 步：写一条笔记', subtitle: '笔记本',
      description: '笔记是持续进步的关键。花几分钟记录今天的收获、完成任务数、番茄钟数以及心得体会。\n\n去笔记本页面新建一条笔记（日记/周记/月记），把今天的体验写下来。不追求完美——一句话也可以是一条好笔记。',
      actionLabel: '去写笔记', actionTo: '/reviews', color: '#687898', bg: '#e8e4f0',
    },
    {
      id: 'try-gacha', icon: 'joystick', title: '第 7 步：体验一次扭蛋', subtitle: '扭蛋机 · 游戏化激励',
      description: <>完成工作赚取代币后，来扭蛋机试试手气！{'\n\n'}每天首次单抽<strong>免费</strong>（不消耗代币）。单抽 50 币，十连 500 币。物品分 N/R/SR/SSR 四种稀有度，集齐全部 8 种 SSR 是终极目标。</>,
      actionLabel: '去体验扭蛋', actionTo: '/gacha', color: '#b89848', bg: '#f4e8d0',
    },
    {
      id: 'check-showcase', icon: 'building', title: '第 8 步：查看藏品室', subtitle: '藏品室 · 成就系统',
      description: '藏品室展示你的成就：赏金猎人勋章（代币数）、番茄大厨怀表（番茄钟数）、卡牌大师奖杯（集齐稀有度）。\n\n去藏品室看看你的当前进度，记得点击「同步到月度记录」保存快照。',
      actionLabel: '去查看藏品室', actionTo: '/showcase', color: '#b89848', bg: '#f4e8d0',
    },
  ];
}

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxH3: React.CSSProperties = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', lineHeight: '1.8' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

export default function Onboarding() {
  const { startQuest, completedQuestIds } = useOnboarding();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(() => completedQuestIds());
  const [showWelcome, setShowWelcome] = useState(false);

  // 每次进入页面，从 localStorage 重新读取已完成的步骤集合
  // （由目标页面通过 completeQuest 写入；不基于数据自动检测）
  useEffect(() => {
    setQuests(buildQuests());
    setCompleted(completedQuestIds());
  }, []);

  const restartTutorial = () => {
    // 清空所有已完成步骤，从头开始
    try { localStorage.setItem('onboarding_completed', '[]'); } catch { /* ignore */ }
    setCompleted(new Set());
    // 在教程开始前弹出欢迎弹窗
    setShowWelcome(true);
  };

  const doneCount = completed.size; const totalCount = quests.length;
  const allDone = doneCount === totalCount && totalCount > 0;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const nextQuest = quests.find(q => !completed.has(q.id));

  return (
    <div className="space-y-6 oto-stagger overflow-x-hidden">
      {/* Header */}
      <div className="oto-window rounded-none! p-5 oto-card-stamped" style={{ borderColor: 'var(--oto-gold)', background: 'var(--oto-bg-card)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="graduate" size={20} /> 新手教程</h2>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>8 步走完核心功能，<br />亲手体验 MONOPOMO</p>
            <p className="hidden md:block" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>8 步走完核心功能，亲手体验 MONOPOMO</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="oto-window p-5">
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "'HYPixel'", fontSize: '10px', color: '#4a3020' }}>学习进度</span>
          <span className="text-[16px]! md:text-[18px]!" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-none overflow-hidden" style={{ background: '#e8d4a8' }}>
          <div className="h-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #689050, #78a860, #509030)', transition: 'width 0.3s ease' }} />
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
      <div className="oto-window p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
        <p className="text-[16px]! md:text-[18px]!" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
          {allDone ? <><Icon name="trophy" size={20} /> 恭喜完成全部新手任务！现在你已经掌握了系统的所有核心功能。</> :
           <>{`↓ 下一步：`}{(() => {
             const t = nextQuest?.title || '';
             const i = t.indexOf('：');
             if (i < 0) return <>{t}</>;
             return (<>
               <span className="md:hidden">{t.slice(0, i + 1)}</span>
               <span className="hidden md:inline">{t}</span>
               <br className="md:hidden" />
               <div className="md:hidden" style={{ paddingLeft: '1.5em' }}>{t.slice(i + 1)}</div>
             </>);
           })()}<br />
           <span className="hidden md:inline" style={{ fontSize: '12px', color: 'var(--oto-text-muted)' }}>（从该页面点击跳转才能正常计入进度哦）</span>
           <div className="md:hidden" style={{ paddingLeft: '1.5em', fontSize: '12px', color: 'var(--oto-text-muted)' }}>（从该页面点击跳转才能正常计入进度哦）</div>
           </>}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={restartTutorial} className="oto-btn-sm">
            <Icon name="refresh" size={14} /> 重新开始新手教程
          </button>
        </div>
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
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
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
                      <div className="text-sm leading-relaxed whitespace-pre-line text-[16px]! md:text-[18px]!" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>
                        <br className="md:hidden" />
                        {q.description}
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-start md:self-center">
                      {isDone ? (
                        <span className="oto-badge" style={{ background: '#e8f0e4', color: 'var(--oto-green)', borderColor: 'var(--oto-green)' }}>已完成 <Icon name="check" size={14} /></span>
                      ) : isLocked ? (
                        <span className="oto-badge" style={{ background: 'var(--oto-bg-inset)', color: 'var(--oto-text-muted)', borderColor: 'var(--oto-border-light)' }}>请先完成上一步</span>
                      ) : (
                        <button onClick={() => startQuest(q.id, q.actionTo)} className="oto-btn"
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
          <p className="text-[16px]! md:text-[18px]!" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}><Icon name="bulb" size={14} /> 完成当前操作后，系统会自动回到这里并标记完成</p>
        </div>
      )}

      {/* Welcome Modal — 重新开始教程时弹出 */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onStart={() => setShowWelcome(false)}
        />
      )}
    </div>
  );
}