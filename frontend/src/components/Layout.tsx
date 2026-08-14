import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icons';
import type { IconName } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { isTokenSystemDisabled, isGuideDisabled, isOnboardingDisabled } from '../services/api';
import WhatsNewModal from './WhatsNewModal';
import { CHANGELOG } from '../data/changelog';

/* ── Nav data ── */
type NavItem = { to: string; label: string; icon: IconName; desc: string; accent?: 'gold' | 'blue' | 'red'; end?: boolean };

const baseSharedItems: NavItem[] = [
  { to: '/', label: '工作看板', icon: 'dashboard', desc: '全局概览', end: true },
  { to: '/tasks', label: '任务管理', icon: 'task', desc: '管理任务', accent: 'gold' },
  { to: '/projects', label: '项目管理', icon: 'folder', desc: '管理项目', accent: 'gold' },
];
const gachaItems: NavItem[] = [
  { to: '/gacha', label: '扭蛋机', icon: 'joystick', desc: '娱乐一下' },
  { to: '/showcase', label: '藏品室', icon: 'building', desc: '回顾成果' },
];
const singleCoreItems: { to: string; label: string; icon: IconName; desc: string; accent?: 'gold' | 'blue' }[] = [
  { to: '/daily-plans', label: '每日计划', icon: 'target', desc: '单核聚焦', accent: 'blue' },
  { to: '/reviews', label: '笔记本', icon: 'notebook', desc: '记录心得', accent: 'blue' },
];
const pomodoroItems: { to: string; label: string; icon: IconName; desc: string; accent?: 'gold' | 'blue' | 'red' }[] = [
  { to: '/pomodoro', label: '番茄钟', icon: 'tomato', desc: '专注执行', accent: 'red' },
  { to: '/quick-memos', label: '随手清单', icon: 'memo', desc: '快捷备忘', accent: 'red' },
];

/* ── Ornamental section header ── */
function SectionHeader({ label, color, desc, icon }: { label: string; color: string; desc: string; icon: IconName }) {
  return (
    <div className="px-3 mb-2">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={14} style={{ color, opacity: 0.7 }} />
        <span style={{
          fontFamily: 'var(--oto-font-title)', fontSize: '11px', fontWeight: 700,
          color, letterSpacing: '0.1em',
        }}>{label}</span>
        <span className="flex-1 flex items-center gap-1">
          <span className="h-px flex-1 opacity-25" style={{ background: color }} />
          <span style={{ fontSize: '6px', color, opacity: 0.5 }}>◆</span>
        </span>
      </div>
      <p style={{
        fontFamily: 'var(--oto-font-body)', fontSize: '11px', color: 'var(--oto-text-dim)',
        paddingLeft: '2px',
      }}>{desc}</p>
    </div>
  );
}

/* ── Nav item ── */
function NavItem({ to, icon, label, desc, end, accent }: {
  to: string; icon: IconName; label: string; desc?: string; end?: boolean; accent?: 'gold' | 'blue' | 'red';
}) {
  const activeColor = accent === 'blue' ? 'var(--oto-blue)' : accent === 'red' ? 'var(--oto-accent-alt)' : 'var(--oto-gold)';
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `oto-nav-item group flex items-center gap-3 px-3 py-2 mb-0.5 ${isActive ? 'active' : ''}`
      }>
      {({ isActive }) => (
        <>
          {/* Icon box */}
          <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 oto-inset transition-all duration-200"
            style={{
              borderColor: isActive ? 'var(--oto-gold)' : 'var(--oto-border-light)',
              boxShadow: isActive ? '0 0 6px rgba(200,160,64,0.3)' : 'none',
            }}>
            <Icon name={icon} size={16} />
          </span>
          {/* Label */}
          <div className="min-w-0 flex-1">
            <span style={{
              fontFamily: 'var(--oto-font-body)', fontSize: '14px', fontWeight: 600,
              color: isActive ? activeColor : 'var(--oto-text)',
            }}>{label}</span>
            {desc && (
              <span className="block" style={{ fontSize: '11px', color: 'var(--oto-text-dim)' }}>
                {desc}
              </span>
            )}
          </div>
          {/* Active dot */}
          {isActive && (
            <span className="w-1.5 h-1.5 flex-shrink-0" style={{
              background: 'var(--oto-gold)',
              boxShadow: '0 0 4px rgba(200,160,64,0.5)',
            }} />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // What's New 弹窗：版本更新后首次打开时自动弹出
  const [showWhatsNew, setShowWhatsNew] = useState(() => {
    try { return localStorage.getItem('last_seen_changelog_version') !== CHANGELOG[0]?.version } catch { return false }
  });

  // 关闭代币系统后移除扭蛋机和藏品室
  const [tokenDisabled, setTokenDisabled] = useState(isTokenSystemDisabled());
  // 关闭操作指南 / 新手教程后移除侧栏入口
  const [guideDisabled, setGuideDisabledState] = useState(isGuideDisabled());
  const [onboardingDisabled, setOnboardingDisabledState] = useState(isOnboardingDisabled());
  useEffect(() => {
    const handler = () => {
      setTokenDisabled(isTokenSystemDisabled());
      setGuideDisabledState(isGuideDisabled());
      setOnboardingDisabledState(isOnboardingDisabled());
    };
    window.addEventListener('oto:token-system-changed', handler);
    window.addEventListener('oto:settings-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('oto:token-system-changed', handler);
      window.removeEventListener('oto:settings-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const sharedItems = useMemo(
    () => tokenDisabled ? baseSharedItems : [...baseSharedItems, ...gachaItems],
    [tokenDisabled],
  );

  // 切换页面时自动关闭侧栏
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex" style={{ minHeight: '100dvh' }}>
      {/* ═══ MOBILE HEADER ═══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4" style={{
        background: 'linear-gradient(180deg, var(--oto-bg-header) 0%, #f0c8b0 100%)',
        borderBottom: '2px solid var(--oto-gold)',
        height: '48px',
      }}>
        <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--oto-text)', padding: '4px' }}>
          <Icon name="menu" size={22} />
        </button>
        <div className="flex items-center gap-1" style={{ position: 'relative', left: '5px' }}>
          <span style={{ marginLeft: '-8px', marginRight: '6px', display: 'inline-flex' }}><Icon name="target" size={14} /></span>
          <span style={{ fontFamily: 'var(--oto-font-title)', fontSize: '15px', fontWeight: 700, color: 'var(--oto-text)', letterSpacing: '0.3em' }}>MONO</span>
          <span style={{ fontFamily: 'var(--oto-font-title)', fontSize: '15px', fontWeight: 700, color: 'var(--oto-text)', letterSpacing: '0.3em' }}>POMO</span>
          <Icon name="tomato" size={14} />
        </div>
        <div style={{ width: '30px' }} />
      </div>

      {/* ═══ MOBILE OVERLAY ═══ */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }}
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen flex-shrink-0 flex flex-col oto-sidebar transition-transform duration-200 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{
          width: '220px', zIndex: 50,
          borderRight: '3px solid var(--oto-gold)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.2), inset -4px 0 8px rgba(0,0,0,0.05)',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(200,160,64,0.03) 30px, rgba(200,160,64,0.03) 31px),
            radial-gradient(ellipse at 50% 100%, rgba(200,160,64,0.06) 0%, transparent 60%)
          `,
        }}>

        {/* ── Brand Header ── */}
        <div className="relative" style={{
          background: 'linear-gradient(180deg, var(--oto-bg-header) 0%, #f0c8b0 100%)',
          borderBottom: '2px solid var(--oto-gold)',
        }}>
          {/* Sword watermark */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/sword.svg)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'calc(50% - 5px) center',
            backgroundSize: '40%',
            opacity: 0.1,
            filter: 'sepia(1) saturate(3) brightness(0.7)',
            pointerEvents: 'none',
          }} />
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-center">
              <div className="text-center" style={{ lineHeight: 1.1 }}>
                <div style={{
                  fontFamily: 'var(--oto-font-title)', fontSize: '22px', fontWeight: 700,
                  color: 'var(--oto-text)', letterSpacing: '0.5em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px',
                  paddingLeft: '10px',
                }}>
                  <span style={{ position: 'relative', left: '-13px' }}>M</span><span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '-13px', marginRight: '5px' }}><Icon name="target" size={20} /></span><span style={{ marginLeft: '8px' }}>N</span><span style={{ marginLeft: '4px' }}>O</span>
                </div>
                <div style={{
                  fontFamily: 'var(--oto-font-title)', fontSize: '22px', fontWeight: 700,
                  color: 'var(--oto-text)', letterSpacing: '0.5em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px',
                  marginTop: '4px',
                }}>
                  <span style={{ position: 'relative', left: '-2px' }}>P</span><span style={{ position: 'relative', left: '3px' }}>O</span><span style={{ position: 'relative', left: '5px' }}>M</span><span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', marginRight: '6px' }}><Icon name="tomato" size={24} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 p-3 space-y-5 overflow-auto" style={{
          scrollbarWidth: 'thin',
        }}>

          {/* Shared section */}
          <div>
            <div className="px-3 mb-1.5">
              <div className="flex items-center gap-2">
                <span style={{
                  fontFamily: 'var(--oto-font-title)', fontSize: '10px', fontWeight: 700,
                  color: 'var(--oto-text-dim)', letterSpacing: '0.1em', opacity: 0.7,
                }}>导 航</span>
                <span className="flex-1 h-px opacity-20" style={{ background: 'var(--oto-text-dim)' }} />
              </div>
            </div>
            {sharedItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 px-3">
            <span className="flex-1 h-px opacity-20" style={{ background: 'var(--oto-gold)' }} />
            <span style={{ fontSize: '7px', color: 'var(--oto-gold)', opacity: 0.6 }}>◆</span>
            <span className="flex-1 h-px opacity-20" style={{ background: 'var(--oto-gold)' }} />
          </div>

          {/* Single-Core section */}
          <div>
            <SectionHeader label="单核工作法" color="var(--oto-blue)" desc="战略规划 · 每日聚焦一件要事" icon="target" />
            {singleCoreItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 px-3">
            <span className="flex-1 h-px opacity-20" style={{ background: 'var(--oto-gold)' }} />
            <span style={{ fontSize: '7px', color: 'var(--oto-gold)', opacity: 0.6 }}>◆</span>
            <span className="flex-1 h-px opacity-20" style={{ background: 'var(--oto-gold)' }} />
          </div>

          {/* Pomodoro section */}
          <div>
            <SectionHeader label="番茄工作法" color="var(--oto-red)" desc="专注执行 · 25分钟心流冲刺" icon="tomato" />
            {pomodoroItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 px-3">
            <span className="flex-1 h-0.5 opacity-20" style={{ background: 'var(--oto-gold)' }} />
            <span style={{ fontSize: '7px', color: 'var(--oto-gold)', opacity: 0.6 }}>◆</span>
            <span className="flex-1 h-0.5 opacity-20" style={{ background: 'var(--oto-gold)' }} />
          </div>

          {/* Tip at nav bottom */}
          <div className="px-3" style={{ marginTop: '-4px' }}>
            <p style={{
              fontFamily: 'var(--oto-font-body)', fontSize: '11px',
              color: 'var(--oto-text-dim)', textAlign: 'center', lineHeight: 2.2,
            }}>
              若数据没有及时同步更新<br />
              尝试刷新页面或许会有用
            </p>
          </div>
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 space-y-1 relative" style={{
          borderTop: '2px solid var(--oto-gold)',
          background: 'linear-gradient(0deg, rgba(200,160,64,0.06) 0%, transparent 40%)',
        }}>
          <NavLink to="/guide" className={({ isActive }) =>
            `oto-nav-item group flex items-center gap-3 px-3 py-1.5 ${isActive ? 'active' : ''}`
          } style={guideDisabled ? { display: 'none' } : undefined}>
            <Icon name="book" size={16} />
            <span style={{
              fontFamily: 'var(--oto-font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--oto-text)',
            }}>操作指南</span>
          </NavLink>

          <NavLink to="/onboarding" className={({ isActive }) =>
            `oto-nav-item group flex items-center gap-3 px-3 py-1.5 ${isActive ? 'active' : ''}`
          } style={onboardingDisabled ? { display: 'none' } : undefined}>
            <Icon name="graduate" size={16} />
            <span style={{
              fontFamily: 'var(--oto-font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--oto-text)',
            }}>新手教程</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) =>
            `oto-nav-item group flex items-center gap-3 px-3 py-1.5 ${isActive ? 'active' : ''}`
          }>
            <Icon name="gear" size={16} />
            <span style={{
              fontFamily: 'var(--oto-font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--oto-text)',
            }}>设置</span>
          </NavLink>

          <div className="oto-ornament-divider" style={{ margin: '6px 0 2px' }}>
            <span style={{ fontSize: '9px' }}>单核定方向 · 番茄保执行</span>
          </div>

          {/* 退出登录 */}
          <button
            onClick={handleLogout}
            className="oto-nav-item w-full flex items-center gap-3 px-3 py-1.5"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
            title="退出登录"
          >
            <Icon name="logout" size={16} />
            <span style={{
              fontFamily: 'var(--oto-font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--oto-text)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>退出登录</span>
            {user && (
              <span style={{
                marginLeft: 'auto', fontSize: '11px', color: 'var(--oto-text-dim)',
                fontFamily: 'var(--oto-font-ui)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>{user?.email}</span>
            )}
          </button>

          <p className="text-center" style={{
            fontFamily: 'var(--oto-font-ui)', fontSize: '10px', color: 'var(--oto-text-dim)',
            letterSpacing: '0.06em', opacity: 0.8,
          }}>
            <span className="mr-1">By</span>
            <span
              style={{
                cursor: 'default',
                userSelect: 'none',
              }}
            >808-Stars</span>
          </p>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="oto-main-shell oto-board-frame flex-1 min-h-screen overflow-auto oto-plank-lines ml-0 md:ml-8 pt-14 md:pt-0" style={{ background: 'var(--oto-bg-main)' }}>
        <div className="oto-page-bar" />
        <div className="p-3 md:p-6 mx-auto" style={{ maxWidth: '1280px' }}>
          <Outlet />
        </div>
        {showWhatsNew && (
          <WhatsNewModal onClose={() => {
            try { localStorage.setItem('last_seen_changelog_version', CHANGELOG[0].version) } catch {}
            setShowWhatsNew(false);
          }} />
        )}
      </main>
    </div>
  );
}
