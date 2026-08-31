import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PomodoroProvider } from './contexts/PomodoroContext'
import { OnboardingProvider } from './contexts/OnboardingContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Projects = lazy(() => import('./pages/Projects'))
const PomodoroHistory = lazy(() => import('./pages/PomodoroHistory'))
const DailyPlans = lazy(() => import('./pages/DailyPlans'))
const Reviews = lazy(() => import('./pages/Reviews'))
const Guide = lazy(() => import('./pages/Guide'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const QuickMemos = lazy(() => import('./pages/QuickMemos'))
const Gacha = lazy(() => import('./pages/Gacha'))
const Showcase = lazy(() => import('./pages/Showcase'))
const Settings = lazy(() => import('./pages/Settings'))
import ResetPasswordPage from './pages/ResetPasswordPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen" style={{ background: 'var(--oto-bg-main)' }} />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ background: 'var(--oto-bg-main)' }} />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<ProtectedRoute><OnboardingProvider><PomodoroProvider><Layout /></PomodoroProvider></OnboardingProvider></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/pomodoro" element={<PomodoroHistory />} />
              <Route path="/daily-plans" element={<DailyPlans />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/quick-memos" element={<QuickMemos />} />
              <Route path="/gacha" element={<Gacha />} />
              <Route path="/showcase" element={<Showcase />} />
            </Route>
          </Routes>
        </Suspense>
    </AuthProvider>
  )
}
