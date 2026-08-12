import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { clearAuthCache } from '../services/api'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function translateAuthError(msg: string): string {
  if (!msg) return '注册失败，请稍后再试'
  const map: Record<string, string> = {
    'Invalid login credentials': '邮箱或密码错误',
    'User already registered': '该邮箱已注册',
    'Password should be at least 6 characters': '密码至少需要 6 位',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Email not confirmed': '邮箱未验证，请先点击确认链接',
    'Signup requires a valid password': '请输入有效的密码',
    'User not found': '用户不存在',
    'rate limit': '操作过于频繁，请稍后再试',
    'email rate limit': '邮件发送过于频繁，请稍后再试',
  }
  for (const [en, zh] of Object.entries(map)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return zh
  }
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? translateAuthError(error.message) : null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    // Strict email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) return { error: '请输入有效的邮箱地址' }
    // Block obviously fake domains
    const fakeDomains = ['test.com', 'example.com', 'fake.com', 'temp.com', 'mailinator.com', 'guerrillamail.com']
    const domain = email.split('@')[1]?.toLowerCase()
    if (fakeDomains.includes(domain)) return { error: '请使用真实邮箱注册' }
    if (password.length < 6) return { error: '密码至少需要6个字符' }
    const { data, error } = await supabase.auth.signUp({ email, password })
    console.log('[signUp] data:', data, 'error:', error)
    if (error) {
      console.error('[signUp] error details:', JSON.stringify(error))
      return { error: translateAuthError(error.message || JSON.stringify(error)) }
    }
    if (!data.session) return { error: '注册成功！请检查邮箱并点击确认链接后登录' }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    clearAuthCache()
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
