import { useEffect, useMemo, useState } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject, fetchTasks } from '../services/api';
import type { Project, Task } from '../types';
import { PROJECT_STATUS_MAP, TASK_STATUS_MAP, PRIORITY_MAP } from '../types';
import StatusBadge from '../components/StatusBadge';
import Icon from '../components/Icons';
import { useOnboarding } from '../contexts/OnboardingContext';
import { matchesSearch } from '../services/search';

const EMPTY: Partial<Project> = { name: '', description: '', color: '#687898', status: 'ACTIVE' };
const COLORS = ['#c83030', '#304868', '#d08030', '#308030', '#b09020', '#684878', '#c0c0c0', '#282020'];
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '17px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };

export default function Projects() {
  const { activeQuest, completeQuest } = useOnboarding();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>({ ...EMPTY });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [nameExpanded, setNameExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => fetchProjects().then(d => {
    const all = Array.isArray(d) ? d : [];
    const active = all.filter((p: any) => p.status !== 'ARCHIVED');
    // Client-side sorting
    const statusOrder: Record<string, number> = { ACTIVE: 0, COMPLETED: 1, ARCHIVED: 2 };
    active.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortBy === 'status') cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      else if (sortBy === 'task_count') cmp = (a.task_count ?? 0) - (b.task_count ?? 0);
      else cmp = (a.created_at || '').localeCompare(b.created_at || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    setProjects(active); setLoading(false);
  });
  useEffect(() => { load(); }, [sortBy, sortDir]);

  const visibleProjects = useMemo(() => projects.filter(p => matchesSearch(searchQuery, p.name, p.description, PROJECT_STATUS_MAP[p.status])), [projects, searchQuery]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (p: Project) => { setEditing(p); setForm({ ...p }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.name?.trim()) { alert('请输入项目名称'); return; }
    if (editing?.id) {
      await updateProject(editing.id, form);
    } else {
      await createProject(form as any);
      // 新手教程：只有从新手教程跳过来时才算创建项目步骤完成
      if (activeQuest?.id === 'create-project') completeQuest('create-project');
    }
    setShowForm(false); load();
  };
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此项目？关联的任务将被保留。')) return;
    await deleteProject(id); if (selectedProject?.id === id) { setSelectedProject(null); setViewingTask(null); } load();
  };
  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
    await updateProject(project.id, { name: project.name, description: project.description, color: project.color, status: newStatus }); load();
  };
  const openProjectDetail = async (p: Project) => {
    setSelectedProject(p); setTasksLoading(true); setNameExpanded(false); setDescExpanded(false);
    try { const data = await fetchTasks({ project_id: p.id }); setProjectTasks(data); }
    catch { setProjectTasks([]); } setTasksLoading(false);
  };
  const closeDetail = () => { setSelectedProject(null); setProjectTasks([]); setViewingTask(null); };
  const openArchive = async () => {
    const d = await fetchProjects();
    const all = Array.isArray(d) ? d : [];
    const archived = all.filter((p: any) => p.status === 'ARCHIVED');
    // fetchProjects 已通过 tasks(count) 返回任务数，归档弹窗无需再次逐项目查询。
    setArchivedProjects(archived);
    setShowArchive(true);
  };
  const todoCount = projectTasks.filter(t => t.status === 'TODO').length;
  const progressCount = projectTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = projectTasks.filter(t => t.status === 'DONE').length;
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6 oto-stagger">
      <div className="oto-window rounded-none! p-4 oto-card-stamped">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '18px', lineHeight: '2', color: 'var(--oto-text)' }}><Icon name="folder" size={20} /> 项目管理</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button onClick={openArchive} className="oto-btn oto-btn-gray flex-1 md:flex-none"><Icon name="archive" size={14} /> 已归档</button>
              <button onClick={openCreate} className="oto-btn flex-1 md:flex-none"><Icon name="plus" size={14} /> 新建项目</button>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="oto-select text-xs w-1/2 md:w-auto md:flex-none" style={{ textIndent: 0 }}>
                <option value="created_at">创建时间</option>
                <option value="name">项目名称</option>
                <option value="status">状态</option>
                <option value="task_count">任务数量</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="oto-btn oto-btn-gray w-1/2 md:w-auto md:flex-none" title={sortDir === 'asc' ? '升序' : '降序'}>
                排序{sortDir === 'asc' ? '↑' : '↓'}
              </button>
              <div className="flex items-center gap-2 flex-1 md:w-52 md:flex-none oto-input" style={{ padding: '6px 10px' }}>
                <Icon name="search" size={14} />
                <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索项目..."
                  className="w-full border-none outline-none bg-transparent text-sm" style={{ color: 'var(--oto-text)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="oto-window p-12 text-center animate-fade-in">
          <Icon name="loading" size={36} className="animate-spin mb-3" />
          <p style={{ ...pxBody, color: 'var(--oto-text-dim)' }}>加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProjects.map(p => (
            <div key={p.id} onClick={() => openProjectDetail(p)}
              className="oto-window cursor-pointer group oto-card-lift animate-fade-in-up oto-card-shimmer oto-tacked"
              style={{ borderLeftWidth: '4px', borderLeftColor: p.color }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-medium break-words line-clamp-1" style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }}>{p.name}</h3>
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
          {visibleProjects.length === 0 && <div className="col-span-full text-center py-12" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>{searchQuery.trim() ? '没有匹配的项目' : '暂无项目'}</div>}
        </div>
      )}

      {/* Detail Panel — 桌面端：右抽屉 / 移动端：居中弹窗（仅渲染当前匹配的容器） */}
      {selectedProject && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(6,8,12,0.75)' }} onClick={closeDetail} />
          <div className={isMobile
            ? 'fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-none'
            : 'fixed top-0 right-0 h-full w-full max-w-lg z-50 overflow-auto animate-slide-in-right oto-drawer-frame'}>
            <div className={isMobile ? 'w-full max-w-md max-h-[90vh] overflow-auto oto-drawer-frame pointer-events-auto' : 'contents'}>
            <div className="sticky top-0 z-10" style={{ background: 'var(--oto-bg-card)', borderBottom: '2px solid #1a2430' }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: selectedProject.color }} />
                      <h3 className={`font-bold break-words cursor-pointer ${nameExpanded ? '' : 'line-clamp-1'}`} style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }} onClick={() => setNameExpanded(!nameExpanded)}>{selectedProject.name}</h3>
                    </div>
                    <StatusBadge label={PROJECT_STATUS_MAP[selectedProject.status]} status={selectedProject.status} />
                  </div>
                  <button onClick={closeDetail} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
                </div>
                {selectedProject.description && <p className={`text-sm break-words cursor-pointer ${descExpanded ? '' : 'line-clamp-2'}`} style={{ ...pxBody, color: 'var(--oto-text-dim)' }} onClick={() => setDescExpanded(!descExpanded)}>{selectedProject.description}</p>}
              </div>
              <div className="px-5 pb-3 flex gap-4 text-xs flex-wrap" style={{ ...pxBody, fontSize: '15px' }}>
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
                    <div key={task.id} className="oto-window p-3 hover:brightness-110 cursor-pointer" onClick={() => setViewingTask(task)}>
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
          </div>
        </>
      )}

      {/* Task Detail Modal */}
      {viewingTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setViewingTask(null)}>
          <div className="oto-modal p-6 w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)', marginBottom: '16px' }}>
              <Icon name="task" size={16} /> 任务详情
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>任务名称</p>
                <p className="font-medium break-words" style={{ ...pxBody, fontSize: '18px', color: 'var(--oto-text)' }}>{viewingTask.name}</p>
              </div>
              {viewingTask.description && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>描述</p>
                  <p className="break-words" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{viewingTask.description}</p>
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
                  <p className="line-clamp-1" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{selectedProject?.name || '无'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--oto-text-muted)', ...pxSm }}>创建时间</p>
                  <p style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text-dim)' }}>{viewingTask.created_at ? new Date(viewingTask.created_at).toLocaleString('zh-CN') : '无'}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setViewingTask(null)} className="oto-btn oto-btn-gray">关闭</button>
            </div>
          </div>
        </div>
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
      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(6,8,12,0.85)' }} onClick={() => setShowArchive(false)}>
          <div className="oto-modal p-6 w-full max-h-[80vh] overflow-auto" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '14px', lineHeight: '1.8', color: 'var(--oto-text)' }}>
                <Icon name="archive" size={16} /> 已归档项目 · {archivedProjects.length} 项
              </h3>
              <button onClick={() => setShowArchive(false)} className="oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
            </div>
            {archivedProjects.length === 0 ? (
              <p className="text-center py-8" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>暂无归档项目</p>
            ) : (
              <div className="space-y-2">
                {archivedProjects.filter(p => matchesSearch(searchQuery, p.name, p.description, PROJECT_STATUS_MAP[p.status])).map(p => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:brightness-105 transition-all" style={{ borderLeft: `4px solid ${p.color}`, borderBottom: '1px solid var(--oto-border-light)' }} onClick={() => { setShowArchive(false); openProjectDetail(p); }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)' }}>{p.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--oto-text-dim)' }}>
                        <StatusBadge label={PROJECT_STATUS_MAP[p.status]} status={p.status} />
                        <span>{p.task_count ?? 0} 个任务</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { handleStatusChange(p, 'ACTIVE').then(() => { openArchive(); load(); }); }} className="oto-btn-sm oto-btn-gray"><Icon name="undo" size={12} /> 回退</button>
                      <button onClick={() => { if (confirm('确定删除？')) deleteProject(p.id).then(() => { openArchive(); load(); }); }} className="oto-btn-sm oto-btn-red"><Icon name="trash" size={12} /></button>
                    </div>
                  </div>
                ))}
                {archivedProjects.filter(p => matchesSearch(searchQuery, p.name, p.description, PROJECT_STATUS_MAP[p.status])).length === 0 && (
                  <p className="text-center py-8" style={{ ...pxBody, color: 'var(--oto-text-muted)' }}>没有匹配的归档项目</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
