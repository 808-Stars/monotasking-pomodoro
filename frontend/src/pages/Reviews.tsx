import { useEffect, useState, useMemo } from 'react';
import { fetchReviews, createReview, updateReview, deleteReview, addTokenRecord } from '../services/api';
import { localDate } from '../utils/date';
import type { Review } from '../types';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icons';
import { useOnboarding } from '../contexts/OnboardingContext';

const REVIEW_TYPE_MAP: Record<string, string> = { DAILY: '日记', WEEKLY: '周记', MONTHLY: '月记' };
// default date 改在组件初始化时按 fakeDate 计算
const EMPTY: Partial<Review> = { type: 'DAILY', date: '', content: '', completed_tasks_count: 0, total_pomodoros: 0 };

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };

export default function Reviews() {
  const { activeQuest, completeQuest } = useOnboarding();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState<Partial<Review>>({ ...EMPTY });
  const [filterType, setFilterType] = useState('');
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);

  const load = () => { fetchReviews(filterType || undefined).then(d => { setReviews(d); setLoading(false); }); };
  const loadAll = () => { fetchReviews().then(setAllReviews); };
  useEffect(() => { load(); loadAll(); }, [filterType]);

  // fake-aware 今日日期（写新回顾时默认日期）
  const fakeTodayStr = localDate();

  const counts = useMemo(() => {
    const daily = allReviews.filter(r => r.type === 'DAILY').length;
    const weekly = allReviews.filter(r => r.type === 'WEEKLY').length;
    const monthly = allReviews.filter(r => r.type === 'MONTHLY').length;
    return { daily, weekly, monthly, total: allReviews.length };
  }, [allReviews]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, date: fakeTodayStr }); setShowForm(true); };
  const openEdit = (r: Review) => { setEditing(r); setForm({ ...r }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.content?.trim()) { alert('请输入回顾内容'); return; }
    const data = { ...form, completed_tasks_count: Number(form.completed_tasks_count) || 0, total_pomodoros: Number(form.total_pomodoros) || 0 };
    if (editing?.id) {
      await updateReview(editing.id, data);
    } else {
      await createReview(data as any);
      addTokenRecord(40, '写笔记', true, true).catch(() => {});
      // 新手教程：只有从新手教程跳过来时才算写笔记步骤完成
      if (activeQuest?.id === 'write-review') completeQuest('write-review');
    }
    setShowForm(false); load(); loadAll();
  };
  const handleDelete = async (id: string) => { if (!confirm('确定删除？')) return; await deleteReview(id); load(); loadAll(); };

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header — matches original */}
      <div className="oto-window oto-page-header-blue rounded-none! p-5 oto-card-stamped relative" style={{ background: 'var(--oto-page-header-blue)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="notebook" size={20} /> 笔记本</h2>
            <p className="hidden md:block" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>单核工作法 · 记录学习与工作心得</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>单核工作法</p>
            <p className="md:hidden" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)', marginTop: '2px' }}>记录学习与工作心得</p>
          </div>
          <div className="flex items-center gap-2 absolute top-7 right-7 md:static">
            <span className="oto-badge oto-badge-blue">日 {counts.daily}</span>
            <span className="oto-badge oto-badge-gold">周 {counts.weekly}</span>
            <span className="oto-badge" style={{ background: '#f0e4f4', color: '#3a2048', borderColor: '#b090c0' }}>月 {counts.monthly}</span>
          </div>
        </div>
      </div>

      {/* Filter bar — matches original flex between */}
      <div className="oto-window p-4 flex items-center justify-between">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="oto-select oto-select-fit" style={{ textIndent: '8px', paddingLeft: '12px' }}>
          <option value="">全部类型</option>
          {Object.entries(REVIEW_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={openCreate} className="oto-btn">+ 新建回顾</button>
      </div>

      {/* Reviews list — matches original space-y-4 */}
      {loading ? (
        <div className="text-center py-12" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>加载中...</div>
      ) : (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12 oto-window" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无回顾记录</div>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="oto-window p-5 oto-card-lift oto-tacked" style={{
                borderLeftWidth: '4px',
                borderLeftColor: r.type === 'DAILY' ? '#304868' : r.type === 'WEEKLY' ? '#8a6820' : '#504868',
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 style={{ ...pxH2, fontSize: '11px', color: 'var(--oto-text)' }}>{r.date}</h3>
                    <StatusBadge label={REVIEW_TYPE_MAP[r.type] || r.type} status={r.type} />
                  </div>
                  <div className="flex gap-2 text-sm" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                    <span><Icon name="check" size={12} /> {r.completed_tasks_count} 任务</span>
                    <span><Icon name="tomato" size={12} /> {r.total_pomodoros} 番茄钟</span>
                  </div>
                </div>
                <div className="oto-quote cursor-pointer" style={{ fontSize: '16px' }} onClick={() => setViewingReview(r)}>
                  <p className="whitespace-pre-wrap break-words line-clamp-3" style={{ ...pxBody, fontSize: '16px', color: '#4a3020' }}>{r.content}</p>
                </div>
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--oto-border-light)' }}>
                  <button onClick={() => openEdit(r)} className="oto-btn-sm oto-btn-gray"><Icon name="edit" size={12} /> 编辑</button>
                  <button onClick={() => handleDelete(r.id)} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /> 删除</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Form Modal — matches original */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowForm(false)}>
          <div className="oto-modal p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)', marginBottom: '16px' }}>{editing ? '编辑回顾' : '新建回顾'}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>类型</label>
                  <select value={form.type || 'DAILY'} onChange={e => setForm({ ...form, type: e.target.value as Review['type'] })} className="oto-select w-full">
                    {Object.entries(REVIEW_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>日期</label>
                  <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} className="oto-input w-full" />
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>完成任务数</label>
                  <input type="number" min={0} value={form.completed_tasks_count || 0} onChange={e => setForm({ ...form, completed_tasks_count: Number(e.target.value) })} className="oto-input w-full" />
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>番茄钟总数</label>
                  <input type="number" min={0} value={form.total_pomodoros || 0} onChange={e => setForm({ ...form, total_pomodoros: Number(e.target.value) })} className="oto-input w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>回顾内容 *</label>
                <textarea value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} rows={5}
                  className="oto-textarea w-full" placeholder="记录你的收获、反思和改进方向..." />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowForm(false)} className="oto-btn oto-btn-gray">取消</button>
              <button onClick={handleSave} className="oto-btn">保存</button>
            </div>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {viewingReview && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setViewingReview(null)}>
          <div className="oto-modal p-6 w-full max-h-[80vh] overflow-auto" style={{ maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)' }}>{viewingReview.date}</h3>
                <StatusBadge label={REVIEW_TYPE_MAP[viewingReview.type] || viewingReview.type} status={viewingReview.type} />
              </div>
              <div className="flex gap-2 text-sm" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>
                <span><Icon name="check" size={12} /> {viewingReview.completed_tasks_count} 任务</span>
                <span><Icon name="tomato" size={12} /> {viewingReview.total_pomodoros} 番茄钟</span>
              </div>
            </div>
            <div className="oto-quote" style={{ fontSize: '16px' }}>
              <p className="whitespace-pre-wrap break-words" style={{ ...pxBody, fontSize: '16px', color: '#4a3020' }}>{viewingReview.content}</p>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setViewingReview(null)} className="oto-btn oto-btn-gray">关闭</button>
              <button onClick={() => { setViewingReview(null); openEdit(viewingReview); }} className="oto-btn oto-btn-blue"><Icon name="edit" size={14} /> 编辑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
