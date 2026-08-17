import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updatePassword } from '../services/api';
import { supabase } from '../services/supabase';
import Icon from '../components/Icons';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 从 URL hash 中解析 Supabase 重置密码 token 并建立 session
  // 因为 supabase.ts 里设置了 detectSessionInUrl: false，Supabase SDK 不会自动从 URL 检测 session
  useEffect(() => {
    if (location.hash.includes('access_token=')) {
      const params = new URLSearchParams(location.hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ error: setErr }) => {
            if (setErr) {
              setError('重置链接无效或已过期，请重新申请');
            } else {
              // 清理 URL hash 防止刷新重复处理
              window.history.replaceState(null, '', window.location.pathname);
            }
          });
      }
    }
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError('请输入新密码'); return; }
    if (newPassword !== confirmPassword) { setError('两次输入的密码不一致'); return; }
    setSubmitting(true); setError('');
    try {
      await updatePassword(newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (e: any) {
      setError(e?.message || '密码重置失败，请重新点击邮件链接');
    } finally {
      setSubmitting(false);
    }
  };

  // 检查 URL hash 中的错误信息（Supabase 会在错误时跳转回 redirectTo 并带上 error 参数）
  if (location.hash.includes('error=')) {
    const params = new URLSearchParams(location.hash.substring(1));
    const errCode = params.get('error_code');
    const errDesc = params.get('error_description') || '重置链接无效或已过期';
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--oto-bg-main)', fontFamily: 'var(--oto-font-body)',
      }}>
        <div className="oto-window-gold rounded-none! p-8" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{
            fontFamily: 'var(--oto-font-title)', fontSize: '20px', fontWeight: 700,
            color: 'var(--oto-gold-dark)', textAlign: 'center', marginBottom: '24px',
            letterSpacing: '0.15em',
          }}>◆ MONOPOMO</h2>
          <div className="oto-inset p-4 text-center">
            <Icon name="lock" size={32} style={{ color: 'var(--oto-accent-alt)', marginBottom: '12px' }} />
            <p className="text-sm mb-4" style={{ color: 'var(--oto-text-dim)' }}>
              {errDesc === 'Email link is invalid or has expired' ? '重置链接无效或已过期，请重新申请' : errDesc}
            </p>
            <button onClick={() => navigate('/login', { replace: true })} className="oto-btn w-full">
              返回登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--oto-bg-main)', fontFamily: 'var(--oto-font-body)',
      }}>
        <div className="oto-window-gold rounded-none! p-8" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{
            fontFamily: 'var(--oto-font-title)', fontSize: '20px', fontWeight: 700,
            color: 'var(--oto-gold-dark)', textAlign: 'center', marginBottom: '24px',
            letterSpacing: '0.15em',
          }}>◆ MONOPOMO</h2>
          <div className="oto-inset p-4 text-center">
            <p className="text-sm" style={{ color: 'var(--oto-green)' }}>
              ✓ 密码重置成功，正在跳转到登录页...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--oto-bg-main)', fontFamily: 'var(--oto-font-body)',
    }}>
      <div className="oto-window-gold rounded-none! p-8" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{
          fontFamily: 'var(--oto-font-title)', fontSize: '20px', fontWeight: 700,
          color: 'var(--oto-gold-dark)', textAlign: 'center', marginBottom: '24px',
          letterSpacing: '0.15em',
        }}>◆ MONOPOMO</h2>
        <p className="text-center mb-4" style={{ ...pxBody, fontSize: '14px', color: 'var(--oto-text-dim)' }}>
          请输入新密码
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: 'var(--oto-text-dim)', display: 'block', marginBottom: '4px' }}>新密码</label>
            <input
              type="password" autoFocus
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="oto-input" style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="至少 6 位"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: 'var(--oto-text-dim)', display: 'block', marginBottom: '4px' }}>确认新密码</label>
            <input
              type="password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="oto-input" style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="再次输入"
            />
          </div>
          {error && (
            <p style={{
              fontSize: '13px', color: 'var(--oto-red)', marginBottom: '12px',
              background: '#fce4e4', padding: '8px', border: '1px solid #d09898',
            }}>{error}</p>
          )}
          <button
            type="submit" disabled={submitting}
            className="oto-btn" style={{ width: '100%', padding: '10px 0', fontWeight: 700 }}
          >
            {submitting ? '重置中...' : '重置密码'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pxBody = { fontFamily: 'var(--oto-font-body)', fontSize: '18px' };
