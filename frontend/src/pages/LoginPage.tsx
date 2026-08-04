import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('请输入邮箱和密码'); return }
    setSubmitting(true)
    setError('')
    const fn = mode === 'login' ? signIn : signUp
    const { error: err } = await fn(email.trim(), password)
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
          ◆ 单核 × 番茄
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
              type="password" autoComplete="current-password"
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
