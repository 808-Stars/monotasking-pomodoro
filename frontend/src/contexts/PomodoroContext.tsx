import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPomodoroSession, fetchTasks, addTokenRecord } from '../services/api';
import { supabase } from '../services/supabase';
import { localDate } from '../utils/date';
import type { Task } from '../types';
import { useOnboarding } from './OnboardingContext';

const WORK_TIME = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const TIMER_KEY = 'monopomo-timer';

type TimerPhase = 'idle' | 'running' | 'paused';
type TimerMode = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

interface PomodoroContextType {
  phase: TimerPhase;
  mode: TimerMode;
  seconds: number;
  selectedTask: string | null;
  tasks: Task[];
  notes: string;
  startTime: Date | null;
  currentTime: Date;
  totalSeconds: number;
  endTime: Date | null;
  toggleTimer: () => void;
  handleSkip: () => void;
  resetTimer: () => void;
  switchMode: (newMode: TimerMode) => void;
  setSelectedTask: (id: string | null) => void;
  setNotes: (notes: string) => void;
  refreshTasks: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { activeQuest, completeQuest } = useOnboarding();
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [seconds, setSeconds] = useState(WORK_TIME);
  const [selectedTask, setSelectedTaskState] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotesState] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTimeState] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedTaskRef = useRef(selectedTask);
  const startTimeRef = useRef<Date | null>(null);
  const notesRef = useRef(notes);
  const elapsedRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { selectedTaskRef.current = selectedTask; }, [selectedTask]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // ── Timer persistence helpers ──
  const saveTimer = (data: { mode: TimerMode; phase: TimerPhase; targetEnd: number; startTime: number; elapsed: number; taskId: string | null; notes: string; seconds: number }) => {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(data)); } catch {}
  };
  const clearTimer = () => { try { localStorage.removeItem(TIMER_KEY); } catch {} };

  // Restore timer on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved.targetEnd) return;
      const remaining = Math.max(0, Math.round((saved.targetEnd - Date.now()) / 1000));
      if (remaining <= 0) { clearTimer(); return; } // expired
      setMode(saved.mode || 'WORK');
      setSeconds(saved.phase === 'paused' ? saved.seconds : remaining);
      setSelectedTaskState(saved.taskId || null);
      selectedTaskRef.current = saved.taskId || null;
      setNotesState(saved.notes || '');
      notesRef.current = saved.notes || '';
      startTimeRef.current = saved.startTime ? new Date(saved.startTime) : null;
      setStartTime(saved.startTime ? new Date(saved.startTime) : null);
      elapsedRef.current = saved.elapsed || 0;
      targetEndRef.current = saved.targetEnd;
      needsCompleteRef.current = false;
      if (saved.phase === 'paused') {
        setPhase('paused');
      } else {
        setEndTimeState(new Date(saved.targetEnd));
        setPhase('running');
      }
    } catch {}
  }, []);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalSeconds = mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK;

  // Load tasks
  const refreshTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      const active = (Array.isArray(data) ? data : []).filter(
        (t: any) => t.status === 'IN_PROGRESS'
      ).slice(0, 10);
      setTasks(active);
    } catch { /* */ }
    try {
      const inProgress = await fetchTasks({ status: 'IN_PROGRESS' });
      const arr = Array.isArray(inProgress) ? inProgress : [];
      if (arr.length > 0) {
        setSelectedTaskState(prev => prev || arr[0].id);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  useEffect(() => {
    const handler = () => { refreshTasks(); };
    window.addEventListener('oto:tasks-changed', handler);
    return () => window.removeEventListener('oto:tasks-changed', handler);
  }, [refreshTasks]);

  // ── Timer interval managed by useLayoutEffect ──
  // Uses Date.now() for accurate time calculation even when tab is in background.
  const needsCompleteRef = useRef(false);
  const targetEndRef = useRef(0); // timestamp when timer should reach 0

  useLayoutEffect(() => {
    if (phase !== 'running') {
      if (needsCompleteRef.current) {
        needsCompleteRef.current = false;
        handleCompleteRef.current?.();
      }
      return;
    }

    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((targetEndRef.current - Date.now()) / 1000));
      elapsedRef.current += 1;

      if (remaining <= 0) {
        clearInterval(id);
        clearTimer();
        needsCompleteRef.current = true;
        setPhase('idle');
        setSeconds(0);
      } else {
        setSeconds(remaining);
        // Periodically save elapsed time to localStorage (every 10s)
        if (elapsedRef.current % 10 === 0) {
          saveTimer({ mode, phase: 'running', targetEnd: targetEndRef.current, startTime: startTimeRef.current?.getTime() || 0, elapsed: elapsedRef.current, taskId: selectedTaskRef.current, notes: notesRef.current, seconds: remaining });
        }
      }
    }, 1000);

    intervalRef.current = id;
    return () => {
      clearInterval(id);
      intervalRef.current = null;
    };
  }, [phase, mode]);

  // ── Completion handler (stored in ref to avoid stale closures) ──
  const handleComplete = useCallback(async () => {
    const startedAt = startTimeRef.current;
    const now = new Date();
    const minutes = Math.max(1, Math.round(elapsedRef.current / 60));

    if (mode === 'WORK') {
      const taskId = selectedTaskRef.current;
      if (taskId && startedAt) {
        try {
          await createPomodoroSession({
            task_id: String(taskId),
            start_time: startedAt.toISOString(),
            end_time: now.toISOString(),
            duration_minutes: minutes,
            type: 'WORK',
            status: 'COMPLETED',
            notes: notesRef.current || '',
          });
          await addTokenRecord(60, '首次番茄钟', true, true).catch(() => {});
          const todayStr = localDate();
          const { count } = await supabase.from('token_records').select('*', { count: 'exact', head: true })
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id).eq('source', '番茄钟').gte('created_at', todayStr);
          const done = (count ?? 0) + 1;
          const tierAmount = done <= 4 ? 40 : done <= 8 ? 50 : 60;
          await addTokenRecord(tierAmount, '番茄钟').catch(() => {});
        } catch (e) { console.error('[handleComplete] error:', e); }
      }
      alert('番茄钟完成！休息一下吧~');
    } else {
      // Record break session
      try {
        if (startedAt) {
          await createPomodoroSession({
            task_id: selectedTaskRef.current || null,
            start_time: startedAt.toISOString(),
            end_time: now.toISOString(),
            duration_minutes: minutes,
            type: mode,
            status: 'COMPLETED',
            notes: '',
          });
        }
        await addTokenRecord(20, '休息', true, true).catch(() => {});
      } catch (e) { console.error('[handleComplete] break error:', e); }
      alert(mode === 'SHORT_BREAK' ? '短休息结束！准备开始工作吧~' : '长休息结束！精力充沛地继续吧~');
    }
  }, [mode, activeQuest, completeQuest]);

  const handleCompleteRef = useRef<(() => void) | null>(null);
  handleCompleteRef.current = handleComplete;

  // ── User actions (no interval creation here!) ──
  const toggleTimer = useCallback(() => {
    if (phase === 'idle') {
      if (mode === 'WORK' && !selectedTask) { alert('请先选择一个任务'); return; }
      const now = new Date();
      setStartTime(now);
      startTimeRef.current = now;
      setEndTimeState(new Date(now.getTime() + totalSeconds * 1000));
      targetEndRef.current = Date.now() + totalSeconds * 1000;
      elapsedRef.current = 0;
      needsCompleteRef.current = false;
      saveTimer({ mode, phase: 'running', targetEnd: targetEndRef.current, startTime: now.getTime(), elapsed: 0, taskId: selectedTask, notes, seconds: totalSeconds });
      setPhase('running');
      // 新手教程：开启一个番茄钟即算完成该步骤（不需要等 25 分钟跑完）
      if (mode === 'WORK' && activeQuest?.id === 'do-pomodoro') completeQuest('do-pomodoro');
    } else if (phase === 'running') {
      setEndTimeState(null);
      saveTimer({ mode, phase: 'paused', targetEnd: targetEndRef.current, startTime: startTimeRef.current?.getTime() || 0, elapsed: elapsedRef.current, taskId: selectedTask, notes, seconds });
      setPhase('paused');
    } else {
      const remainingSeconds = seconds;
      setEndTimeState(new Date(new Date().getTime() + remainingSeconds * 1000));
      targetEndRef.current = Date.now() + remainingSeconds * 1000;
      saveTimer({ mode, phase: 'running', targetEnd: targetEndRef.current, startTime: startTimeRef.current?.getTime() || 0, elapsed: elapsedRef.current, taskId: selectedTask, notes, seconds: remainingSeconds });
      setPhase('running');
    }
  }, [phase, mode, selectedTask, totalSeconds, seconds, activeQuest, completeQuest]);

  const handleSkip = useCallback(() => {
    clearTimer();
    needsCompleteRef.current = false;
    elapsedRef.current = mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK;
    setPhase('idle');
    setSeconds(mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    handleCompleteRef.current?.();
  }, [mode]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setSeconds(mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTimeState(null);
    elapsedRef.current = 0;
  }, [mode]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer();
    setPhase('idle');
    setMode(newMode);
    setSeconds(newMode === 'WORK' ? WORK_TIME : newMode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTimeState(null);
    elapsedRef.current = 0;
  }, []);

  const setSelectedTask = useCallback((id: string | null) => {
    setSelectedTaskState(id);
  }, []);

  const setNotes = useCallback((text: string) => {
    setNotesState(text);
  }, []);

  return (
    <PomodoroContext.Provider value={{
      phase, mode, seconds, selectedTask, tasks, notes,
      startTime, currentTime, totalSeconds, endTime,
      toggleTimer, handleSkip, resetTimer, switchMode,
      setSelectedTask, setNotes, refreshTasks,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
  return ctx;
}
