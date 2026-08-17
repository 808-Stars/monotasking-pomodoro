import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { requestPasswordReset } from '../services/api'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('请先输入邮箱'); return; }
    setSubmitting(true); setError(''); setInfo('');
    try {
      await requestPasswordReset(email.trim());
      setInfo('密码重置邮件已发送，请查收（含垃圾邮件）');
    } catch (e: any) {
      setError(e?.message || '发送失败');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('请输入邮箱和密码'); return }
    if (mode === 'register' && !username.trim()) { setError('请输入用户名'); return }
    setSubmitting(true)
    setError('')
    const { error: err } = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, username.trim())
    if (err) { setError(err); setSubmitting(false); return }
    navigate('/', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--oto-bg-main)',
      fontFamily: 'var(--oto-font-body)',
    }}>
      <div className="oto-window-gold rounded-none! p-8" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{
          fontFamily: 'var(--oto-font-title)', fontSize: '20px', fontWeight: 700,
          color: 'var(--oto-gold-dark)', textAlign: 'center', marginBottom: '24px',
          letterSpacing: '0.15em',
        }}>
          ◆ MONOPOMO
        </h2>
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <button onClick={() => setMode('login')} style={{
            flex: 1, padding: '8px', background: mode === 'login' ? 'var(--oto-gold)' : 'transparent',
            color: mode === 'login' ? '#fff' : 'var(--oto-text-dim)',
            border: '2px solid var(--oto-gold)', cursor: 'pointer',
            fontFamily: 'var(--oto-font-body)', fontSize: '14px', fontWeight: 600,
          }}>登录</button>
          <button onClick={() => setMode('register')} style={{
            flex: 1, padding: '8px', background: mode === 'register' ? 'var(--oto-gold)' : 'transparent',
            color: mode === 'register' ? '#fff' : 'var(--oto-text-dim)',
            border: '2px solid var(--oto-gold)', borderLeft: 'none', cursor: 'pointer',
            fontFamily: 'var(--oto-font-body)', fontSize: '14px', fontWeight: 600,
          }}>注册</button>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--oto-text-dim)', display: 'block', marginBottom: '4px' }}>
                用户名
              </label>
              <input
                type="text" autoComplete="username"
                value={username} onChange={e => setUsername(e.target.value)}
                className="oto-input" style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="3-20位，字母/数字/下划线/中文"
              />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: 'var(--oto-text-dim)', display: 'block', marginBottom: '4px' }}>
              邮箱
            </label>
            <input
              type="email" autoFocus autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="oto-input" style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="your@email.com"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', color: 'var(--oto-text-dim)', display: 'block', marginBottom: '4px' }}>
              密码
            </label>
            <input
              type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={e => setPassword(e.target.value)}
              className="oto-input" style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="至少 6 位"
            />
          </div>
          {error && (
            <p style={{
              fontSize: '13px', color: 'var(--oto-red)', marginBottom: '12px',
              background: '#fce4e4', padding: '8px', border: '1px solid #d09898',
            }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{
              fontSize: '13px', color: 'var(--oto-green)', marginBottom: '12px',
              background: '#e4f4e4', padding: '8px', border: '1px solid #98d098',
            }}>
              {info}
            </p>
          )}
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={submitting}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  color: 'var(--oto-gold-dark)', fontSize: '13px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--oto-font-body)',
                  textDecoration: 'underline',
                }}
              >
                忘记密码？
              </button>
            </div>
          )}
          <button
            type="submit" disabled={submitting}
            className="oto-btn" style={{ width: '100%', padding: '10px 0', fontWeight: 700 }}
          >
            {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  )
}
