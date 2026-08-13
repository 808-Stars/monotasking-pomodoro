import { useEffect, useState } from 'react';
import { fetchQuickMemos, createQuickMemo, updateQuickMemo, deleteQuickMemo, addTokenRecord } from '../services/api';
import type { QuickMemo } from '../types';
import Icon from '../components/Icons';

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '19px' };

export default function QuickMemos() {
  const [memos, setMemos] = useState<QuickMemo[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedMemos(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const load = () => fetchQuickMemos().then(d => { setMemos(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const trimmed = input.trim(); if (!trimmed) return;
    setInput('');
    const created = await createQuickMemo(trimmed);
    setMemos(prev => [created, ...prev]);
    addTokenRecord(20, '创建清单', true, true).catch(() => {});
  };
  const handleToggle = async (memo: QuickMemo) => {
    const updated = await updateQuickMemo(memo.id, { is_done: !memo.is_done });
    setMemos(prev => prev.map(m => m.id === memo.id ? updated : m));
    if (!memo.is_done) addTokenRecord(20, '完成清单', true, true).catch(() => {});
  };
  const handleDelete = async (id: string) => { await deleteQuickMemo(id); setMemos(prev => prev.filter(m => m.id !== id)); };
  const handleClearDone = async () => {
    const doneIds = memos.filter(m => m.is_done).map(m => m.id);
    if (doneIds.length === 0) return;
    await Promise.all(doneIds.map(id => deleteQuickMemo(id)));
    setMemos(prev => prev.filter(m => !m.is_done));
  };

  const activeMemos = memos.filter(m => !m.is_done);
  const doneMemos = memos.filter(m => m.is_done);
  const recentDone = doneMemos.slice(0, 20);
  const archivedDone = doneMemos.slice(20);
  const [showDone, setShowDone] = useState(true);
  const [showArchive, setShowArchive] = useState(false);

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header */}
      <div className="oto-window oto-page-header-red rounded-none! p-5 oto-card-stamped relative" style={{ background: 'var(--oto-page-header-red)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="memo" size={20} /> 随手清单</h2>
            <p className="hidden md:block" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>番茄工作法 · 快速记录想法，轻便勾选完成</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>番茄工作法</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', marginTop: '2px' }}>快速记录想法，轻便勾选完成</p>
          </div>
          <span className="oto-badge oto-badge-red absolute top-7 right-7 md:static">{activeMemos.length} 待完成</span>
        </div>
      </div>

      {/* Input + List card */}
      <div className="oto-window overflow-hidden">
        {/* Inline input */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
          <span style={{ fontFamily: "'HYPixel'", color: '#8a3030', fontSize: '18px' }}>+</span>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="输入备忘内容，按 Enter 添加..."
            className="flex-1 border-none outline-none text-sm bg-transparent placeholder-gray-600 oto-input-glow transition-shadow duration-200"
            style={{ ...pxBody, color: 'var(--oto-text)' }} autoFocus />
        </div>

        {/* Active memos */}
        {loading ? (
          <div className="text-center py-12" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>加载中...</div>
        ) : activeMemos.length === 0 && doneMemos.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--oto-text-muted)' }}>
            <p className="text-4xl mb-3"><Icon name="memo" size={48} /></p>
            <p style={pxBody}>清单为空</p>
            <p className="text-xs mt-1" style={{ ...pxBody, fontSize: '14px' }}>在上方输入内容，按 Enter 快速添加</p>
          </div>
        ) : activeMemos.length === 0 ? (
          <div className="text-center py-8" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>全部完成！</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {activeMemos.map(memo => (
              <div key={memo.id} className="px-4 py-3 flex items-center gap-3 transition-colors group hover:bg-red-900/10">
                <button onClick={() => handleToggle(memo)}
                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center"
                  style={{ border: '3px solid #444', background: 'transparent' }} />
                <span className={`flex-1 text-sm select-none break-words cursor-pointer ${expandedMemos.has(memo.id) ? '' : 'line-clamp-1'}`} style={{ ...pxBody, color: '#4a3020' }} onClick={() => toggleExpand(memo.id)}>{memo.content}</span>
                <button onClick={() => handleDelete(memo.id)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0" title="删除"><Icon name="close" size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Done section - collapsible */}
      {doneMemos.length > 0 && (
        <div className="oto-window overflow-hidden">
          <button onClick={() => setShowDone(!showDone)}
            className="w-full px-4 py-3 flex items-center justify-between hover:brightness-110"
            style={{ background: 'var(--oto-bg-inset)' }}>
            <span style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }} className="md:!text-[18px]">
              <span className={`transition-transform ${showDone ? 'rotate-90' : ''}`}>▸</span>
              已完成 · {doneMemos.length} 项
            </span>
            <span className="flex items-center gap-3">
              {archivedDone.length > 0 && (
                <span onClick={e => { e.stopPropagation(); setShowArchive(true); }}
                  className="oto-btn-sm" style={{ padding: '2px 8px' }}>
                  <Icon name="archive" size={12} /> 归档 {archivedDone.length}
                </span>
              )}
              <span onClick={e => { e.stopPropagation(); handleClearDone(); }}
                className="oto-btn-sm oto-btn-red" style={{ padding: '2px 8px' }}>
                <Icon name="trash" size={12} /> 清空
              </span>
            </span>
          </button>
          {showDone && (
            <div className="divide-y divide-gray-800">
              {recentDone.map(memo => (
                <div key={memo.id} className="px-4 py-3 flex items-center gap-3 transition-colors group" style={{ background: '#e8d4a8' }}>
                  <button onClick={() => handleToggle(memo)}
                    className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-white"
                    style={{ background: '#205020', border: '3px solid #308030' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className={`flex-1 text-sm line-through select-none break-words cursor-pointer ${expandedMemos.has(memo.id) ? '' : 'line-clamp-1'}`} style={{ ...pxBody, color: '#a08060' }} onClick={() => toggleExpand(memo.id)}>{memo.content}</span>
                  <button onClick={() => handleDelete(memo.id)}
                    className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0" title="删除"><Icon name="close" size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs" style={{ ...pxBody, fontSize: '14px', color: '#a08060' }}>
        输入内容后按 Enter 添加<br className="md:hidden" />点击圆圈标记完成 · 悬停显示删除按钮
      </p>

      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowArchive(false)}>
          <div className="oto-modal p-6 w-full max-h-[80vh] overflow-auto" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)' }}>
                <Icon name="archive" size={16} /> 已归档 · {archivedDone.length} 项
              </h3>
              <button onClick={() => setShowArchive(false)} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
            </div>
            {archivedDone.length === 0 ? (
              <p className="text-center py-8" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无归档项</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {archivedDone.map(memo => (
                  <div key={memo.id} className="px-4 py-3 flex items-center gap-3 group" style={{ background: '#e8d4a8' }}>
                    <button onClick={() => handleToggle(memo)}
                      className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-white"
                      style={{ background: '#205020', border: '3px solid #308030' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span className={`flex-1 text-sm line-through select-none break-words cursor-pointer ${expandedMemos.has(memo.id) ? '' : 'line-clamp-1'}`} style={{ ...pxBody, color: '#a08060' }} onClick={() => toggleExpand(memo.id)}>{memo.content}</span>
                    <button onClick={() => handleDelete(memo.id)}
                      className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0" title="删除"><Icon name="close" size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
