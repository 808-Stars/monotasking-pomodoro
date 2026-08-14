import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ============================================================
// 新手教程引导追踪
// ============================================================
//
// 设计思路：
// - "当前引导中的步骤"(activeQuest) 是 Onboarding 上下文唯一的状态
// - 点击 Onboarding 的动作按钮时调用 startQuest(id, path)：
//     记录该步骤并跳转到目标页面
// - 目标页面完成对应动作后调用 completeQuest(id)：
//     写入 localStorage，清除 activeQuest，跳回 /onboarding
// - 通过 useLocation 监听路由：用户停留在 activeQuest.path 上时保留；
//   离开（侧边栏/其他按钮/URL 直达）则自动清除 activeQuest
//   → 确保只有在 Onboarding 引导路径上完成的操作才计入步骤进度
//
// localStorage key 与原实现保持一致：'onboarding_completed'
// ============================================================

export interface ActiveQuest {
  id: string
  path: string
}

interface OnboardingContextType {
  activeQuest: ActiveQuest | null
  startQuest: (id: string, path: string) => void
  completeQuest: (id: string) => void
  // 暴露给 Onboarding 页面读取已完成的步骤集合（响应外部写 localStorage）
  completedQuestIds: () => Set<string>
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)
const STORAGE_KEY = 'onboarding_completed'

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null)
  // 用 ref 跟踪上一次已知的路径，避免初次挂载时（activeQuest 仍为 null）误触
  const lastPathRef = useRef<string>(location.pathname)

  // 路由变化时，如果当前路径不是 activeQuest 的目标路径，说明用户离开了引导流
  // （例如从侧边栏跳到了别处），清除 activeQuest
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname
      if (activeQuest && location.pathname !== activeQuest.path) {
        setActiveQuest(null)
      }
    }
  }, [location.pathname, activeQuest])

  const startQuest = useCallback((id: string, path: string) => {
    setActiveQuest({ id, path })
    navigate(path)
  }, [navigate])

  const completeQuest = useCallback((id: string) => {
    setActiveQuest(null)
    try {
      const done = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
      done.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]))
    } catch {
      /* localStorage 不可用时静默忽略 */
    }
    navigate('/onboarding')
  }, [navigate])

  const completedQuestIds = useCallback(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
    } catch {
      return new Set<string>()
    }
  }, [])

  return (
    <OnboardingContext.Provider value={{ activeQuest, startQuest, completeQuest, completedQuestIds }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}