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
import { useOnboarding } from '../contexts/OnboardingContext';

const EMPTY_TASK: Partial<Task> = {
  name: '', description: '', priority: 'MEDIUM', status: 'TODO',
  project: null, estimated_pomodoros: 1, due_date: null,
};

const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };

export default function Tasks() {
  const { activeQuest, completeQuest } = useOnboarding();
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
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [detailNameExpanded, setDetailNameExpanded] = useState(false);
  const [detailDescExpanded, setDetailDescExpanded] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    if (filterProject) params.project_id = filterProject;
    if (search) params.search = search;
    fetchTasks(params).then(data => {
      let filtered = filterStatus === 'ARCHIVED' ? data : (Array.isArray(data) ? data : []).filter((t: any) => t.status !== 'ARCHIVED');
      // Client-side sorting
      const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const statusOrder: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, DONE: 2, ARCHIVED: 3 };
      filtered = [...filtered].sort((a: any, b: any) => {
        let cmp = 0;
        if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
        else if (sortBy === 'priority') cmp = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        else if (sortBy === 'status') cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        else if (sortBy === 'due_date') cmp = (a.due_date || 'z').localeCompare(b.due_date || 'z');
        else if (sortBy === 'pomodoros') cmp = (a.completed_pomodoros || 0) - (b.completed_pomodoros || 0);
        else if (sortBy === 'project') cmp = ((a as any).projects?.name || 'zzz').localeCompare((b as any).projects?.name || 'zzz');
        else cmp = (a.created_at || '').localeCompare(b.created_at || '');
        return sortDir === 'asc' ? cmp : -cmp;
      });
      setTasks(filtered); setLoading(false);
    });
  }, [filterStatus, filterPriority, filterProject, search, sortBy, sortDir]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchProjects().then(d => setProjects(d)); }, []);

  const openCreate = () => { setEditingTask(null); setForm({ ...EMPTY_TASK }); setShowForm(true); };
  const openEdit = (task: Task) => { setEditingTask(task); setForm({ ...task, project: (task as any).project_id || null, due_date: task.due_date || '' }); setShowForm(true); };
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
      // 新手教程：只有从新手教程跳过来时才算创建任务步骤完成
      if (activeQuest?.id === 'create-task') completeQuest('create-task');
    }
    setShowForm(false); load();
    // Broadcast: pomodoro page subscribes to this event to refresh task dropdown
    window.dispatchEvent(new Event('oto:tasks-changed'));
  };
  const handleDelete = async (id: string) => { if (!confirm('确定删除此任务？')) return; await deleteTask(id); load(); window.dispatchEvent(new Event('oto:tasks-changed')); };
  const handleAction = async (id: string, action: 'start' | 'complete' | 'archive') => {
    if (action === 'start') await updateTask(id, { status: 'IN_PROGRESS' });
    else if (action === 'complete') {
      await updateTask(id, { status: 'DONE' });
      addTokenRecord(20, '完成任务', true, true).catch(() => {});
      // 新手教程：只有从新手教程跳过来时才算完成任务步骤完成
      if (activeQuest?.id === 'complete-task') completeQuest('complete-task');
    }
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
      window.dispatchEvent(new Event('oto:tasks-changed'));
    }
  };
  const openArchive = () => {
    fetchTasks({ status: 'ARCHIVED' }).then(d => { setArchivedTasks(Array.isArray(d) ? d : []); setShowArchive(true); });
  };

  return (
    <div className="space-y-6 oto-stagger">
      <div className="oto-window rounded-none! p-4 oto-card-stamped">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px', lineHeight: '2', color: 'var(--oto-text)' }}><Icon name="task" size={20} /> 任务管理</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={openArchive} className="oto-btn oto-btn-gray w-1/2 md:w-auto md:flex-none"><Icon name="archive" size={14} /> 已归档</button>
            <button onClick={openCreate} className="oto-btn w-1/2 md:w-auto md:flex-none"><Icon name="plus" size={14} /> 新建任务</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="oto-window p-4 space-y-3">
        <input type="text" placeholder="搜索任务..." value={search} onChange={e => setSearch(e.target.value)}
          className="oto-input w-full" />
        <div className="grid grid-cols-3 gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="oto-select w-full" style={{ textIndent: 0 }}>
            <option value="">全部状态</option>
            {Object.entries(TASK_STATUS_MAP).filter(([k]) => k !== 'ARCHIVED').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="oto-select w-full" style={{ textIndent: 0 }}>
            <option value="">全部优先级</option>
            {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="oto-select w-full" style={{ textIndent: 0 }}>
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="oto-select w-full" style={{ textIndent: 0 }}>
            <option value="created_at">创建时间</option>
            <option value="name">任务名称</option>
            <option value="priority">优先级</option>
            <option value="status">状态</option>
            <option value="due_date">截止日期</option>
            <option value="pomodoros">完成番茄数</option>
            <option value="project">所属项目</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="oto-btn oto-btn-gray flex-shrink-0" title={sortDir === 'asc' ? '升序' : '降序'}>
            排序{sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        {(filterStatus || filterPriority || filterProject || search) && (
          <div className="text-center">
            <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterProject(''); setSearch(''); }}
              className="oto-btn-sm oto-btn-gray"><Icon name="close" size={12} /> 清除</button>
          </div>
        )}
      </div>

      {/* Table — matches original fixed column widths */}
      {loading ? (
        <div className="oto-window p-12 text-center animate-fade-in">
          <Icon name="loading" size={36} className="animate-spin mb-3" />
          <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>加载中...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="oto-window p-12 text-center">
          <Icon name="task" size={40} className="opacity-30 mb-3" />
          <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无任务，点击上方「新建任务」开始</p>
        </div>
      ) : (
        <>
          {/* 手机端：卡片列表 */}
          <div className="md:hidden space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="oto-window p-3 space-y-1.5 cursor-pointer hover:brightness-105 transition-all" onClick={() => { setViewingTask(task); setDetailNameExpanded(false); setDetailDescExpanded(false); }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium flex-1 min-w-0" style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</p>
                  {(task as any).projects?.name && (
                    <span className="flex items-center gap-1 flex-shrink-0 text-xs" style={{ color: 'var(--oto-text-dim)' }}>
                      <span className="w-1.5 h-1.5" style={{ backgroundColor: (task as any).projects?.color }} />
                      {((task as any).projects?.name?.length > 5 ? (task as any).projects?.name.slice(0, 5) + '…' : (task as any).projects?.name)}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs" style={{ color: 'var(--oto-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--oto-text-dim)' }}>
                  <StatusBadge label={PRIORITY_MAP[task.priority]} status={task.priority} />
                  <StatusBadge label={TASK_STATUS_MAP[task.status]} status={task.status} />
                  <span><Icon name="tomato" size={11} /> {task.completed_pomodoros}/{task.estimated_pomodoros}</span>
                  {task.due_date && <span>{task.due_date} 截止</span>}
                  {task.created_at && <span>{new Date(task.created_at).toLocaleDateString('zh-CN')} 创建</span>}
                </div>
                <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                  {task.status === 'TODO' && (
                    <button onClick={() => handleAction(task.id, 'start')} className="oto-btn-sm oto-btn-green"><Icon name="play" size={12} /> 开始</button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <>
                      <button onClick={() => handleAction(task.id, 'complete')} className="oto-btn-sm oto-btn-green"><Icon name="check" size={12} /> 完成</button>
                      <button onClick={() => handleRollback(task)} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                    </>
                  )}
                  {(task.status === 'DONE' || task.status === 'ARCHIVED') && (
                    <>
                      {task.status === 'DONE' && (
                        <button onClick={() => handleAction(task.id, 'archive')} className="oto-btn-sm oto-btn-gray"><Icon name="archive" size={12} /> 归档</button>
                      )}
                      <button onClick={() => handleRollback(task)} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                    </>
                  )}
                  <button onClick={() => openEdit(task)} className="oto-btn-sm oto-btn-blue"><Icon name="edit" size={12} /> 编辑</button>
                  {task.status === 'TODO' && <button onClick={() => handleDelete(task.id)} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /> 删除</button>}
                </div>
              </div>
            ))}
          </div>

          {/* 桌面端：表格 */}
          <div className="hidden md:block oto-window overflow-x-auto oto-card-lift">
            <table className="w-full text-sm oto-table oto-table-striped">
              <thead>
                <tr className="text-center">
                  <th className="px-4 py-3 text-left" style={{ width: '35%' }}>任务</th>
                  <th className="px-4 py-3" style={{ width: '8%' }}>项目</th>
                  <th className="px-4 py-3">优先级</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">番茄钟</th>
                  <th className="px-4 py-3">截止日期</th>
                  <th className="px-4 py-3">创建时间</th>
                  <th className="px-4 py-3" style={{ width: '20%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 max-w-0" style={{ width: '35%' }}>
                      <p className="font-medium truncate cursor-pointer hover:underline" style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text)' }} onClick={() => { setViewingTask(task); setDetailNameExpanded(false); setDetailDescExpanded(false); }}>{task.name}</p>
                      {task.description && <p className="text-xs mt-0.5 truncate" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-muted)' }}>{task.description}</p>}
                    </td>
                    <td className="px-4 py-3" style={{ width: '8%' }}>
                      {(task as any).projects?.name ? (
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: (task as any).projects?.color }} />
                          <span className="truncate" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{(task as any).projects?.name?.length > 5 ? (task as any).projects?.name.slice(0, 5) + '…' : (task as any).projects?.name}</span>
                        </span>
                      ) : <span style={{ color: '#a08060' }}>-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center"><StatusBadge label={PRIORITY_MAP[task.priority]} status={task.priority} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-center"><StatusBadge label={TASK_STATUS_MAP[task.status]} status={task.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-center" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>
                      {task.completed_pomodoros}/{task.estimated_pomodoros} <Icon name="tomato" size={13} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-center" style={{ color: 'var(--oto-text-muted)' }}>{task.due_date || '-'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-center" style={{ color: 'var(--oto-text-muted)' }}>{task.created_at ? new Date(task.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="oto-actions">
                        {task.status === 'TODO' && (
                          <button onClick={() => handleAction(task.id, 'start')} className="oto-btn-sm oto-btn-green"><Icon name="play" size={12} /> 开始</button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <>
                            <button onClick={() => handleAction(task.id, 'complete')} className="oto-btn-sm oto-btn-green"><Icon name="check" size={12} /> 完成</button>
                            <button onClick={() => handleRollback(task)} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                          </>
                        )}
                        {(task.status === 'DONE' || task.status === 'ARCHIVED') && (
                          <>
                            {task.status === 'DONE' && (
                              <button onClick={() => handleAction(task.id, 'archive')} className="oto-btn-sm oto-btn-gray"><Icon name="archive" size={12} /> 归档</button>
                            )}
                            <button onClick={() => handleRollback(task)} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                          </>
                        )}
                        <button onClick={() => openEdit(task)} className="oto-btn-sm oto-btn-blue"><Icon name="edit" size={12} /> 编辑</button>
                        {task.status === 'TODO' && <button onClick={() => handleDelete(task.id)} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /> 删除</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name}</option>)}
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
      {/* Detail Modal */}
      {viewingTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setViewingTask(null)}>
          <div className="oto-modal p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)', marginBottom: '16px' }}>
              <Icon name="task" size={16} /> 任务详情
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>任务名称</p>
                <p className={`font-medium break-words cursor-pointer ${detailNameExpanded ? '' : 'line-clamp-1'}`} style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }} onClick={() => setDetailNameExpanded(!detailNameExpanded)}>{viewingTask.name}</p>
              </div>
              {viewingTask.description && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>描述</p>
                  <p className={`break-words cursor-pointer ${detailDescExpanded ? '' : 'line-clamp-2'}`} style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }} onClick={() => setDetailDescExpanded(!detailDescExpanded)}>{viewingTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>优先级</p>
                  <StatusBadge label={PRIORITY_MAP[viewingTask.priority]} status={viewingTask.priority} />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>状态</p>
                  <StatusBadge label={TASK_STATUS_MAP[viewingTask.status]} status={viewingTask.status} />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>番茄钟</p>
                  <p style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{viewingTask.completed_pomodoros}/{viewingTask.estimated_pomodoros} <Icon name="tomato" size={13} /></p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>截止日期</p>
                  <p style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{viewingTask.due_date || '无'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>所属项目</p>
                  <p className="line-clamp-1" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{(viewingTask as any).projects?.name || '无'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>创建时间</p>
                  <p style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{viewingTask.created_at ? new Date(viewingTask.created_at).toLocaleString('zh-CN') : '无'}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setViewingTask(null)} className="oto-btn oto-btn-gray">关闭</button>
              <button onClick={() => { setViewingTask(null); openEdit(viewingTask); }} className="oto-btn oto-btn-blue"><Icon name="edit" size={14} /> 编辑</button>
            </div>
          </div>
        </div>
      )}
      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowArchive(false)}>
          <div className="oto-modal p-6 w-full max-h-[80vh] overflow-auto" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)' }}>
                <Icon name="archive" size={16} /> 已归档任务 · {archivedTasks.length} 项
              </h3>
              <button onClick={() => setShowArchive(false)} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
            </div>
            {archivedTasks.length === 0 ? (
              <p className="text-center py-8" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无归档任务</p>
            ) : (
              <div className="space-y-2">
                {archivedTasks.map(task => (
                  <div key={task.id} className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:brightness-105 transition-all" style={{ borderBottom: '1px solid var(--oto-border-light)' }} onClick={() => { setViewingTask(task); setDetailNameExpanded(false); setDetailDescExpanded(false); setShowArchive(false); }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)' }}>{task.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--oto-text-dim)' }}>
                        <StatusBadge label={PRIORITY_MAP[task.priority]} status={task.priority} />
                        <span><Icon name="tomato" size={11} /> {task.completed_pomodoros}/{task.estimated_pomodoros}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { handleRollback(task).then(() => { openArchive(); load(); }); }} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                      <button onClick={() => { if (confirm('确定删除？')) deleteTask(task.id).then(() => { openArchive(); load(); }); }} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /></button>
                    </div>
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
