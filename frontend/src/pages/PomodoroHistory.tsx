import { useEffect, useState } from 'react';
import { fetchPomodoroSessions, getPomodoroStats, deletePomodoroSession } from '../services/api';
import type { PomodoroSession, PomodoroStats } from '../types';
import { POMODORO_TYPE_MAP, POMODORO_STATUS_MAP } from '../types';
import PomodoroTimer from '../components/PomodoroTimer';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import Icon from '../components/Icons';

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

export default function PomodoroHistory() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

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
      <div className="oto-window oto-page-header-red rounded-none! p-5 oto-card-shimmer oto-card-stamped" style={{ background: 'var(--oto-page-header-red)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="hourglass" size={20} /> 番茄钟</h2>
            <p style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>番茄工作法 · 25分钟专注 + 5分钟休息的节奏</p>
          </div>
          <span className="oto-badge oto-badge-red">执行层</span>
        </div>
      </div>

      {/* Stats — 4 columns matching original */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatsCard title="今日" value={stats.today} icon="sun" color="text-orange-400" />
          <StatsCard title="本周" value={stats.this_week} icon="calendar" color="text-blue-400" />
          <StatsCard title="本月" value={stats.this_month} icon="chart" color="text-purple-400" />
          <StatsCard title="总计" value={stats.total} icon="trophy" color="text-green-400" />
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
              <h3 style={{ ...pxH2, fontSize: '11px', color: 'var(--oto-text)' }}>历史记录</h3>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="oto-select">
                <option value="">全部类型</option>
                {Object.entries(POMODORO_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
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
                  sessions.map(s => (
                    <div key={s.id} className="px-4 py-3 flex items-start justify-between transition-all hover:brightness-105" style={{
                      borderLeft: `3px solid ${s.type === 'WORK' ? '#8a3030' : s.type === 'SHORT_BREAK' ? '#406838' : '#304868'}`,
                      borderBottom: '1px solid var(--oto-border-light)',
                    }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text)' }}>{s.tasks?.name || '未关联任务'}</span>
                          <StatusBadge label={POMODORO_TYPE_MAP[s.type] || s.type} status={s.type} />
                          <StatusBadge label={POMODORO_STATUS_MAP[s.status] || s.status} status={s.status} />
                        </div>
                        <div className="flex gap-4 mt-1 text-xs" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>
                          <span>{new Date(s.start_time).toLocaleString('zh-CN')}</span>
                          {s.end_time && <span>→ {new Date(s.end_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
                          <span>{s.duration_minutes} 分钟</span>
                        </div>
                        {s.notes && <p className="text-xs mt-1 break-words" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}><Icon name="notebook" size={14} /> {s.notes}</p>}
                        {s.interruption_reason && <p className="text-xs mt-1" style={{ ...pxBody, fontSize: '14px', color: '#f09040' }}><Icon name="alert" size={14} /> 中断原因: {s.interruption_reason}</p>}
                      </div>
                      <button onClick={() => handleDelete(s.id)} className="oto-btn-sm oto-btn-red ml-3">删除</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
