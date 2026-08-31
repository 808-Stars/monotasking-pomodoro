import { useEffect, useState } from 'react';
import { fetchPomodoroSessions, getPomodoroStats, deletePomodoroSession } from '../services/api';
import type { PomodoroSession, PomodoroStats } from '../types';
import { POMODORO_TYPE_MAP } from '../types';
import PomodoroTimer from '../components/PomodoroTimer';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import Icon from '../components/Icons';
import { getPomodoroHistoryDisplay } from '../services/pomodoroHistoryDisplay';

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

function SessionHistoryItem({
  session,
  onDelete,
  expandedNotes,
  onToggleNote,
}: {
  session: PomodoroSession;
  onDelete: (id: string) => void;
  expandedNotes: Set<string>;
  onToggleNote: (id: string) => void;
}) {
  const display = getPomodoroHistoryDisplay(session);
  const isExpanded = expandedNotes.has(session.id);
  const borderColor = session.type === 'WORK' ? '#8a3030' : session.type === 'SHORT_BREAK' ? '#406838' : '#304868';

  return (
    <div className={`group px-4 ${display.isWork ? 'py-3' : 'py-2'} transition-all hover:brightness-105`} style={{
      borderLeft: `3px solid ${borderColor}`,
      borderBottom: '1px solid var(--oto-border-light)',
    }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge label={session.type === 'WORK' ? '工作' : '休息'} status={session.type} className="w-[52px] text-center" />
          <button onClick={() => onDelete(session.id)} className="inline-flex h-[22px]! w-[22px]! items-center justify-center bg-transparent! border-0! shadow-none! p-0! text-xs opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:filter-none" aria-label="删除记录">
            <Icon name="trash" size={12} />
          </button>
        </div>
        <div className="flex items-center gap-4 min-w-0 text-xs" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>
          <span className="whitespace-nowrap">{new Date(session.start_time).toLocaleString('zh-CN')}</span>
          {session.end_time && <span className="whitespace-nowrap">→ {new Date(session.end_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>
      {display.isWork && (
        <div className="font-medium text-sm line-clamp-2 min-w-0 mt-1" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text)' }}>
          {display.title}
        </div>
      )}
      {display.notes && (
        <p className="text-xs mt-1 break-words cursor-pointer" onClick={() => onToggleNote(session.id)}
           style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)', display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', WebkitLineClamp: isExpanded ? 'unset' : 2 }}>
          <Icon name="notebook" size={14} /> {display.notes}
          {!isExpanded && display.notes.length > 60 && <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '12px' }}>展开</span>}
          {isExpanded && display.notes.length > 60 && <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '12px' }}>收起</span>}
        </p>
      )}
      {display.isWork && session.interruption_reason && <p className="text-xs mt-1" style={{ ...pxBody, fontSize: '14px', color: '#f09040' }}><Icon name="alert" size={14} /> 中断原因: {session.interruption_reason}</p>}
    </div>
  );
}

export default function PomodoroHistory() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const toggleNote = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const load = () => {
    fetchPomodoroSessions(filterType ? { type: filterType } : undefined).then(setSessions).finally(() => setLoading(false));
    getPomodoroStats().then(setStats);
  };
  useEffect(() => { load(); }, [filterType]);

  const handleDelete = async (id: string) => {
    if (!confirm('删除这条记录？')) return;
    await deletePomodoroSession(id); load();
  };

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header — matches original gradient→solid pixel header */}
      <div className="oto-window oto-page-header-red rounded-none! p-5 oto-card-shimmer oto-card-stamped relative" style={{ background: 'var(--oto-page-header-red)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="hourglass" size={20} /> 番茄钟</h2>
            <p className="hidden md:block" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>番茄工作法 · 25分钟专注 + 5分钟休息的节奏</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>番茄工作法</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', marginTop: '2px' }}>25分钟专注 + 5分钟休息的节奏</p>
          </div>
          <span className="oto-badge oto-badge-red absolute top-7 right-7 md:static">执行层</span>
        </div>
      </div>

      {/* Stats — 4 columns matching original */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatsCard title="今日" value={stats.today} icon="sun" color="text-blue-600" />
          <StatsCard title="本周" value={stats.this_week} icon="calendar" color="text-yellow-600" />
          <StatsCard title="本月" value={stats.this_month} icon="chart" color="text-purple-600" />
          <StatsCard title="总计" value={stats.total} icon="trophy" color="text-red-600" />
        </div>
      )}

      {/* Timer + History grid — matching original 1:2 ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PomodoroTimer />
        </div>
        <div className="lg:col-span-2">
          <div className="oto-window overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
              <h3 className="flex min-w-0 items-center gap-2" style={{ ...pxH2, fontSize: '11px', color: 'var(--oto-text)' }}>
                历史记录
                <span className="truncate font-normal" style={{ fontFamily: 'var(--oto-font-body)', fontSize: '11px', color: 'var(--oto-text-muted)' }}>
                  （非标准番茄钟每满 25 分钟计 1 个，单次最多计 4 个；不足 25 分钟不计）
                </span>
              </h3>
              <div className="flex items-center gap-3">
                {sessions.length > 20 && (
                  <button onClick={() => setShowArchive(true)} className="oto-btn-sm oto-btn-gray">
                    <Icon name="archive" size={12} /> 归档 {sessions.length - 10}
                  </button>
                )}
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="oto-select">
                  <option value="">全部类型</option>
                  {Object.entries(POMODORO_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12 animate-fade-in">
                <Icon name="loading" size={32} className="animate-spin mb-2" />
                <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>加载中...</p>
              </div>
            ) : (
              <div>
                {sessions.length === 0 ? (
                  <div className="oto-empty">
                    <div className="oto-empty-icon"><Icon name="hourglass" size={48} /></div>
                    <p>暂无番茄钟记录</p>
                    <p style={{ fontSize: '15px', color: 'var(--oto-text-muted)', marginTop: '4px' }}>开始你的第一个专注吧！</p>
                  </div>
                ) : (
                  sessions.slice(0, 10).map(s => <SessionHistoryItem key={s.id} session={s} onDelete={handleDelete} expandedNotes={expandedNotes} onToggleNote={toggleNote} />)
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowArchive(false)}>
          <div className="oto-modal p-6 w-full max-h-[80vh] overflow-auto" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)' }}>
                <Icon name="archive" size={16} /> 已归档 · {sessions.length - 10} 条
              </h3>
              <button onClick={() => setShowArchive(false)} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
            </div>
            <div>
              {sessions.slice(10).map(s => <SessionHistoryItem key={s.id} session={s} onDelete={handleDelete} expandedNotes={expandedNotes} onToggleNote={toggleNote} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
