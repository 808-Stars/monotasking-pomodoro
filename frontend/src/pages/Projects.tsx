import { useEffect, useState } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject, fetchTasks } from '../services/api';
import type { Project, Task } from '../types';
import { PROJECT_STATUS_MAP, TASK_STATUS_MAP, PRIORITY_MAP } from '../types';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icons';

const EMPTY: Partial<Project> = { name: '', description: '', color: '#687898', status: 'ACTIVE' };
const COLORS = ['#687898', '#308030', '#b08020', '#986868', '#786898', '#208080', '#b03080'];

const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '17px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>({ ...EMPTY });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const load = () => fetchProjects().then(d => { setProjects(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (p: Project) => { setEditing(p); setForm({ ...p }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.name?.trim()) { alert('请输入项目名称'); return; }
    if (editing?.id) await updateProject(editing.id, form); else await createProject(form as any);
    setShowForm(false); load();
  };
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此项目？关联的任务将被保留。')) return;
    await deleteProject(id); if (selectedProject?.id === id) setSelectedProject(null); load();
  };
  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
    await updateProject(project.id, { name: project.name, description: project.description, color: project.color, status: newStatus }); load();
  };
  const openProjectDetail = async (p: Project) => {
    setSelectedProject(p); setTasksLoading(true);
    try { const data = await fetchTasks({ project_id: p.id }); setProjectTasks(data); }
    catch { setProjectTasks([]); } setTasksLoading(false);
  };
  const closeDetail = () => { setSelectedProject(null); setProjectTasks([]); };
  const todoCount = projectTasks.filter(t => t.status === 'TODO').length;
  const progressCount = projectTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = projectTasks.filter(t => t.status === 'DONE').length;

  return (
    <div className="space-y-6 oto-stagger">
      <div className="oto-window rounded-none! p-4 flex items-center justify-between oto-card-stamped">
        <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px', lineHeight: '2', color: 'var(--oto-text)' }}><Icon name="folder" size={20} /> 项目管理</h2>
        <button onClick={openCreate} className="oto-btn"><Icon name="plus" size={14} /> 新建项目</button>
      </div>

      {loading ? (
        <div className="oto-window p-12 text-center animate-fade-in">
          <Icon name="loading" size={36} className="animate-spin mb-3" />
          <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} onClick={() => openProjectDetail(p)}
              className="oto-window cursor-pointer group oto-card-lift animate-fade-in-up oto-card-shimmer oto-tacked"
              style={{ borderLeftWidth: '4px', borderLeftColor: p.color }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-medium break-words" style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }}>{p.name}</h3>
                    <div className="mt-1"><StatusBadge label={PROJECT_STATUS_MAP[p.status]} status={p.status} /></div>
                  </div>
                </div>
                {p.description && <p className="text-sm mb-3 line-clamp-2" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>{p.description}</p>}
                <div className="flex items-center justify-between text-xs" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-muted)' }}>
                  <span className="font-medium" style={{ color: 'var(--oto-text-dim)' }}>{p.task_count ?? 0} 个任务</span>
                  <span>创建于 {new Date(p.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--oto-border-light)' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openProjectDetail(p)}
                    className="oto-btn-sm w-full"><Icon name="task" size={12} /> 查看任务</button>
                  <div className="flex gap-3">
                    {p.status === 'ACTIVE' && (<>
                      <button onClick={() => handleStatusChange(p, 'COMPLETED')} className="oto-btn-sm oto-btn-green flex-1"><Icon name="check" size={12} /> 完成</button>
                      <button onClick={() => handleStatusChange(p, 'ARCHIVED')} className="oto-btn-sm oto-btn-gray flex-1"><Icon name="archive" size={12} /> 归档</button>
                    </>)}
                    {(p.status === 'COMPLETED' || p.status === 'ARCHIVED') && (
                      <button onClick={() => handleStatusChange(p, 'ACTIVE')} className="oto-btn-sm oto-btn-gray flex-1"><Icon name="undo" size={12} /> 回退</button>
                    )}
                    <button onClick={() => openEdit(p)} className="oto-btn-sm oto-btn-gray"><Icon name="edit" size={12} /></button>
                    <button onClick={() => handleDelete(p.id)} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && <div className="col-span-full text-center py-12" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无项目</div>}
        </div>
      )}

      {/* Detail Slide-out Panel — matches original: fixed right, shadow-2xl */}
      {selectedProject && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(6,8,12,0.75)' }} onClick={closeDetail} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 overflow-auto animate-slide-in-right" style={{ background: 'var(--oto-bg-card)', boxShadow: '0 0 32px rgba(0,0,0,0.6)' }}>
            <div className="sticky top-0 z-10" style={{ background: 'var(--oto-bg-card)', borderBottom: '2px solid #1a2430' }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: selectedProject.color }} />
                      <h3 className="font-bold break-words" style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }}>{selectedProject.name}</h3>
                    </div>
                    <StatusBadge label={PROJECT_STATUS_MAP[selectedProject.status]} status={selectedProject.status} />
                  </div>
                  <button onClick={closeDetail} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
                </div>
                {selectedProject.description && <p className="text-sm break-words" style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>{selectedProject.description}</p>}
              </div>
              <div className="px-5 pb-3 flex gap-4 text-xs" style={{ ...pxBody, fontSize: '15px' }}>
                <span style={{ color: 'var(--oto-text-dim)' }}>共 <strong style={{ color: '#4a3020' }}>{projectTasks.length}</strong> 个任务</span>
                <span style={{ color: '#304868' }}>待办 <strong>{todoCount}</strong></span>
                <span style={{ color: '#f09040' }}>进行中 <strong>{progressCount}</strong></span>
                <span style={{ color: '#406838' }}>已完成 <strong>{doneCount}</strong></span>
              </div>
            </div>
            <div className="p-5">
              {tasksLoading ? (
                <div className="text-center py-12" style={{ color: 'var(--oto-text-muted)' }}>
                  <Icon name="loading" size={36} className="animate-spin mb-2" />
                  <p style={pxBody}>加载任务中...</p>
                </div>
              ) : projectTasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3"><Icon name="task" size={48} /></p>
                  <p style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>此项目下暂无任务</p>
                  <p style={{ ...pxBody, fontSize: '13px', color: '#a08060' }}>去「任务管理」页面创建并关联到此项目</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectTasks.map(task => (
                    <div key={task.id} className="oto-window p-3 hover:brightness-110">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)' }}>{task.name}</p>
                          {task.description && <p className="text-xs mt-0.5 truncate" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-muted)' }}>{task.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs" style={{ ...pxBody, fontSize: '13px', color: 'var(--oto-text-muted)' }}>
                            {task.due_date && <span><Icon name="calendar" size={12} /> {task.due_date}</span>}
                            <span><Icon name="tomato" size={12} /> {task.completed_pomodoros}/{task.estimated_pomodoros}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <StatusBadge label={PRIORITY_MAP[task.priority]} status={task.priority} />
                          <StatusBadge label={TASK_STATUS_MAP[task.status]} status={task.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 p-4" style={{ background: 'var(--oto-bg-card)', borderTop: '2px solid #1a2430' }}>
              <button onClick={closeDetail} className="oto-btn oto-btn-gray w-full">关闭</button>
            </div>
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowForm(false)}>
          <div className="oto-modal p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)', marginBottom: '16px' }}>{editing ? '编辑项目' : '新建项目'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>项目名称 *</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="oto-input w-full" />
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>描述</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="oto-textarea w-full" />
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>标签颜色</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      className={`oto-color-swatch w-7 h-7 ${form.color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-0.5" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>状态</label>
                <select value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })} className="oto-select w-full">
                  {Object.entries(PROJECT_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
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
