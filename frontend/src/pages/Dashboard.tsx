import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'
import Icon from '../components/Icons'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [taskCount, setTaskCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setTaskCount(count ?? 0)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--oto-bg-main)' }}>
      <p style={{ color: 'var(--oto-text-dim)', fontFamily: 'var(--oto-font-body)' }}>加载中...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--oto-bg-main)', padding: '40px' }}>
      <div className="oto-window p-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <h1 style={{
            fontFamily: 'var(--oto-font-title)', fontSize: '24px',
            color: 'var(--oto-text)', letterSpacing: '0.06em',
          }}>
            <Icon name="dashboard" size={24} /> 单核 × 番茄
          </h1>
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--oto-text-dim)', fontFamily: 'var(--oto-font-body)', fontSize: '14px' }}>
              {user?.email}
            </span>
            <button onClick={signOut} className="oto-btn oto-btn-sm">
              退出登录
            </button>
          </div>
        </div>

        <div className="oto-window-gold p-6 mb-6">
          <h2 style={{
            fontFamily: 'var(--oto-font-title)', fontSize: '18px',
            color: 'var(--oto-gold-dark)', marginBottom: '12px',
          }}>
            🎉 部署成功！
          </h2>
          <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '16px', color: 'var(--oto-text-dim)', lineHeight: '1.8' }}>
            单核 × 番茄工作法已成功部署到 Netlify + Supabase。
            <br />当前任务数：<strong style={{ color: 'var(--oto-text)' }}>{taskCount}</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="oto-window p-4 text-center">
            <Icon name="task" size={32} />
            <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '16px', color: 'var(--oto-text)', marginTop: '8px' }}>
              任务管理
            </p>
            <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '13px', color: 'var(--oto-text-muted)', marginTop: '4px' }}>
              即将上线
            </p>
          </div>
          <div className="oto-window p-4 text-center">
            <Icon name="tomato" size={32} />
            <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '16px', color: 'var(--oto-text)', marginTop: '8px' }}>
              番茄钟
            </p>
            <p style={{ fontFamily: 'var(--oto-font-body)', fontSize: '13px', color: 'var(--oto-text-muted)', marginTop: '4px' }}>
              即将上线
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
