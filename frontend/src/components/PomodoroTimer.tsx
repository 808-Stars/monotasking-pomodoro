import { usePomodoro } from '../contexts/PomodoroContext';
import Icon from './Icons';

export default function PomodoroTimer() {
  const {
    phase, mode, seconds, selectedTask, tasks, notes,
    startTime, currentTime, totalSeconds, endTime,
    toggleTimer, handleSkip, resetTimer, switchMode,
    setSelectedTask, setNotes, refreshTasks,
  } = usePomodoro();

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;

  const modeColor = mode === 'WORK' ? '#8a3030' : '#886830';
  const modeBg = 'var(--oto-bg-inset)';

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={`oto-window p-6 ${phase === 'running' ? 'oto-magic-ring' : ''}`}>
      {/* ── Mode selector ── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['WORK', 'SHORT_BREAK', 'LONG_BREAK'] as const).map(m => {
          const active = mode === m;
          const clr = m === 'WORK' ? '#8a3030' : '#886830';
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="w-full px-2 py-2 font-bold text-center uppercase"
              style={{
                fontFamily: 'var(--oto-font-body)', fontSize: '11px', letterSpacing: '0',
                background: 'var(--oto-bg-inset)',
                borderWidth: '2px', borderStyle: 'solid',
                borderTopColor: active ? 'rgba(255,255,255,0.2)' : '#d4b860',
                borderLeftColor: active ? 'rgba(255,255,255,0.2)' : '#d4b860',
                borderRightColor: active ? 'rgba(0,0,0,0.4)' : '#0a0c10',
                borderBottomColor: active ? 'rgba(0,0,0,0.4)' : '#0a0c10',
                color: active ? clr : '#555',
                boxShadow: active ? `0 0 8px ${clr}20` : 'none',
              }}
            >
              {m === 'WORK' ? <><Icon name="tomato" size={14} /> 工作</> : m === 'SHORT_BREAK' ? <><Icon name="coffee" size={14} /> 短休</> : <><Icon name="meditate" size={14} /> 长休</>}
            </button>
          );
        })}
      </div>

      {/* ── Timer digits ── */}
      <div className="text-center my-6">
        <div className="pomodoro-digits text-7xl font-bold tracking-wider"
          style={{
            fontFamily: 'var(--oto-font-body)',
            color: modeColor,
          }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>

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
      {mode === 'WORK' && (
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1"
            style={{ fontFamily: 'var(--oto-font-body)', fontSize: '11px' }}>
            ◆ 关联任务
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
            onChange={e => setSelectedTask(Number(e.target.value) || null)}
            className="oto-select w-full"
            disabled={phase !== 'idle'}
          >
            <option value="">{tasks.length === 0 ? '（暂无可用任务，请先去"任务管理"创建）' : '-- 选择任务 --'}</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.status_display})</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Notes ── */}
      {mode === 'WORK' && (
        <div className="mb-4">
          <input
            type="text" placeholder="备注（可选）"
            value={notes} onChange={e => setNotes(e.target.value)}
            className="oto-input w-full" disabled={phase !== 'idle'}
          />
        </div>
      )}

      {/* ── Control buttons ── */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={toggleTimer} className="oto-btn"
          style={{ background: phase === 'idle' ? '#d4a8a8' : phase === 'running' ? '#d4b898' : '#d4a8a8' }}>
          {phase === 'idle' ? <><Icon name="play" size={14} /> 开始</> : phase === 'running' ? <><Icon name="pause" size={14} /> 暂停</> : <><Icon name="play" size={14} /> 继续</>}
        </button>
        {phase !== 'idle' && (
          <>
            <button onClick={resetTimer} className="oto-btn"><Icon name="undo" size={14} /> 重置</button>
          </>
        )}
      </div>
    </div>
  );
}
