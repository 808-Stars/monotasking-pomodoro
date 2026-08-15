import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'
import {
  isTokenSystemDisabled,
  setTokenSystemDisabled,
  isGuideDisabled,
  setGuideDisabled,
  isOnboardingDisabled,
  setOnboardingDisabled,
  fetchFeedback,
  submitFeedback,
  fetchComments,
  submitComment,
  getCurrentUsername,
  updateUsername,
  updatePassword,
  updateEmail,
  requestPasswordReset,
  type FeedbackEntry,
  type FeedbackComment,
} from '../services/api';
import Icon from '../components/Icons';
import StatusBadge from '../components/StatusBadge';
import WhatsNewModal from '../components/WhatsNewModal';
import { CHANGELOG, type ChangelogEntry } from '../data/changelog';

const FEEDBACK_TYPE_MAP: Record<FeedbackEntry['type'], string> = {
  bug: 'Bug',
  suggestion: '建议',
  question: '疑问',
  general: '综合',
};

const FEEDBACK_TYPE_OPTIONS: { value: FeedbackEntry['type']; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: '建议' },
  { value: 'question', label: '疑问' },
  { value: 'general', label: '综合' },
];

const pxH2: React.CSSProperties = { fontFamily: 'var(--oto-font-title)', fontSize: '20px', lineHeight: '2' };
const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
const pxSm = { fontFamily: 'var(--oto-font-body)', fontSize: '12px', letterSpacing: '0' };

export default function Settings() {
  // ── 关闭代币系统 toggle ──
  const [tokenDisabled, setTokenDisabled] = useState(isTokenSystemDisabled());
  const handleToggleTokenSystem = () => {
    const nextDisabled = !tokenDisabled;
    if (nextDisabled) {
      if (!confirm('确定要关闭代币系统吗？\n\n• 扭蛋机和藏品室将从侧栏隐藏\n• 完成任务、番茄钟等操作不受影响\n\n可在本页随时重新开启。')) return;
    }
    setTokenSystemDisabled(nextDisabled);
    setTokenDisabled(nextDisabled);
  };

  // ── 开发者日志弹窗 ──
  const [modalEntry, setModalEntry] = useState<ChangelogEntry | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ── 关闭操作指南 toggle ──
  const [guideDisabled, setGuideDisabledState] = useState(isGuideDisabled());
  const handleToggleGuide = () => {
    const next = !guideDisabled;
    if (next) {
      if (!confirm('确定要关闭操作指南吗？\n\n侧栏将不再显示「操作指南」入口。')) return;
    }
    setGuideDisabled(next);
    setGuideDisabledState(next);
  };

  // ── 关闭新手教程 toggle ──
  const [onboardingDisabled, setOnboardingDisabledState] = useState(isOnboardingDisabled());
  const handleToggleOnboarding = () => {
    const next = !onboardingDisabled;
    if (next) {
      if (!confirm('确定要关闭新手教程吗？\n\n侧栏将不再显示「新手教程」入口。')) return;
    }
    setOnboardingDisabled(next);
    setOnboardingDisabledState(next);
  };

  // ── 用户反馈 ──
  const [feedbackType, setFeedbackType] = useState<FeedbackEntry['type']>('bug');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [feedbackError, setFeedbackError] = useState('');
  const [showAllFeedback, setShowAllFeedback] = useState(false);

  // ===== Account settings modals =====
  const [accountModal, setAccountModal] = useState<'username' | 'email' | 'password' | 'forgot' | null>(null);
  const [modalStep, setModalStep] = useState<'verify' | 'edit'>('verify');
  const [modalCurrentPw, setModalCurrentPw] = useState('');
  const [modalNewUsername, setModalNewUsername] = useState('');
  const [modalNewEmail, setModalNewEmail] = useState('');
  const [modalNewPw, setModalNewPw] = useState('');
  const [modalConfirmPw, setModalConfirmPw] = useState('');
  const [modalEmail, setModalEmail] = useState('');

  // ── 账户设置 ──
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  const { signIn } = useAuth();
  useEffect(() => {
    getCurrentUsername().then(setCurrentUsername).catch(() => {});
  }, []);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    setAccountLoading(true); setAccountError(''); setAccountSuccess('');
    try {
      await updateUsername(newUsername.trim());
      setCurrentUsername(newUsername.trim());
      setNewUsername('');
      setAccountSuccess('用户名修改成功');
    } catch (e: any) { setAccountError(e?.message || '修改失败'); }
    finally { setAccountLoading(false); }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) { setAccountError('请输入当前密码'); return; }
    if (!newPassword) { setAccountError('请输入新密码'); return; }
    if (newPassword !== confirmPassword) { setAccountError('两次输入的密码不一致'); return; }
    setAccountLoading(true); setAccountError(''); setAccountSuccess('');
    try {
      const { error: verifyErr } = await signIn(currentUsername || '', currentPassword);
      if (verifyErr) { setAccountError('当前密码错误'); setAccountLoading(false); return; }
      await updatePassword(newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setAccountSuccess('密码修改成功');
    } catch (e: any) { setAccountError(e?.message || '修改失败'); }
    finally { setAccountLoading(false); }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setAccountLoading(true); setAccountError(''); setAccountSuccess('');
    try {
      await updateEmail(newEmail.trim());
      setNewEmail('');
      setAccountSuccess('邮箱修改成功，请查收确认邮件');
    } catch (e: any) { setAccountError(e?.message || '修改失败'); }
    finally { setAccountLoading(false); }
  };

  // ── 评论 ──
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, FeedbackComment[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [mentionUser, setMentionUser] = useState<string | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});
  const [expandedComment, setExpandedComment] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoadingFeedback(true);
    fetchFeedback()
      .then(d => {
        setFeedbackList(d);
        // 初始化评论计数（通过单独查询或从数据推断）
        d.forEach(fb => {
          fetchComments(fb.id).then(comments => {
            setCommentCounts(prev => ({ ...prev, [fb.id]: comments.length }));
          }).catch(() => {});
        });
      })
      .catch(() => {})
      .finally(() => setLoadingFeedback(false));
  }, []);

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) return;
    setSubmitting(true);
    setFeedbackError('');
    try {
      const entry = await submitFeedback(feedbackContent.trim(), feedbackType);
      setFeedbackList(prev => [entry, ...prev]);
      setFeedbackContent('');
      setFeedbackType('bug');
    } catch (e: any) {
      const msg = e?.message || '提交失败，请稍后重试';
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        setFeedbackError('反馈功能需要先执行数据库迁移脚本（feedback 表）');
      } else {
        setFeedbackError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComments = async (feedbackId: string) => {
    if (expandedFeedback === feedbackId) {
      setExpandedFeedback(null);
      return;
    }
    setExpandedFeedback(feedbackId);
    setCommentContent('');
    if (!commentsMap[feedbackId]) {
      setLoadingComments(true);
      try {
        const comments = await fetchComments(feedbackId);
        setCommentsMap(prev => ({ ...prev, [feedbackId]: comments }));
        setCommentCounts(prev => ({ ...prev, [feedbackId]: comments.length }));
      } catch { /* ignore */ }
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (feedbackId: string) => {
    if (!commentContent.trim()) return;
    setCommentSubmitting(true);
    try {
      // 如果有 @提及，将提及用户名前缀加入内容
      const content = mentionUser ? `@${mentionUser} ${commentContent.trim()}` : commentContent.trim();
      const comment = await submitComment(feedbackId, content);
      setCommentsMap(prev => ({
        ...prev,
        [feedbackId]: [...(prev[feedbackId] || []), comment],
      }));
      setCommentCounts(prev => ({ ...prev, [feedbackId]: (prev[feedbackId] || 0) + 1 }));
      setCommentContent('');
      setMentionUser(null);
    } catch (e: any) {
      const msg = e?.message || '评论失败';
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        alert('评论功能需要先执行数据库迁移脚本（feedback_comments 表）');
      } else {
        alert(msg);
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ── 通用样式 ──
  const labelStyle: React.CSSProperties = { ...pxSm, fontSize: '11px', color: 'var(--oto-text-muted)' };

  return (
    <div className="space-y-6 oto-stagger">
      {/* Header */}
      <div className="oto-window rounded-none! p-5 oto-card-stamped" style={{ borderColor: 'var(--oto-gold)', background: 'var(--oto-bg-card)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ ...pxH2, color: 'var(--oto-text)' }}><Icon name="gear" size={22} /> 设置</h2>
            <p style={{ ...pxBody, fontSize: '17px', color: 'var(--oto-text-dim)', marginTop: '4px' }}>
              系统配置与开发记录
            </p>
          </div>
        </div>
      </div>

      {/* ═══ 1. 系统开关 ═══ */}
      <div className="oto-window overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
          <Icon name="lock" size={16} />
          <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '11px', lineHeight: '1.8', color: 'var(--oto-text)' }}>系统开关</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between oto-inset p-4">
            <div>
              <h4 style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)' }}>关闭代币系统</h4>
              <p className="mt-1" style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', lineHeight: '1.6' }}>
                隐藏侧栏「扭蛋机」和「藏品室」入口，减少界面元素。
              </p>
            </div>
            <button
              onClick={handleToggleTokenSystem}
              className="oto-btn-sm"
              style={{
                background: 'var(--oto-bg-inset)',
                color: tokenDisabled ? 'var(--oto-accent-alt)' : 'var(--oto-green)',
                borderColor: tokenDisabled ? 'var(--oto-accent-alt)' : 'var(--oto-green)',
                fontWeight: 600,
                minWidth: '60px',
              }}
            >
              {tokenDisabled ? '已关闭' : '已开启'}
            </button>
          </div>
          {tokenDisabled && (
            <p className="mt-3 text-center" style={{ ...pxSm, fontSize: '11px', color: 'var(--oto-green)' }}>
              ✓ 代币系统已关闭。侧栏已隐藏扭蛋机和藏品室。
            </p>
          )}

          {/* 关闭操作指南 */}
          <div className="flex items-center justify-between oto-inset p-4 mt-3">
            <div>
              <h4 style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)' }}>关闭操作指南</h4>
              <p className="mt-1" style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', lineHeight: '1.6' }}>
                隐藏侧栏「操作指南」入口，减少界面元素。
              </p>
            </div>
            <button
              onClick={handleToggleGuide}
              className="oto-btn-sm"
              style={{
                background: 'var(--oto-bg-inset)',
                color: guideDisabled ? 'var(--oto-accent-alt)' : 'var(--oto-green)',
                borderColor: guideDisabled ? 'var(--oto-accent-alt)' : 'var(--oto-green)',
                fontWeight: 600,
                minWidth: '60px',
              }}
            >
              {guideDisabled ? '已关闭' : '已开启'}
            </button>
          </div>

          {/* 关闭新手教程 */}
          <div className="flex items-center justify-between oto-inset p-4 mt-3">
            <div>
              <h4 style={{ ...pxBody, fontSize: '16px', color: 'var(--oto-text)' }}>关闭新手教程</h4>
              <p className="mt-1" style={{ ...pxSm, fontSize: '10px', color: 'var(--oto-text-muted)', lineHeight: '1.6' }}>
                隐藏侧栏「新手教程」入口，减少界面元素。
              </p>
            </div>
            <button
              onClick={handleToggleOnboarding}
              className="oto-btn-sm"
              style={{
                background: 'var(--oto-bg-inset)',
                color: onboardingDisabled ? 'var(--oto-accent-alt)' : 'var(--oto-green)',
                borderColor: onboardingDisabled ? 'var(--oto-accent-alt)' : 'var(--oto-green)',
                fontWeight: 600,
                minWidth: '60px',
              }}
            >
              {onboardingDisabled ? '已关闭' : '已开启'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== 2. Account settings ===== */}
      <div className="oto-window overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
          <Icon name="lock" size={16} />
          <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '11px', lineHeight: '1.8', color: 'var(--oto-text)' }}>Account settings</h3>
          {currentUsername && (
            <span className="ml-2 text-xs" style={{ color: 'var(--oto-text-muted)' }}>Current user: {currentUsername}</span>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <button onClick={() => openAccountModal('username')} className="oto-inset p-4 hover:brightness-105 text-left" style={{ background: 'var(--oto-bg-inset)' }}>
            <Icon name="edit" size={20} style={{ color: 'var(--oto-gold-dark)', marginBottom: '8px' }} />
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text)' }}>Change username</p>
            <p className="text-xs mt-1" style={{ color: 'var(--oto-text-muted)' }}>Takes effect immediately</p>
          </button>
          <button onClick={() => openAccountModal('email')} className="oto-inset p-4 hover:brightness-105 text-left" style={{ background: 'var(--oto-bg-inset)' }}>
            <Icon name="mail" size={20} style={{ color: 'var(--oto-gold-dark)', marginBottom: '8px' }} />
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text)' }}>Change email</p>
            <p className="text-xs mt-1" style={{ color: 'var(--oto-text-muted)' }}>Requires new email confirmation</p>
          </button>
          <button onClick={() => openAccountModal('password')} className="oto-inset p-4 hover:brightness-105 text-left" style={{ background: 'var(--oto-bg-inset)' }}>
            <Icon name="lock" size={20} style={{ color: 'var(--oto-gold-dark)', marginBottom: '8px' }} />
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text)' }}>Change password</p>
            <p className="text-xs mt-1" style={{ color: 'var(--oto-text-muted)' }}>Requires current password</p>
          </button>
          <button onClick={() => openAccountModal('forgot')} className="oto-inset p-4 hover:brightness-105 text-left" style={{ background: 'var(--oto-bg-inset)' }}>
            <Icon name="refresh" size={20} style={{ color: 'var(--oto-accent-alt)', marginBottom: '8px' }} />
            <p style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text)' }}>Forgot password</p>
            <p className="text-xs mt-1" style={{ color: 'var(--oto-text-muted)' }}>Reset via email</p>
          </button>
        </div>
      </div>

      {/* ═══ 3. 版本信息 ═══ */}
      <div className="oto-window overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
          <Icon name="clock" size={16} />
          <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '11px', lineHeight: '1.8', color: 'var(--oto-text)' }}>版本信息</h3>
          <span className="ml-auto" />
          {CHANGELOG.length > 1 && (
            <button onClick={() => setShowHistory(true)} className="oto-btn-sm oto-btn-gray">
              <Icon name="history" size={12} /> 开发者日志
            </button>
          )}
        </div>
        <div className="p-4">
          {CHANGELOG[0] && (
            <div className="px-4 py-3 cursor-pointer flex items-center gap-3 hover:brightness-105 oto-window-gold"
              onClick={() => setModalEntry(CHANGELOG[0])}
              style={{ background: 'linear-gradient(180deg, var(--oto-bg-card) 0%, var(--oto-bg-inset) 100%)' }}>
              <span className="flex-shrink-0" style={{
                fontFamily: 'var(--oto-font-title)', fontSize: '12px', lineHeight: '1',
                display: 'inline-block',
              }}>v{CHANGELOG[0].version}</span>
              <span className="flex-1 truncate" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text)' }}>{CHANGELOG[0].title}</span>
              <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{CHANGELOG[0].date}</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Account settings modal helpers ===== */}
  const openAccountModal = (type: 'username' | 'email' | 'password' | 'forgot') => {
    setAccountModal(type);
    setModalStep('verify');
    setModalCurrentPw('');
    setModalNewUsername('');
    setModalNewEmail('');
    setModalNewPw('');
    setModalConfirmPw('');
    setModalEmail('');
    setAccountError('');
    setAccountSuccess('');
  };
  const closeAccountModal = () => {
    setAccountModal(null);
    setAccountError('');
    setAccountSuccess('');
  };
  const handleVerifyPassword = async () => {
    if (!modalCurrentPw) { setAccountError('Please enter current password'); return; }
    setAccountLoading(true); setAccountError('');
    try {
      const { error: verifyErr } = await signIn(currentUsername || '', modalCurrentPw);
      if (verifyErr) { setAccountError('Current password incorrect'); setAccountLoading(false); return; }
      setAccountLoading(false);
      setModalStep('edit');
    } catch (e: any) { setAccountError(e?.message || 'Verification failed'); setAccountLoading(false); }
  };
  const handleSaveUsername = async () => {
    if (!modalNewUsername.trim()) { setAccountError('Please enter new username'); return; }
    setAccountLoading(true); setAccountError('');
    try {
      await updateUsername(modalNewUsername.trim());
      setCurrentUsername(modalNewUsername.trim());
      setAccountSuccess('Username updated');
      setTimeout(closeAccountModal, 800);
    } catch (e: any) { setAccountError(e?.message || 'Update failed'); }
    finally { setAccountLoading(false); }
  };
  const handleSaveEmail = async () => {
    if (!modalNewEmail.trim()) { setAccountError('Please enter new email'); return; }
    setAccountLoading(true); setAccountError('');
    try {
      await updateEmail(modalNewEmail.trim());
      setAccountSuccess('Email updated, please check inbox');
      setTimeout(closeAccountModal, 800);
    } catch (e: any) { setAccountError(e?.message || 'Update failed'); }
    finally { setAccountLoading(false); }
  };
  const handleSavePassword = async () => {
    if (!modalNewPw) { setAccountError('Please enter new password'); return; }
    if (modalNewPw !== modalConfirmPw) { setAccountError('Passwords do not match'); return; }
    setAccountLoading(true); setAccountError('');
    try {
      await updatePassword(modalNewPw);
      setAccountSuccess('Password updated');
      setTimeout(closeAccountModal, 800);
    } catch (e: any) { setAccountError(e?.message || 'Update failed'); }
    finally { setAccountLoading(false); }
  };
  const handleForgotPasswordModal = async () => {
    if (!modalEmail.trim()) { setAccountError('Please enter email'); return; }
    setAccountLoading(true); setAccountError('');
    try {
      await requestPasswordReset(modalEmail.trim());
      setAccountSuccess('Reset email sent, check spam folder');
      setTimeout(closeAccountModal, 1500);
    } catch (e: any) { setAccountError(e?.message || 'Send failed'); }
    finally { setAccountLoading(false); }
  };

      {/* 开发者日志弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay" onClick={() => setShowHistory(false)}>
          <div className="oto-modal max-w-lg w-[92vw] mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid var(--oto-border-light)', background: 'var(--oto-bg-card)' }}>
              <Icon name="history" size={16} />
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.8', color: 'var(--oto-text)' }}>开发者日志</h3>
              <button onClick={() => setShowHistory(false)} className="ml-auto oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1" style={{ background: 'var(--oto-bg-card)' }}>
              {CHANGELOG.slice(1).map(entry => (
                <div key={entry.version} className="px-4 py-3 cursor-pointer flex items-center gap-3 hover:brightness-105 oto-window-gold"
                  onClick={() => { setShowHistory(false); setModalEntry(entry); }}
                  style={{ background: 'linear-gradient(180deg, var(--oto-bg-card) 0%, var(--oto-bg-inset) 100%)' }}>
                  <span className="flex-shrink-0" style={{
                    fontFamily: 'var(--oto-font-title)', fontSize: '12px', lineHeight: '1',
                    display: 'inline-block',
                  }}>v{entry.version}</span>
                  <span className="flex-1 truncate" style={{ ...pxBody, fontSize: '15px', color: 'var(--oto-text)' }}>{entry.title}</span>
                  <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{entry.date}</span>
                </div>
              ))}
              {CHANGELOG.length <= 1 && (
                <p className="text-center py-4" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>暂无历史日志</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 3. 用户反馈 ═══ */}
      <div className="oto-window overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--oto-border-light)' }}>
          <Icon name="bulb" size={16} />
          <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '11px', lineHeight: '1.8', color: 'var(--oto-text)' }}>用户反馈</h3>
          <span className="ml-auto" />
          <button onClick={() => { setShowAllFeedback(true); }} className="oto-btn-sm oto-btn-gray">
            <Icon name="bars" size={12} /> 全部反馈
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* 提交表单 */}
          <div className="oto-inset p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label style={{ ...labelStyle, fontSize: '13px', color: 'var(--oto-text-dim)' }}>类型</label>
              <select
                value={feedbackType}
                onChange={e => setFeedbackType(e.target.value as FeedbackEntry['type'])}
                className="oto-select text-sm flex-1"
                style={{ textIndent: 0 }}
              >
                {FEEDBACK_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={handleSubmitFeedback}
                disabled={submitting || !feedbackContent.trim()}
                className="oto-btn oto-btn-sm"
                style={{ opacity: feedbackContent.trim() ? 1 : 0.4, cursor: feedbackContent.trim() ? 'pointer' : 'not-allowed' }}
              >
                <Icon name="pin" size={12} /> {submitting ? '提交中...' : '提交'}
              </button>
            </div>
            <div>
              <textarea
                value={feedbackContent}
                onChange={e => setFeedbackContent(e.target.value)}
                placeholder="请描述你的反馈（提交后所有用户可查看）"
                rows={3}
                className="oto-textarea w-full placeholder:text-[14px] md:placeholder:text-[15px]"
              />
            </div>
            {feedbackError && (
              <p className="text-sm" style={{ color: 'var(--oto-accent-alt)' }}>{feedbackError}</p>
            )}
          </div>

          {/* 反馈列表（公开） */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label style={labelStyle}>全部反馈</label>
              {feedbackList.length > 0 && (
                <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{feedbackList.length} 条</span>
              )}
            </div>
            {loadingFeedback ? (
              <div className="text-center py-6" style={{ color: 'var(--oto-text-muted)' }}>
                <Icon name="loading" size={20} className="animate-spin" />
              </div>
            ) : feedbackList.length === 0 ? (
              <p className="text-center py-4" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>暂无反馈</p>
            ) : (
              <div className="space-y-3">
                {feedbackList.map(fb => (
                  <div key={fb.id} className="px-4 py-3 oto-window" style={{ borderLeft: '3px solid var(--oto-gold)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--oto-text)' }}>{fb.username}</span>
                      <StatusBadge
                        label={FEEDBACK_TYPE_MAP[fb.type]}
                        status={fb.type === 'bug' ? 'FAILED' : fb.type === 'suggestion' ? 'COMPLETED' : fb.type === 'question' ? 'PLANNED' : 'ARCHIVED'}
                      />
                      <span className="ml-auto" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
                        {new Date(fb.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-2 cursor-pointer" style={{ ...pxBody, color: 'var(--oto-text-dim)', display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', WebkitLineClamp: expandedContent[fb.id] ? 'unset' : 3 }}
                      onClick={() => setExpandedContent(prev => ({ ...prev, [fb.id]: !prev[fb.id] }))}>
                      {fb.content}
                      {!expandedContent[fb.id] && fb.content.length > 100 && <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '12px' }}>展开</span>}
                      {expandedContent[fb.id] && fb.content.length > 100 && <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '12px' }}>收起</span>}
                    </p>

                    {/* 评论区域 */}
                    <div className="flex items-center justify-end mt-1">
                      <button
                        onClick={() => toggleComments(fb.id)}
                        className="oto-btn-sm oto-btn-gray text-xs flex items-center gap-1"
                        style={{ fontSize: '11px' }}
                      >
                        <Icon name="edit" size={12} /> {commentCounts[fb.id] || 0} 条评论
                      </button>
                    </div>

                    {expandedFeedback === fb.id && (
                      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--oto-border-light)' }}>
                        {loadingComments && !commentsMap[fb.id] ? (
                          <div className="text-center py-2" style={{ color: 'var(--oto-text-muted)' }}>
                            <Icon name="loading" size={16} className="animate-spin" />
                          </div>
                        ) : (commentsMap[fb.id] || []).length === 0 ? (
                          <p className="text-xs text-center py-2" style={{ color: 'var(--oto-text-muted)' }}>暂无评论</p>
                        ) : (
                          (commentsMap[fb.id] || []).map(c => (
                            <div key={c.id} className="px-3 py-2" style={{ background: 'var(--oto-bg-inset)', borderLeft: '2px solid var(--oto-border-light)' }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs" style={{ color: 'var(--oto-text)' }}>{c.username}</span>
                                <span className="text-xs" style={{ color: 'var(--oto-text-muted)' }}>
                                  {new Date(c.created_at).toLocaleString('zh-CN')}
                                </span>
                              </div>
                              <div className="text-xs cursor-pointer" style={{ color: 'var(--oto-text-dim)', display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', WebkitLineClamp: expandedComment[c.id] ? 'unset' : 3 }}
                                onClick={() => setExpandedComment(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                                {c.content.startsWith('@') ? (
                                  <>
                                    <span className="inline-block px-1 py-0.5 mr-1" style={{ background: '#e8e4f0', color: '#504868', border: '1px solid #a898b8', fontSize: '10px' }}>
                                      {c.content.split(' ')[0]}
                                    </span>
                                    {c.content.split(' ').slice(1).join(' ')}
                                  </>
                                ) : c.content}
                                {c.content.length > 60 && (
                                  <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '10px' }}>
                                    {expandedComment[c.id] ? '收起' : '展开'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}

                        {/* 评论输入 */}
                        <div className="mt-2 relative">
                          <div className="flex gap-2">
                            <div className="relative flex-1 flex items-center oto-input" style={{ padding: '4px 6px', gap: '4px' }}>
                              {mentionUser && (
                                <span className="flex-shrink-0 text-xs px-1.5 py-0.5 flex items-center gap-1" style={{ background: '#e8e4f0', color: '#504868', border: '1px solid #a898b8' }}>
                                  @{mentionUser}
                                  <button onClick={() => setMentionUser(null)} style={{ color: 'var(--oto-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
                                </span>
                              )}
                              <input
                                type="text"
                                value={expandedFeedback === fb.id ? commentContent : ''}
                                onChange={e => setCommentContent(e.target.value)}
                                placeholder="写下你的评论..."
                                className="flex-1 text-xs bg-transparent outline-none border-none"
                                style={{ padding: '2px 4px', minWidth: 0 }}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(fb.id); } }}
                              />
                              {/* @提及按钮 */}
                              {(commentsMap[fb.id] || []).length > 0 && (
                                <button
                                  onClick={() => setShowMentionDropdown(showMentionDropdown === fb.id ? null : fb.id)}
                                  className="flex-shrink-0 text-xs px-1 py-0.5"
                                  style={{ color: 'var(--oto-text-muted)', cursor: 'pointer' }}
                                >
                                  @
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => handleSubmitComment(fb.id)}
                              disabled={commentSubmitting || !commentContent.trim()}
                              className="oto-btn-sm"
                              style={{ opacity: commentContent.trim() ? 1 : 0.4, cursor: commentContent.trim() ? 'pointer' : 'not-allowed' }}
                            >
                              <Icon name="pin" size={12} />
                            </button>
                          </div>
                          {/* @提及下拉 */}
                          {showMentionDropdown === fb.id && (
                            <div className="absolute z-10 mt-1 w-full oto-window overflow-auto max-h-32" style={{ background: 'var(--oto-bg-card)' }}>
                              {(() => {
                                const usernames = [...new Set((commentsMap[fb.id] || []).map(c => c.username).filter(Boolean))];
                                if (feedbackList.find(f => f.id === fb.id)?.username) {
                                  const author = feedbackList.find(f => f.id === fb.id)!.username!;
                                  if (!usernames.includes(author)) usernames.unshift(author);
                                }
                                return usernames.map(u => (
                                  <button
                                    key={u}
                                    type="button"
                                    onMouseDown={() => { setMentionUser(u); setShowMentionDropdown(null); }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:brightness-105"
                                    style={{ ...pxBody, fontSize: '12px', color: 'var(--oto-text)' }}
                                  >
                                    @{u}
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 开发者日志详情弹窗 */}
      {modalEntry && (
        <WhatsNewModal entry={modalEntry} onClose={() => setModalEntry(null)} />
      )}

      {/* ===== Account settings modal ===== */}
      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay" onClick={closeAccountModal}>
          <div className="oto-modal max-w-md w-[92vw] mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--oto-border-light)', background: 'var(--oto-bg-card)' }}>
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.8', color: 'var(--oto-text)', textAlign: 'center' }}>
                {accountModal === 'username' && 'Change Username'}
                {accountModal === 'email' && 'Change Email'}
                {accountModal === 'password' && 'Change Password'}
                {accountModal === 'forgot' && 'Forgot Password'}
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3" style={{ background: 'var(--oto-bg-card)' }}>
              {(accountModal === 'username' || accountModal === 'email' || accountModal === 'password') && modalStep === 'verify' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-text-dim)' }}>For security, please enter your current password:</p>
                  <input
                    type="password" autoFocus
                    value={modalCurrentPw} onChange={e => setModalCurrentPw(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleVerifyPassword(); }}
                    placeholder="Current password"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountModal === 'username' && modalStep === 'edit' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-green)' }}>Identity verified</p>
                  <input
                    type="text" autoFocus
                    value={modalNewUsername} onChange={e => setModalNewUsername(e.target.value)}
                    placeholder="New username (3-20 chars)"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                  <p className="text-xs" style={{ color: 'var(--oto-text-muted)' }}>3-20 chars: letters, digits, underscore, Chinese</p>
                </>
              )}
              {accountModal === 'email' && modalStep === 'edit' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-green)' }}>Identity verified</p>
                  <input
                    type="email" autoFocus
                    value={modalNewEmail} onChange={e => setModalNewEmail(e.target.value)}
                    placeholder="New email"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountModal === 'password' && modalStep === 'edit' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-green)' }}>Identity verified</p>
                  <input
                    type="password" autoFocus
                    value={modalNewPw} onChange={e => setModalNewPw(e.target.value)}
                    placeholder="New password"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                  <input
                    type="password"
                    value={modalConfirmPw} onChange={e => setModalConfirmPw(e.target.value)}
                    placeholder="Confirm new password"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountModal === 'forgot' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-text-dim)' }}>Enter your registered email to receive a reset link:</p>
                  <input
                    type="email" autoFocus
                    value={modalEmail} onChange={e => setModalEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleForgotPasswordModal(); }}
                    placeholder="Registered email"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountError && (
                <p style={{ fontSize: '13px', color: 'var(--oto-red)', background: '#fce4e4', padding: '8px', border: '1px solid #d09898' }}>
                  {accountError}
                </p>
              )}
              {accountSuccess && (
                <p style={{ fontSize: '13px', color: 'var(--oto-green)', background: '#e0ece0', padding: '8px', border: '1px solid #90b090' }}>
                  {accountSuccess}
                </p>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2" style={{ background: 'var(--oto-bg-card)' }}>
              <button onClick={closeAccountModal} className="oto-btn oto-btn-gray flex-1" style={{ padding: '10px 0' }}>Cancel</button>
              {accountModal === 'forgot' ? (
                <button
                  onClick={handleForgotPasswordModal}
                  disabled={accountLoading || !modalEmail.trim()}
                  className="oto-btn flex-1"
                  style={{ padding: '10px 0', opacity: modalEmail.trim() ? 1 : 0.4, cursor: modalEmail.trim() ? 'pointer' : 'not-allowed' }}
                >
                  {accountLoading ? 'Sending...' : 'Send Email'}
                </button>
              ) : modalStep === 'verify' ? (
                <button
                  onClick={handleVerifyPassword}
                  disabled={accountLoading || !modalCurrentPw}
                  className="oto-btn flex-1"
                  style={{ padding: '10px 0', opacity: modalCurrentPw ? 1 : 0.4, cursor: modalCurrentPw ? 'pointer' : 'not-allowed' }}
                >
                  {accountLoading ? 'Verifying...' : 'Next'}
                </button>
              ) : (
                <button
                  onClick={
                    accountModal === 'username' ? handleSaveUsername :
                    accountModal === 'email' ? handleSaveEmail :
                    handleSavePassword
                  }
                  disabled={accountLoading}
                  className="oto-btn flex-1"
                  style={{ padding: '10px 0' }}
                >
                  {accountLoading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 查看全部反馈弹窗 */}
      {showAllFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay" onClick={() => setShowAllFeedback(false)}>
          <div className="oto-modal max-w-2xl w-[95vw] mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid var(--oto-border-light)', background: 'var(--oto-bg-card)' }}>
              <Icon name="bulb" size={16} />
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.8', color: 'var(--oto-text)' }}>全部反馈</h3>
              {feedbackList.length > 0 && (
                <span style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>{feedbackList.length} 条</span>
              )}
              <button onClick={() => setShowAllFeedback(false)} className="ml-auto oto-btn-sm oto-btn-gray"><Icon name="close" size={14} /></button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1" style={{ background: 'var(--oto-bg-card)' }}>
              {loadingFeedback ? (
                <div className="text-center py-6" style={{ color: 'var(--oto-text-muted)' }}>
                  <Icon name="loading" size={20} className="animate-spin" />
                </div>
              ) : feedbackList.length === 0 ? (
                <p className="text-center py-4" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>暂无反馈</p>
              ) : (
                feedbackList.map(fb => (
                  <div key={fb.id} className="px-4 py-3 oto-window" style={{ borderLeft: '3px solid var(--oto-gold)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--oto-text)' }}>{fb.username}</span>
                      <StatusBadge
                        label={FEEDBACK_TYPE_MAP[fb.type]}
                        status={fb.type === 'bug' ? 'FAILED' : fb.type === 'suggestion' ? 'COMPLETED' : fb.type === 'question' ? 'PLANNED' : 'ARCHIVED'}
                      />
                      {commentCounts[fb.id] > 0 && (
                        <span className="text-xs" style={{ color: 'var(--oto-text-muted)' }}>
                          {commentCounts[fb.id]} 条评论
                        </span>
                      )}
                      <span className="ml-auto" style={{ ...pxSm, color: 'var(--oto-text-muted)' }}>
                        {new Date(fb.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap cursor-pointer" style={{ ...pxBody, color: 'var(--oto-text-dim)', display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', WebkitLineClamp: expandedContent[fb.id] ? 'unset' : 3 }}
                      onClick={() => setExpandedContent(prev => ({ ...prev, [fb.id]: !prev[fb.id] }))}>
                      {fb.content}
                      {!expandedContent[fb.id] && fb.content.length > 100 && <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '12px' }}>展开</span>}
                      {expandedContent[fb.id] && fb.content.length > 100 && <span style={{ color: 'var(--oto-gold-dark)', marginLeft: 4, fontSize: '12px' }}>收起</span>}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Account settings modal ===== */}
      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center oto-overlay" onClick={closeAccountModal}>
          <div className="oto-modal max-w-md w-[92vw] mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--oto-border-light)', background: 'var(--oto-bg-card)' }}>
              <h3 style={{ fontFamily: 'var(--oto-font-title)', fontSize: '13px', lineHeight: '1.8', color: 'var(--oto-text)', textAlign: 'center' }}>
                {accountModal === 'username' && 'Change Username'}
                {accountModal === 'email' && 'Change Email'}
                {accountModal === 'password' && 'Change Password'}
                {accountModal === 'forgot' && 'Forgot Password'}
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3" style={{ background: 'var(--oto-bg-card)' }}>
              {(accountModal === 'username' || accountModal === 'email' || accountModal === 'password') && modalStep === 'verify' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-text-dim)' }}>For security, please enter your current password:</p>
                  <input
                    type="password" autoFocus
                    value={modalCurrentPw} onChange={e => setModalCurrentPw(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleVerifyPassword(); }}
                    placeholder="Current password"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountModal === 'username' && modalStep === 'edit' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-green)' }}>Identity verified</p>
                  <input
                    type="text" autoFocus
                    value={modalNewUsername} onChange={e => setModalNewUsername(e.target.value)}
                    placeholder="New username (3-20 chars)"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                  <p className="text-xs" style={{ color: 'var(--oto-text-muted)' }}>3-20 chars: letters, digits, underscore, Chinese</p>
                </>
              )}
              {accountModal === 'email' && modalStep === 'edit' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-green)' }}>Identity verified</p>
                  <input
                    type="email" autoFocus
                    value={modalNewEmail} onChange={e => setModalNewEmail(e.target.value)}
                    placeholder="New email"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountModal === 'password' && modalStep === 'edit' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-green)' }}>Identity verified</p>
                  <input
                    type="password" autoFocus
                    value={modalNewPw} onChange={e => setModalNewPw(e.target.value)}
                    placeholder="New password"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                  <input
                    type="password"
                    value={modalConfirmPw} onChange={e => setModalConfirmPw(e.target.value)}
                    placeholder="Confirm new password"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountModal === 'forgot' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--oto-text-dim)' }}>Enter your registered email to receive a reset link:</p>
                  <input
                    type="email" autoFocus
                    value={modalEmail} onChange={e => setModalEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleForgotPasswordModal(); }}
                    placeholder="Registered email"
                    className="oto-input w-full text-sm"
                    style={{ padding: '8px 12px' }}
                  />
                </>
              )}
              {accountError && (
                <p style={{ fontSize: '13px', color: 'var(--oto-red)', background: '#fce4e4', padding: '8px', border: '1px solid #d09898' }}>
                  {accountError}
                </p>
              )}
              {accountSuccess && (
                <p style={{ fontSize: '13px', color: 'var(--oto-green)', background: '#e0ece0', padding: '8px', border: '1px solid #90b090' }}>
                  {accountSuccess}
                </p>
              )}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-2" style={{ background: 'var(--oto-bg-card)' }}>
              <button onClick={closeAccountModal} className="oto-btn oto-btn-gray flex-1" style={{ padding: '10px 0' }}>Cancel</button>
              {accountModal === 'forgot' ? (
                <button
                  onClick={handleForgotPasswordModal}
                  disabled={accountLoading || !modalEmail.trim()}
                  className="oto-btn flex-1"
                  style={{ padding: '10px 0', opacity: modalEmail.trim() ? 1 : 0.4, cursor: modalEmail.trim() ? 'pointer' : 'not-allowed' }}
                >
                  {accountLoading ? 'Sending...' : 'Send Email'}
                </button>
              ) : modalStep === 'verify' ? (
                <button
                  onClick={handleVerifyPassword}
                  disabled={accountLoading || !modalCurrentPw}
                  className="oto-btn flex-1"
                  style={{ padding: '10px 0', opacity: modalCurrentPw ? 1 : 0.4, cursor: modalCurrentPw ? 'pointer' : 'not-allowed' }}
                >
                  {accountLoading ? 'Verifying...' : 'Next'}
                </button>
              ) : (
                <button
                  onClick={
                    accountModal === 'username' ? handleSaveUsername :
                    accountModal === 'email' ? handleSaveEmail :
                    handleSavePassword
                  }
                  disabled={accountLoading}
                  className="oto-btn flex-1"
                  style={{ padding: '10px 0' }}
                >
                  {accountLoading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}