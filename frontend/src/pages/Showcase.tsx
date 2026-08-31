import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/Icons';
import Calendar from '../components/Calendar';
import {
  getShowcaseSnapshots,
  getShowcaseCurrent,
  snapshotShowcaseNow,
} from '../services/api';
import { useOnboarding } from '../contexts/OnboardingContext';
import { formatShanghaiDateTime } from '../services/queryBounds';

/* Trophy descriptions */
const RARITY_NAMES = ['N（普通）', 'R（稀有）', 'SR（史诗）', 'SSR（传说）'];

const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px' };
const pxH2 = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxH3 = { fontFamily: 'var(--oto-font-title)', fontSize: '16px', lineHeight: '1.8' };

const TIER_NAMES = ['空', '青铜', '白银', '黄金', '钻石'];
const TIER_COLORS = ['#888', '#a86838', '#c8c8d0', '#e8b850', 'gradient'];
const TIER_BG = ['transparent', '#faf2e0', '#f0f0f5', '#fcf8e8', 'gradient'];

const TIER_GRADIENT = 'linear-gradient(135deg, #ecf7ff 0%, #e4eeff 50%, #f4e8ff 100%)';

const TIER_EMOJIS: Record<string, string[]> = {
  bounty: ['-', '🥉', '🥈', '🥇', '💎'],
  pomodoro: ['-', '🥉', '🥈', '🥇', '💎'],
  trophy: ['-', '🥉', '🥈', '🥇', '💎'],
};

const THRESHOLDS = {
  bounty: [0, 3000, 9800, 19800, 32800],
  pomodoro: [0, 30, 60, 120, 240],
};

interface ShowcaseSnapshot {
  id: string;
  user_id: string;
  year_month: string;
  bounty_level: number;
  pomodoro_level: number;
  trophy_level: number;
  bounty_value: number;
  pomodoro_value: number;
  trophy_value: number;
  snapshot_at: string;
}

interface ShowcaseCurrent {
  year_month: string;
  bounty_level: number;
  pomodoro_level: number;
  trophy_level: number;
  bounty_value: number;
  pomodoro_value: number;
  trophy_value: number;
  thresholds: { bounty: number[]; pomodoro: number[] };
}

const ITEM_FOLDER: Record<string, string> = { bounty: 'r1', pomodoro: 'r2', trophy: 'r3' };

function ItemIcon({ kind, level, size = 80 }: { kind: string; level: number; size?: number }) {
  const prefix = ITEM_FOLDER[kind] || 'r1';
  const tierIndex = Math.max(1, Math.min(5, level + 1));
  return (
    <img
      src={`/acc/${prefix}c${tierIndex}.webp`}
      alt={TIER_NAMES[level]}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
}

function TierBar({ level, thresholds, current }: { level: number; thresholds: number[]; current: number }) {
  const segs = [0, 1, 2, 3, 4];

  return (
    <div className="flex items-center gap-1">
      {segs.map(i => {
        const filled = i < level;
        const isCurrent = i === level;
        const tierColor = TIER_COLORS[i];
        return (
          <div key={i} className="flex-1 h-2" style={{
            background: filled ? (i === 4 ? TIER_GRADIENT : tierColor) : 'rgba(0,0,0,0.15)',
            border: `1px solid ${filled ? (i === 4 ? 'rgba(255,255,255,0.4)' : tierColor) : 'rgba(0,0,0,0.3)'}`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {isCurrent && i < 4 && (
              <div style={{
                position: 'absolute',
                inset: 0,
                width: `${Math.max(0, Math.min(1, (current - (thresholds[i] || 0)) / Math.max(1, thresholds[i + 1] - thresholds[i]))) * 100}%`,
                background: tierColor,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({ kind, name, desc, level, value, thresholds, isTrophy }: {
  kind: string;
  name: string;
  desc: string;
  level: number;
  value: number;
  thresholds: number[];
  isTrophy?: boolean;
}) {
  const tierColor = TIER_COLORS[Math.max(0, Math.min(4, level))];
  const isDiamond = level === 4;

  return (
    <div className="oto-window rounded-none! p-3 relative"
         style={{
           borderColor: isDiamond ? 'transparent' : tierColor,
           minWidth: 0, borderWidth: 2,
           background: isDiamond ? TIER_GRADIENT : (TIER_BG[level] || 'var(--oto-bg-card)'),
           backgroundClip: 'padding-box',
         }}>
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <ItemIcon kind={kind} level={level} size={90} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col text-left" style={{ paddingRight: 40 }}>
        <div style={{ ...pxH3, marginBottom: 2 }}>{name}</div>
        <div style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{desc}</div>
        <div style={{
          ...pxH3,
          color: isDiamond ? '#5a7090' : tierColor,
          fontWeight: 'bold',
          margin: '4px 0',
        }}>
          {TIER_NAMES[level]}
        </div>
        {isTrophy ? (
          <div style={{ ...pxSm, color: 'var(--oto-text-dim)', marginTop: 2 }}>已集齐 {value} 种稀有度</div>
        ) : level >= 4 ? (
          <div style={{ ...pxSm, color: 'var(--oto-text-dim)', marginBottom: 4 }}>
            当前 {value.toLocaleString()} · 已达最高等级
          </div>
        ) : (
          <div style={{ ...pxSm, color: 'var(--oto-text-dim)', marginBottom: 4 }}>
            当前 {value.toLocaleString()} · 下一级需 {thresholds[level + 1]?.toLocaleString()}
          </div>
        )}
        <TierBar level={level} thresholds={thresholds} current={value} />
        <div style={{ ...pxSm, color: 'var(--oto-text-muted)', marginTop: 4 }}>
          {level >= 4 ? '已达最高等级' : isTrophy
            ? `下一级需集齐${RARITY_NAMES[level] || '?'}全部8件`
            : `距下一级还差 ${(thresholds[Math.min(level + 1, 4)] - value).toLocaleString()}`}
        </div>
      </div>
    </div>
  );
}

export default function Showcase() {
  const { activeQuest, completeQuest } = useOnboarding();
  const today = new Date();
  const [year, setYear] = useState<string>(() => today.getFullYear().toString());
  const [snapshots, setSnapshots] = useState<ShowcaseSnapshot[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);
  const [current, setCurrent] = useState<ShowcaseCurrent | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  // 新手教程：点击「同步到月度记录」并成功保存后才算完成查看藏品室步骤
  // （不再是首次访问页面就完成，避免用户只看不点确认）

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [snap, cur] = await Promise.all([
        getShowcaseSnapshots(year),
        getShowcaseCurrent(),
      ]);
      setSnapshots(snap.snapshots);
      setYears(snap.years);
      setLastSnapshotAt(snap.last_snapshot_at);
      setCurrent(cur);
    } catch { /* silent */ }
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(() => { load(true); }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Listen for cross-component refresh events
  useEffect(() => {
    const handler = () => { load(true); };
    window.addEventListener('oto:showcase-refresh', handler);
    window.addEventListener('oto:tokens-changed', handler);
    return () => {
      window.removeEventListener('oto:showcase-refresh', handler);
      window.removeEventListener('oto:tokens-changed', handler);
    };
  }, [load]);

  // Auto-switch year on new year
  useEffect(() => {
    const id = setInterval(() => {
      const nowY = new Date().getFullYear().toString();
      if (nowY !== year) setYear(nowY);
    }, 60_000);
    return () => clearInterval(id);
  }, [year]);

  // Expand current month by default
  useEffect(() => {
    if (current && year === current.year_month.slice(0, 4)) {
      setExpanded(current.year_month);
    }
  }, [current, year]);

  const handleSnapshot = async () => {
    if (!confirm('确定要立即同步到月度记录吗？这将覆盖当月已存在记录。')) return;
    setSnapshotting(true);
    try {
      await snapshotShowcaseNow();
      await load();
      alert('快照已保存！');
      // 新手教程：点击「同步到月度记录」并保存成功后才算完成查看藏品室步骤
      if (activeQuest?.id === 'check-showcase') completeQuest('check-showcase');
    } catch (e: any) {
      alert('保存失败：' + (e?.message || '未知错误'));
    }
    setSnapshotting(false);
  };

  // Month cards for 12 months
  const monthCards = Array.from({ length: 12 }, (_, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
    const snap = snapshots.find(s => s.year_month === ym);
    return { ym, snap };
  });

  const bountyThresholds = current?.thresholds?.bounty ?? THRESHOLDS.bounty;
  const pomodoroThresholds = current?.thresholds?.pomodoro ?? THRESHOLDS.pomodoro;

  return (
    <div className="space-y-4 oto-stagger">
      {/* Header */}
      <div className="oto-window rounded-none! p-4 flex items-center justify-between flex-wrap gap-3 oto-card-stamped">
        <div className="flex items-center gap-3">
          <Icon name="building" size={32} />
          <h1 style={pxH2} className="m-0!">藏品室</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={e => setYear(e.target.value)}
                  className="oto-btn oto-btn-sm oto-btn-gray"
                  style={{ ...pxSm, padding: '2px 8px' }}>
            {years.length > 0
              ? years.map(y => <option key={y} value={y}>{y} 年</option>)
              : <option value={year}>{year} 年</option>
            }
            {!years.includes(today.getFullYear().toString()) && (
              <option value={today.getFullYear().toString()}>{today.getFullYear()} 年</option>
            )}
          </select>
        </div>
      </div>

      {/* Current month real-time progress */}
      {current && year === current.year_month.slice(0, 4) && (
        <div className="oto-window-gold rounded-none! p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 style={pxH3} className="m-0! flex items-center gap-2">
              <Icon name="sun" size={16} />
              本月实时进度（{current.year_month}）
            </h2>
            <div className="flex items-center gap-3">
              <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
                请务必及时同步到月度记录，否则有可能进度丢失
                （上次同步：{lastSnapshotAt ? formatShanghaiDateTime(lastSnapshotAt) : '尚未同步'}）
              </span>
              <button onClick={handleSnapshot} disabled={snapshotting}
                      className="oto-btn oto-btn-sm"
                      title="将当月实时进度固化为历史快照"
                      style={{ ...pxSm, padding: '2px 10px' }}>
                <Icon name="archive" size={12} /> 同步到月度记录
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ItemCard
              kind="bounty"
              name="赏金猎人勋章"
              desc="代币累计（达成升级）"
              level={current.bounty_level}
              value={current.bounty_value}
              thresholds={bountyThresholds}
            />
            <ItemCard
              kind="pomodoro"
              name="番茄大厨怀表"
              desc="完成工作番茄钟数"
              level={current.pomodoro_level}
              value={current.pomodoro_value}
              thresholds={pomodoroThresholds}
            />
            <ItemCard
              kind="trophy"
              name="卡牌大师奖杯"
              desc="集齐稀有度全部8件"
              level={current.trophy_level}
              value={current.trophy_value}
              thresholds={[0, 1, 2, 3, 4]}
              isTrophy
            />
          </div>
        </div>
      )}

      {/* Monthly record cards */}
      <div className="oto-window rounded-none! p-4">
        <h2 style={pxH3} className="m-0! flex items-center gap-2 mb-3">
          <Icon name="month" size={16} /> {year} 年月度记录
        </h2>

        {loading ? (
          <p style={{ ...pxBody, color: 'var(--oto-text-muted)', textAlign: 'center', padding: '24px 0' }}>
            <Icon name="loading" size={20} className="animate-spin" /> 加载中...
          </p>
        ) : monthCards.every(m => !m.snap) ? (
          <p style={{ ...pxBody, color: 'var(--oto-text-muted)', textAlign: 'center', padding: '24px 0' }}>
            <Icon name="building" size={14} /> {year} 年还没有任何月度快照。完成当月活动后点击"同步到月度记录"即可存档。
          </p>
        ) : (
          <>
            {/* Thumbnail cards: 3 per row */}
            <div className="grid grid-cols-3 gap-3 items-stretch">
              {monthCards.map(({ ym, snap }) => (
                <div key={ym}
                  className="oto-inset rounded-none! p-3 cursor-pointer transition-all hover:brightness-105 flex flex-col"
                  style={{ opacity: snap ? 1 : 0.4, minWidth: 0, minHeight: 96, height: '100%' }}
                  onClick={() => {
                    if (!snap) return;
                    setExpanded(expanded === ym ? null : ym);
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ ...pxH3, color: 'var(--oto-text)', fontSize: 15 }}>
                      {parseInt(ym.slice(5))} 月
                    </span>
                    {expanded === ym && (
                      <Icon name="chevronUp" size={12} />
                    )}
                  </div>
                  {snap ? (
                    <>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {[snap.bounty_level, snap.pomodoro_level, snap.trophy_level].map((lv, i) => {
                          const isLvDiamond = lv === 4;
                          return (
                            <span key={i} style={{
                              ...pxSm,
                              padding: '1px 6px',
                              lineHeight: 1.4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '4em',
                              height: '1.6em',
                              border: isLvDiamond
                                ? '2px solid #7a92c0'
                                : `1px solid ${TIER_COLORS[lv]}`,
                              background: isLvDiamond ? TIER_GRADIENT : 'transparent',
                              backgroundClip: isLvDiamond ? 'padding-box' : 'unset',
                              color: isLvDiamond ? '#3a5078' : TIER_COLORS[lv],
                              fontWeight: 'bold',
                              fontSize: 11,
                            }}>
                              {TIER_NAMES[lv]}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <span style={{ ...pxSm, color: 'var(--oto-text-muted)', marginTop: 'auto' }}>暂无记录</span>
                  )}
                </div>
              ))}
            </div>

            {/* Expanded detail area */}
            {(() => {
              const openYm = expanded;
              if (!openYm) return null;
              const snap = snapshots.find(s => s.year_month === openYm);
              if (!snap) return null;
              return (
                <div className="mt-3 oto-window-gold rounded-none! p-4" style={{ borderWidth: 2 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 style={{ ...pxH3, margin: 0 }}>
                      {parseInt(openYm.slice(5))} 月 · {openYm.slice(0, 4)}
                    </h3>
                    <button
                      onClick={() => setExpanded(null)}
                      className="oto-btn oto-btn-sm oto-btn-gray"
                      style={{ fontSize: 12 }}
                    >收起</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ItemCard
                      kind="bounty"
                      name="赏金猎人勋章"
                      desc="代币累计"
                      level={snap.bounty_level}
                      value={snap.bounty_value}
                      thresholds={THRESHOLDS.bounty}
                    />
                    <ItemCard
                      kind="pomodoro"
                      name="番茄大厨怀表"
                      desc="工作番茄钟数"
                      level={snap.pomodoro_level}
                      value={snap.pomodoro_value}
                      thresholds={THRESHOLDS.pomodoro}
                    />
                    <ItemCard
                      kind="trophy"
                      name="卡牌大师奖杯"
                      desc="集齐稀有度全部8件"
                      level={snap.trophy_level}
                      value={snap.trophy_value}
                      thresholds={[0, 1, 2, 3, 4]}
                      isTrophy
                    />
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* History Calendar */}
      <div className="oto-window rounded-none! p-4">
        <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '16px', lineHeight: '1.8', color: 'var(--oto-text)' }} className="m-0! flex items-center gap-2 mb-3">
          <Icon name="calendar" size={16} /> 历史记录
        </h2>
        <Calendar />
      </div>
    </div>
  );
}
