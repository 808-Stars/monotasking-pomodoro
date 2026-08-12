import { useState, useEffect } from 'react';
import { getDailyEarned } from '../services/api';
import { RARITY_COLOR_MAP, RARITY_MAP } from '../types';
import Icon from './Icons';

const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' } as const;
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '14px' } as const;
const pxH3 = { fontFamily: 'var(--oto-font-title)', fontSize: '16px', lineHeight: '1.8' } as const;

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

/** 根据代币数量返回方点颜色（4 档） */
function dotColor(earned: number): string {
  if (earned <= 0) return 'transparent';
  if (earned < 100) return 'rgba(200,160,64,0.35)';
  if (earned < 200) return 'rgba(200,160,64,0.55)';
  if (earned < 400) return 'rgba(200,160,64,0.72)';
  if (earned < 800) return 'rgba(200,160,64,0.9)';
  return 'rgba(180,130,40,1)';
}

/** 根据番茄钟数量返回颜色（4 档） */
function pomoColor(count: number): string {
  if (count <= 0) return 'transparent';
  if (count <= 2) return 'rgba(220,80,60,0.35)';
  if (count <= 4) return 'rgba(220,80,60,0.55)';
  if (count <= 8) return 'rgba(220,80,60,0.72)';
  if (count <= 12) return 'rgba(220,80,60,0.9)';
  return 'rgba(200,60,40,1)';
}

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState<Record<string, number>>({});
  const [rarities, setRarities] = useState<Record<string, string>>({});
  const [pomodoros, setPomodoros] = useState<Record<string, number>>({});
  const [monthTotal, setMonthTotal] = useState(0);
  const [monthPomodoros, setMonthPomodoros] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async (y: number, m: number) => {
    setLoading(true);
    try {
      const data = await getDailyEarned(`${y}-${pad(m)}`);
      setDays(data.days);
      setRarities(data.rarities || {});
      setPomodoros(data.pomodoros || {});
      setMonthTotal(data.month_total);
      setMonthPomodoros(data.month_pomodoros || 0);
    } catch {
      setDays({});
      setRarities({});
      setPomodoros({});
      setMonthTotal(0);
      setMonthPomodoros(0);
    }
    setLoading(false);
  };

  useEffect(() => { load(year, month); }, [year, month]);

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else { setMonth(month - 1); }
    setSelected(null);
  };
  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else { setMonth(month + 1); }
    setSelected(null);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelected(null);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  const cells: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month)}-${pad(d)}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="oto-btn oto-btn-sm oto-btn-gray" style={{ ...pxSm, padding: '2px 8px' }}>‹ 上月</button>
          <span style={{ ...pxH3, color: 'var(--oto-text)', minWidth: 110, textAlign: 'center' }}>
            {year} 年 {month} 月
          </span>
          <button onClick={goNext} className="oto-btn oto-btn-sm oto-btn-gray" style={{ ...pxSm, padding: '2px 8px' }}>下月 ›</button>
          {!isCurrentMonth && (
            <button onClick={goToday} className="oto-btn oto-btn-sm" style={{ ...pxSm, padding: '2px 8px' }}>回到今天</button>
          )}
        </div>
        <span style={{ ...pxSm, color: 'var(--oto-gold-dark)', fontWeight: 'bold' }}>
          本月共 {monthTotal} 币 · <Icon name="tomato" size={12} />{monthPomodoros}
        </span>
      </div>

      {loading ? (
        <p style={{ ...pxBody, color: 'var(--oto-text-muted)', textAlign: 'center', padding: '24px 0' }}>加载中...</p>
      ) : (
        <>
          {/* 周次表头 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center" style={{
                ...pxSm, color: i === 0 || i === 6 ? 'var(--oto-red)' : 'var(--oto-text-dim)',
                fontWeight: 'bold', padding: '4px 0',
              }}>{w}</div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} />;
              const earned = days[cell.dateStr] || 0;
              const rarity = rarities[cell.dateStr] || null;
              const pomoCount = pomodoros[cell.dateStr] || 0;
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selected;

              return (
                <button key={i}
                  onClick={() => setSelected(isSelected ? null : cell.dateStr)}
                  className="oto-inset rounded-none! flex flex-col items-center justify-center p-1 transition-all"
                  style={{
                    minHeight: 56,
                    position: 'relative',
                    background: isSelected ? 'rgba(200,160,64,0.25)' : 'transparent',
                    border: isToday ? '2px solid var(--oto-red)' : isSelected ? '2px solid var(--oto-gold-dark)' : '1px solid var(--oto-border-light)',
                    cursor: 'pointer',
                  }}
                >
                  {/* 标记点容器：纵向 */}
                  <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 md:top-1 md:right-1 md:gap-1" style={{ alignItems: 'flex-end' }}>
                    {/* 代币方点 */}
                    {earned > 0 && (
                      <span className="w-[5px] h-[5px] md:w-[8px] md:h-[8px]" style={{
                        borderRadius: 1,
                        background: dotColor(earned),
                      }} title={`+${earned} 币`} />
                    )}
                    {/* 番茄钟圆点 */}
                    {pomoCount > 0 && (
                      <span className="w-[5px] h-[5px] md:w-[8px] md:h-[8px]" style={{
                        borderRadius: '50%',
                        background: pomoColor(pomoCount),
                      }} title={`${pomoCount} 番茄钟`} />
                    )}
                    {/* 稀有度菱形 */}
                    {rarity && (
                      <span className="w-[5px] h-[5px] md:w-[8px] md:h-[8px]" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      }} title={RARITY_MAP[rarity]}>
                        <span className="w-[4px] h-[4px] md:w-[6px] md:h-[6px]" style={{
                          transform: 'rotate(45deg)',
                          background: RARITY_COLOR_MAP[rarity] || '#888',
                          marginRight: 0.5,
                        }} />
                      </span>
                    )}
                  </div>

                  {/* 日期 */}
                  <span style={{
                    ...pxBody, fontWeight: isToday ? 'bold' : 'normal',
                    color: 'var(--oto-text)',
                  }}>{cell.day}</span>

                  {/* 底部信息：手机端分行，桌面端一行 */}
                  {(earned > 0 || pomoCount > 0 || rarity) && (
                    <div className="flex flex-col md:flex-row items-center md:gap-2 mt-0.5 text-[7px] md:text-[10px]" style={{ lineHeight: 1.2 }}>
                      {earned > 0 && (
                        <span style={{ color: 'var(--oto-gold-dark)', fontWeight: 'bold' }}>+{earned}</span>
                      )}
                      {pomoCount > 0 && (
                        <span style={{ color: 'var(--oto-red)' }}>
                          <Icon name="tomato" size={8} className="md:hidden" /><Icon name="tomato" size={12} className="hidden md:inline" />{pomoCount}
                        </span>
                      )}
                      {rarity && (
                        <span style={{ color: RARITY_COLOR_MAP[rarity] || '#888', fontWeight: 'bold' }}>
                          {RARITY_MAP[rarity]}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 选中日期详情 */}
          {selected && (
            <div className="oto-inset rounded-none! mt-3 p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span style={{ ...pxBody, color: 'var(--oto-text)', fontWeight: 'bold' }}>
                  {selected}
                </span>
                <div className="flex items-center gap-8">
                  <span style={{ ...pxH3, color: 'var(--oto-gold-dark)', fontWeight: 'bold' }}>
                    {days[selected] || 0} 币
                  </span>
                  {(pomodoros[selected] || 0) > 0 && (
                    <span style={{ ...pxH3, color: 'var(--oto-red)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Icon name="tomato" size={20} /> {pomodoros[selected]} 番茄钟
                    </span>
                  )}
                  {rarities[selected] && (
                    <span className="oto-badge" style={{
                      ...pxSm, fontSize: '12px', padding: '2px 8px',
                      color: RARITY_COLOR_MAP[rarities[selected]],
                      borderColor: RARITY_COLOR_MAP[rarities[selected]],
                    }}>
                      {RARITY_MAP[rarities[selected]]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 图例 */}
          <div className="mt-3 flex flex-col md:flex-row md:justify-end gap-2 md:gap-0">
            {/* 代币方点 */}
            <div className="flex items-center gap-2 flex-wrap" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--oto-text)', minWidth: '3em' }}>代币数</span>
              {[100, 200, 400, 800].map((v, idx) => (
                <span key={v} className="flex items-center gap-1">
                  <span style={{
                    width: 8, height: 8, borderRadius: 1,
                    background: `rgba(200,160,64,${0.35 + idx * 0.18})`,
                  }} />
                  <span>{v} 币</span>
                </span>
              ))}
            </div>
            {/* 番茄钟圆点 */}
            <div className="flex items-center gap-2 flex-wrap md:ml-12" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--oto-text)', minWidth: '3em' }}>番茄钟</span>
              {[2, 4, 8, 12].map(v => (
                <span key={v} className="flex items-center gap-1">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: pomoColor(v),
                  }} />
                  <span>{v} 个</span>
                </span>
              ))}
            </div>
            {/* 稀有度菱形 */}
            <div className="flex items-center gap-2 flex-wrap md:ml-12" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--oto-text)', minWidth: '3em' }}>稀有度</span>
              {['N', 'R', 'SR', 'SSR'].map(r => (
                <span key={r} className="flex items-center gap-1">
                  <span style={{
                    width: 6, height: 6, transform: 'rotate(45deg)',
                    background: RARITY_COLOR_MAP[r] || '#888',
                  }} />
                  <span>{RARITY_MAP[r]}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
