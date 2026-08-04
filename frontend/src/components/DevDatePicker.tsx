import { useState } from 'react';
import { useDevMode } from '../contexts/DevModeContext';
import Icon from './Icons';

/* ═══════════════════════════════════════════════════════════════
   开发者模式日期穿越 — 侧栏 footer 折叠面板

   仅当 isDev === true 时挂载。切换 fake 日期会触发 window.location.reload()，
   让所有数据按 fake 日期重新拉取。
   ═══════════════════════════════════════════════════════════════ */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shift(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

function shiftMonth(base: string, months: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return isoOf(d);
}

function firstOfMonth(base: string): string {
  const [y, m] = base.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function lastOfMonth(base: string): string {
  const d = new Date(base + 'T00:00:00');
  return isoOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function nearestMonday(base: string, direction: 'prev' | 'next'): string {
  const d = new Date(base + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = dow === 0 ? 7 : dow;
  if (direction === 'prev') d.setDate(d.getDate() - diff);  // 周一
  else d.setDate(d.getDate() + (8 - diff));                   // 下周一
  return isoOf(d);
}

export default function DevDatePicker() {
  const { isDev, fakeDate, setFakeDate } = useDevMode();
  const [inputVal, setInputVal] = useState(fakeDate || '');

  if (!isDev) return null;

  const realToday = isoOf(new Date());
  const diff = fakeDate
    ? Math.round((new Date(fakeDate).getTime() - new Date(realToday).getTime()) / 86400000)
    : 0;

  const apply = (next: string) => {
    if (!ISO_RE.test(next)) return;
    setInputVal(next);
    setFakeDate(next);
  };

  const btnStyle: React.CSSProperties = {
    padding: '1px 6px', fontSize: 10, cursor: 'pointer',
    border: '1px solid var(--oto-accent-alt)',
    background: 'transparent', color: 'var(--oto-accent-alt)',
    borderRadius: 0,
  };

  return (
    <details
      style={{
        margin: '4px 0', padding: '6px 4px',
        border: '1px solid var(--oto-accent-alt)',
        borderRadius: 0, background: 'rgba(90,10,24,0.04)',
      }}
    >
      <summary style={{
        fontFamily: 'var(--oto-font-title)', fontSize: 10,
        color: 'var(--oto-accent-alt)', fontWeight: 700,
        cursor: 'pointer', letterSpacing: '0.05em',
        listStyle: 'none',
      }}>
        <span style={{ marginRight: 4 }}>[DEV]</span><Icon name="calendar" size={12} /> 日期穿越
      </summary>

      <div style={{ marginTop: 6, fontSize: 11, fontFamily: 'var(--oto-font-body)', color: 'var(--oto-text)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>真实: {realToday}</span>
          <span style={{ color: 'var(--oto-text-muted)' }}>
            {fakeDate ? `伪装: ${fakeDate}` : '未穿越'}
          </span>
        </div>
        {fakeDate && (
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--oto-text-muted)', marginBottom: 4 }}>
            偏离真实 {diff > 0 ? '+' : ''}{diff} 天
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="date"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            style={{
              flex: 1, padding: '2px 4px', fontSize: 11,
              border: '1px solid var(--oto-border)',
              borderRadius: 0, background: 'var(--oto-bg-card)',
            }}
          />
          <button onClick={() => inputVal && apply(inputVal)} style={btnStyle}>Go</button>
        </div>

        {fakeDate && (
          <>
            <div style={{ display: 'flex', gap: 3, marginBottom: 3, flexWrap: 'wrap' }}>
              <button onClick={() => apply(shift(fakeDate, -1))} style={btnStyle}>←1天</button>
              <button onClick={() => apply(shift(fakeDate, -7))} style={btnStyle}>←7天</button>
              <button onClick={() => apply(shiftMonth(fakeDate, -1))} style={btnStyle}>←1月</button>
              <button onClick={() => apply(shift(fakeDate, 1))} style={btnStyle}>→1天</button>
              <button onClick={() => apply(shift(fakeDate, 7))} style={btnStyle}>→7天</button>
              <button onClick={() => apply(shiftMonth(fakeDate, 1))} style={btnStyle}>→1月</button>
            </div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 3, flexWrap: 'wrap' }}>
              <button onClick={() => apply(firstOfMonth(fakeDate))} style={btnStyle}>本月第一天</button>
              <button onClick={() => apply(lastOfMonth(fakeDate))} style={btnStyle}>本月最后一天</button>
              <button onClick={() => apply(nearestMonday(fakeDate, 'prev'))} style={btnStyle}>本周一</button>
              <button onClick={() => apply(nearestMonday(fakeDate, 'next'))} style={btnStyle}>下周一</button>
            </div>
          </>
        )}

        <div style={{
          marginTop: 4, padding: '4px 6px', fontSize: 10,
          color: 'var(--oto-text-muted)',
          background: 'rgba(90,10,24,0.06)',
          border: '1px dashed var(--oto-accent-alt)',
        }}>
                    <Icon name="alert" size={12} /> 切换月份会覆盖真实 SSR 锁定目标
        </div>

        {fakeDate && (
          <button
            onClick={() => setFakeDate(null)}
            style={{
              ...btnStyle,
              marginTop: 6, width: '100%', fontWeight: 700,
              padding: '4px 6px', background: 'var(--oto-accent-alt)', color: '#fff',
            }}
          >
            回到真实今天
          </button>
        )}
      </div>
    </details>
  );
}
