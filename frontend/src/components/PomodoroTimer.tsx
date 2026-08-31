import { usePomodoro } from '../contexts/PomodoroContext';
import Icon from './Icons';
import { TASK_STATUS_MAP } from '../types';
import { formatCustomDuration, MAX_REST_DURATION_MINUTES, MAX_WORK_DURATION_MINUTES } from '../services/pomodoroCount';

export default function PomodoroTimer() {
  const {
    phase, mode, seconds, selectedTask, tasks, notes,
    startTime, currentTime, totalSeconds, endTime, customMinutes,
    toggleTimer, finishTimer, resetTimer, switchMode,
    setCustomMinutes, setSelectedTask, setNotes, refreshTasks,
  } = usePomodoro();

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK' ? (seconds / totalSeconds) * 100 : ((totalSeconds - seconds) / totalSeconds) * 100;

  const modeColor = mode === 'WORK' || mode === 'CUSTOM' || mode === 'COUNT_UP' ? '#8a3030' : '#886830';
  const modeBg = 'var(--oto-bg-inset)';
  const isWorkMode = mode === 'WORK' || mode === 'CUSTOM' || mode === 'COUNT_UP';
  const customSecondsSuffix = formatCustomDuration(customMinutes).slice(-3);

  const modeButtonStyle = (active: boolean, color: string) => ({
    fontFamily: 'var(--oto-font-body)', fontSize: '11px', letterSpacing: '0',
    background: 'var(--oto-bg-inset)',
    borderWidth: '2px', borderStyle: 'solid',
    borderTopColor: active ? 'rgba(255,255,255,0.2)' : '#d4b860',
    borderLeftColor: active ? 'rgba(255,255,255,0.2)' : '#d4b860',
    borderRightColor: active ? 'rgba(0,0,0,0.4)' : '#0a0c10',
    borderBottomColor: active ? 'rgba(0,0,0,0.4)' : '#0a0c10',
    color: active ? color : '#555',
    boxShadow: active ? `0 0 8px ${color}20` : 'none',
  });

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const confirmReset = () => {
    if (window.confirm('确定要重置当前计时吗？本次计时进度将被清除。')) resetTimer();
  };

  const confirmFinish = () => {
    if (window.confirm('确定要结束当前顺计时吗？未达到记录下限的时长不会记入记录。')) finishTimer();
  };

  return (
    <div className={`oto-window p-6 ${phase === 'running' ? 'oto-magic-ring' : ''}`}>
      {/* ── Mode selector ── */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={() => switchMode(isWorkMode ? mode : 'WORK')} className="w-full px-2 py-2 font-bold text-center" style={modeButtonStyle(isWorkMode, '#8a3030')}>
          <Icon name="tomato" size={14} /> 工作
        </button>
        <button onClick={() => switchMode(isWorkMode ? 'SHORT_BREAK' : mode)} className="w-full px-2 py-2 font-bold text-center" style={modeButtonStyle(!isWorkMode, '#886830')}>
          <Icon name="coffee" size={14} /> 休息
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {isWorkMode ? (
          (['WORK', 'CUSTOM', 'COUNT_UP'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)} className="w-full px-2 py-1.5 text-center" style={modeButtonStyle(mode === m, '#8a3030')}>
              {m === 'WORK' ? '标准 25 分钟' : m === 'CUSTOM' ? '自定义倒计时' : '顺计时'}
            </button>
          ))
        ) : (
          (['SHORT_BREAK', 'CUSTOM_BREAK', 'COUNT_UP_BREAK'] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)} className="w-full px-2 py-1.5 text-center" style={modeButtonStyle(mode === m, '#886830')}>
              {m === 'SHORT_BREAK' ? '标准 5 分钟' : m === 'CUSTOM_BREAK' ? '自定义倒计时' : '顺计时'}
            </button>
          ))
        )}
      </div>

      {/* ── Timer digits ── */}
      <div className="text-center my-6">
        {(mode === 'CUSTOM' || mode === 'CUSTOM_BREAK') && phase === 'idle' ? (
          <div className="pomodoro-digits flex h-[84px] items-center justify-center text-7xl font-bold tracking-wider">
            <div className="flex items-baseline justify-center gap-0 leading-none">
              <input type="number" min={1} max={mode === 'CUSTOM_BREAK' ? MAX_REST_DURATION_MINUTES : MAX_WORK_DURATION_MINUTES} value={customMinutes}
                onChange={e => setCustomMinutes(Number(e.target.value))}
                className="pomodoro-custom-minutes w-[2.1ch] text-right text-7xl! font-bold leading-none tracking-wider bg-transparent border-0 border-b-2! border-solid! outline-none appearance-[textfield]"
                style={{ fontFamily: 'var(--oto-font-body)', color: modeColor, borderColor: `${modeColor}80`, caretColor: modeColor }} aria-label="自定义时长（分钟）" />
              <span className="text-7xl font-bold leading-none tracking-wider" style={{ fontFamily: 'var(--oto-font-body)', color: modeColor }} aria-label="固定秒数">{customSecondsSuffix}</span>
            </div>
          </div>
        ) : (
          <div className="pomodoro-digits flex h-[84px] items-center justify-center text-7xl font-bold tracking-wider"
            style={{
              fontFamily: 'var(--oto-font-body)',
              color: modeColor,
            }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
        )}

        {/* Progress bar */}
        <div className="oto-progress mt-4">
          <div style={{ width: `${progress}%`, backgroundColor: modeColor }} />
        </div>
      </div>

      {/* ── Time info row: Start → Now → End ── */}
      <div className="flex items-center justify-center gap-1 mb-4">
        {[
          { label: '起始', time: startTime ? fmtTime(startTime) : '--:--:--', active: false },
          { label: '当前', time: fmtTime(currentTime), active: true },
          { label: '结束', time: endTime ? fmtTime(endTime) : '--:--:--', active: false },
        ].map(box => (
          <div key={box.label}
            className="text-center px-3 py-2 min-w-[80px]"
            style={{
              background: box.active ? modeBg : 'var(--oto-bg-inset)',
              borderStyle: 'solid', borderWidth: '2px',
              borderTopColor: '#d4b860',
              borderLeftColor: '#d4b860',
              borderRightColor: '#0a0c10',
              borderBottomColor: '#0a0c10',
            }}
          >
            <span className="block uppercase tracking-wider" style={{ fontFamily: 'var(--oto-font-body)', fontSize: '11px', color: box.active ? modeColor : '#555' }}>
              {box.label}
            </span>
            <span style={{ fontFamily: 'var(--oto-font-body)', fontSize: '15px', color: box.active ? modeColor : '#888' }}>
              {box.time}
            </span>
          </div>
        ))}
      </div>

      {/* ── Task selector ── */}
      {['WORK', 'CUSTOM', 'COUNT_UP'].includes(mode) && (
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1"
            style={{ fontFamily: 'var(--oto-font-body)', fontSize: '11px' }}>
            ◆ 关联 进行中 的任务
            <button
              onClick={() => refreshTasks()}
              title="刷新任务列表"
              style={{
                marginLeft: 8, background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'inherit', fontSize: 'inherit',
                fontFamily: 'inherit',
              }}
            >↻</button>
          </label>
          <select
            value={selectedTask || ''}
            onChange={e => setSelectedTask(e.target.value || null)}
            className="oto-select w-full"
            style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
            disabled={phase !== 'idle'}
          >
            <option value="">{tasks.length === 0 ? '（暂无可用任务，请先去"任务管理"创建）' : '-- 选择任务 --'}</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.name.length > 20 ? t.name.slice(0, 20) + '…' : t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Notes ── */}
      <div className="mb-4">
        <input
          type="text" placeholder="备注（可选）"
          value={notes} onChange={e => setNotes(e.target.value)}
          className="oto-input w-full"
        />
      </div>

      {/* ── Control buttons ── */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={toggleTimer} className="oto-btn"
          style={{ background: 'transparent', color: phase === 'running' ? '#886830' : '#406838' }}>
          {phase === 'idle' ? <><Icon name="play" size={14} /> 开始</> : phase === 'running' ? <><Icon name="pause" size={14} /> 暂停</> : <><Icon name="play" size={14} /> 继续</>}
        </button>
      {phase !== 'idle' && (
          <>
            <button onClick={confirmReset} className="oto-btn" style={{ background: 'transparent', color: '#8a3030' }}><Icon name="undo" size={14} /> 重置</button>
            {(mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK') && <button onClick={confirmFinish} className="oto-btn" style={{ background: 'transparent', color: '#304868' }}><Icon name="check" size={14} /> 结束</button>}
          </>
        )}
      </div>
    </div>
  );
}
