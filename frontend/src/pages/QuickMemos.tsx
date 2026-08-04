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

  const load = () => fetchQuickMemos().then(d => { setMemos(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const trimmed = input.trim(); if (!trimmed) return;
    setInput('');
    const created = await createQuickMemo(trimmed);
    setMemos(prev => [created, ...prev]);
    addTokenRecord(20, '创建清单').catch(() => {});
  };
  const handleToggle = async (memo: QuickMemo) => {
    const updated = await updateQuickMemo(memo.id, { is_done: !memo.is_done });
    setMemos(prev => prev.map(m => m.id === memo.id ? updated : m));
    if (!memo.is_done) addTokenRecord(20, '完成清单').catch(() => {});
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
  const [showDone, setShowDone] = useState(true);

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header */}
      <div className="oto-window oto-page-header-red rounded-none! p-5 oto-card-stamped" style={{ background: 'var(--oto-page-header-red)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="memo" size={20} /> 随手清单</h2>
            <p style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>番茄工作法 · 快速记录想法，轻便勾选完成</p>
          </div>
          <span className="oto-badge oto-badge-red">{activeMemos.length} 待完成</span>
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
            style={{ ...pxBody, color: '#a0f0b0' }} autoFocus />
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
                <span className="flex-1 text-sm select-none break-words" style={{ ...pxBody, color: '#4a3020' }}>{memo.content}</span>
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
            <span style={{ ...pxBody, color: 'var(--oto-text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`transition-transform ${showDone ? 'rotate-90' : ''}`}>▸</span>
              已完成 · {doneMemos.length} 项
            </span>
            <span onClick={e => { e.stopPropagation(); handleClearDone(); }}
              className="text-xs hover:text-red-400 cursor-pointer" style={{ fontFamily: "'HYPixel'", fontSize: '10px', color: 'var(--oto-text-muted)' }}>清空</span>
          </button>
          {showDone && (
            <div className="divide-y divide-gray-800">
              {doneMemos.map(memo => (
                <div key={memo.id} className="px-4 py-3 flex items-center gap-3 transition-colors group" style={{ background: '#e8d4a8' }}>
                  <button onClick={() => handleToggle(memo)}
                    className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-white"
                    style={{ background: '#205020', border: '3px solid #308030' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm line-through select-none break-words" style={{ ...pxBody, color: '#a08060' }}>{memo.content}</span>
                  <button onClick={() => handleDelete(memo.id)}
                    className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0" title="删除"><Icon name="close" size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs" style={{ ...pxBody, fontSize: '14px', color: '#a08060' }}>
        输入内容后按 Enter 添加 · 点击圆圈标记完成 · 悬停显示删除按钮
      </p>
    </div>
  );
}
