import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, addTokenRecord,
} from '../services/api';
import type { Task, Project } from '../types';
import { TASK_STATUS_MAP, PRIORITY_MAP } from '../types';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icons';

const EMPTY_TASK: Partial<Task> = {
  name: '', description: '', priority: 'MEDIUM', status: 'TODO',
  project: null, estimated_pomodoros: 1, due_date: null,
};

const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [form, setForm] = useState<Partial<Task>>({ ...EMPTY_TASK });
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    if (filterProject) params.project_id = filterProject;
    if (search) params.search = search;
    fetchTasks(params).then(data => { setTasks(data); setLoading(false); });
  }, [filterStatus, filterPriority, filterProject, search]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchProjects().then(d => setProjects(d)); }, []);

  const openCreate = () => { setEditingTask(null); setForm({ ...EMPTY_TASK }); setShowForm(true); };
  const openEdit = (task: Task) => { setEditingTask(task); setForm({ ...task, due_date: task.due_date || '' }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.name?.trim()) { alert('请输入任务名称'); return; }
    const data = {
      name: form.name,
      description: form.description || '',
      priority: form.priority,
      status: form.status,
      project_id: form.project || null,
      estimated_pomodoros: Number(form.estimated_pomodoros) || 1,
      due_date: form.due_date || null,
    };
    if (editingTask?.id) {
      await updateTask(editingTask.id, data);
    } else {
      await createTask(data);
      addTokenRecord(20, '创建任务', true, true).catch(() => {});
    }
    setShowForm(false); load();
    // Broadcast: pomodoro page subscribes to this event to refresh task dropdown
    window.dispatchEvent(new Event('oto:tasks-changed'));
  };
  const handleDelete = async (id: string) => { if (!confirm('确定删除此任务？')) return; await deleteTask(id); load(); window.dispatchEvent(new Event('oto:tasks-changed')); };
  const handleAction = async (id: string, action: 'start' | 'complete' | 'archive') => {
    if (action === 'start') await updateTask(id, { status: 'IN_PROGRESS' });
    else if (action === 'complete') { await updateTask(id, { status: 'DONE' }); addTokenRecord(20, '完成任务', true, true).catch(() => {}); }
    else await updateTask(id, { status: 'ARCHIVED' });
    load();
    window.dispatchEvent(new Event('oto:tasks-changed'));
  };
  const handleRollback = async (task: Task) => {
    const prev: Record<string, Task['status']> = { IN_PROGRESS: 'TODO', DONE: 'IN_PROGRESS', ARCHIVED: 'TODO' };
    const newStatus = prev[task.status];
    if (newStatus) {
      await updateTask(task.id, { status: newStatus });
      load();
    }
  };

  return (
    <div className="space-y-6 oto-stagger">
      <div className="oto-window rounded-none! p-4 flex items-center justify-between oto-card-stamped">
        <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px', lineHeight: '2', color: 'var(--oto-text)' }}><Icon name="task" size={20} /> 任务管理</h2>
        <button onClick={openCreate} className="oto-btn"><Icon name="plus" size={14} /> 新建任务</button>
      </div>

      {/* Filters */}
      <div className="oto-window p-4 oto-filter-group">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input type="text" placeholder="搜索任务..." value={search} onChange={e => setSearch(e.target.value)}
            className="oto-input w-full pl-8" />
        </div>
        <span className="h-5 w-px mx-1 opacity-20" style={{ background: 'var(--oto-gold-dark)' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="oto-select oto-select-fit">
          <option value="">全部状态</option>
          {Object.entries(TASK_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="oto-select oto-select-fit">
          <option value="">全部优先级</option>
          {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="oto-select oto-select-fit">
          <option value="">全部项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filterStatus || filterPriority || filterProject || search) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterProject(''); setSearch(''); }}
            className="oto-btn-sm oto-btn-gray"><Icon name="close" size={12} /> 清除</button>
        )}
      </div>

      {/* Table — matches original fixed column widths */}
      {loading ? (
        <div className="oto-window p-12 text-center animate-fade-in">
          <Icon name="loading" size={36} className="animate-spin mb-3" />
          <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>加载中...</p>
        </div>
      ) : (
        <div className="oto-window overflow-hidden oto-card-lift">
          <table className="w-full text-sm oto-table oto-table-striped table-fixed">
            <colgroup>
              <col /><col className="w-[88px]" /><col className="w-[64px]" /><col className="w-[80px]" />
              <col className="w-[80px]" /><col className="w-[96px]" /><col className="w-[344px]" />
            </colgroup>
            <thead>
              <tr className="text-center">
                <th className="px-4 py-3 text-left">任务</th>
                <th className="px-4 py-3">项目</th>
                <th className="px-4 py-3">优先级</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">番茄钟</th>
                <th className="px-4 py-3">截止日期</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <Icon name="task" size={40} className="opacity-30 mb-3" />
                  <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无任务，点击上方「新建任务」开始</p>
                </td></tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 max-w-0 w-full">
                      <p className="font-medium truncate" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text)' }}>{task.name}</p>
                      {task.description && <p className="text-xs mt-0.5 truncate" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-muted)' }}>{task.description}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(task as any).projects?.name ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: (task as any).projects?.color }} />
                          <span style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{(task as any).projects?.name}</span>
                        </span>
                      ) : <span style={{ color: '#a08060' }}>-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center"><StatusBadge label={PRIORITY_MAP[task.priority]} status={task.priority} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-center"><StatusBadge label={TASK_STATUS_MAP[task.status]} status={task.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-center" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                      <span>{task.completed_pomodoros}/{task.estimated_pomodoros} <Icon name="tomato" size={13} /></span>
                      {task.today_pomodoros != null && (
                        <div style={{ fontSize: '11px', color: 'var(--oto-text-muted)', marginTop: 2 }}>
                          今日: {task.today_pomodoros}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-center" style={{ color: 'var(--oto-text-muted)' }}>{task.due_date || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="oto-actions">
                        {task.status === 'TODO' && (
                          <>
                            <button onClick={() => handleAction(task.id, 'start')} className="oto-btn-sm oto-btn-green"><Icon name="play" size={12} /> 开始</button>
                          </>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <>
                            <button onClick={() => handleAction(task.id, 'complete')} className="oto-btn-sm oto-btn-green"><Icon name="check" size={12} /> 完成</button>
                            <button onClick={() => handleAction(task.id, 'archive')} className="oto-btn-sm oto-btn-gray"><Icon name="archive" size={12} /> 归档</button>
                            <button onClick={() => handleRollback(task)} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                          </>
                        )}
                        {(task.status === 'DONE' || task.status === 'ARCHIVED') && (
                          <button onClick={() => handleRollback(task)} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                        )}
                        <button onClick={() => openEdit(task)} className="oto-btn-sm oto-btn-blue"><Icon name="edit" size={12} /> 编辑</button>
                        <button onClick={() => handleDelete(task.id)} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /> 删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — matches original positioning */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowForm(false)}>
          <div className="oto-modal p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)', marginBottom: '16px' }}>
              {editingTask ? '编辑任务' : '新建任务'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>任务名称 *</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="oto-input w-full" placeholder="输入任务名称" />
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>描述</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} className="oto-textarea w-full" placeholder="任务描述" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>优先级</label>
                  <select value={form.priority || 'MEDIUM'} onChange={e => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                    className="oto-select w-full">
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>状态</label>
                  <select value={form.status || 'TODO'} onChange={e => setForm({ ...form, status: e.target.value as Task['status'] })}
                    className="oto-select w-full">
                    {Object.entries(TASK_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>所属项目</label>
                  <select value={form.project || ''} onChange={e => setForm({ ...form, project: e.target.value || null })}
                    className="oto-select w-full">
                    <option value="">无</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>预估番茄钟数</label>
                  <input type="number" min={1} value={form.estimated_pomodoros || 1} onChange={e => setForm({ ...form, estimated_pomodoros: Number(e.target.value) })}
                    className="oto-input w-full" />
                </div>
                <div>
                  <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>截止日期</label>
                  <input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="oto-input w-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowForm(false)} className="oto-btn oto-btn-gray">取消</button>
              <button onClick={handleSave} className="oto-btn">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
