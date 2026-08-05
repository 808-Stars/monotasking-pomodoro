import { Routes, Route, Navigate } from 'react-router-dom'
import { PomodoroProvider } from './contexts/PomodoroContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Projects from './pages/Projects'
import PomodoroHistory from './pages/PomodoroHistory'
import DailyPlans from './pages/DailyPlans'
import Reviews from './pages/Reviews'
import Guide from './pages/Guide'
import Onboarding from './pages/Onboarding'
import QuickMemos from './pages/QuickMemos'
import Gacha from './pages/Gacha'
import Showcase from './pages/Showcase'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen" style={{ background: 'var(--oto-bg-main)' }} />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><PomodoroProvider><Layout /></PomodoroProvider></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/pomodoro" element={<PomodoroHistory />} />
            <Route path="/daily-plans" element={<DailyPlans />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/quick-memos" element={<QuickMemos />} />
            <Route path="/gacha" element={<Gacha />} />
            <Route path="/showcase" element={<Showcase />} />
          </Route>
        </Routes>
    </AuthProvider>
  )
}
