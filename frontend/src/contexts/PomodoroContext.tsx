import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPomodoroSession, fetchTasks, addTokenRecord } from '../services/api';
import { supabase } from '../services/supabase';
import { localDate } from '../utils/date';
import type { Task } from '../types';
import { useOnboarding } from './OnboardingContext';
import { calculatePomodoroCount, MAX_REST_DURATION_MINUTES, MAX_WORK_DURATION_MINUTES } from '../services/pomodoroCount';

const WORK_TIME = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const TIMER_KEY = 'monopomo-timer';

type TimerPhase = 'idle' | 'running' | 'paused';
type TimerMode = 'WORK' | 'CUSTOM' | 'COUNT_UP' | 'SHORT_BREAK' | 'LONG_BREAK' | 'CUSTOM_BREAK' | 'COUNT_UP_BREAK';

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
  customMinutes: number;
  endTime: Date | null;
  toggleTimer: () => void;
  finishTimer: () => void;
  resetTimer: () => void;
  switchMode: (newMode: TimerMode) => void;
  setCustomMinutes: (minutes: number) => void;
  setSelectedTask: (id: string | null) => void;
  setNotes: (notes: string) => void;
  refreshTasks: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { activeQuest, completeQuest } = useOnboarding();
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [customMinutes, setCustomMinutesState] = useState(25);
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
  const countUpRunStartedAtRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { selectedTaskRef.current = selectedTask; }, [selectedTask]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // ── Timer persistence helpers ──
  const saveTimer = (data: { mode: TimerMode; phase: TimerPhase; targetEnd: number; startTime: number; elapsed: number; taskId: string | null; notes: string; seconds: number; customMinutes: number }) => {
    try { localStorage.setItem(TIMER_KEY, JSON.stringify(data)); } catch {}
  };
  const clearTimer = () => { try { localStorage.removeItem(TIMER_KEY); } catch {} };

  // Restore timer on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const restoredMode = saved.mode === 'LONG_BREAK' ? 'SHORT_BREAK' : (saved.mode || 'WORK');
      const isCountUp = restoredMode === 'COUNT_UP' || restoredMode === 'COUNT_UP_BREAK';
      if (!isCountUp && !saved.targetEnd) return;
      const remaining = isCountUp ? Math.max(0, saved.seconds || saved.elapsed || 0) : Math.max(0, Math.round((saved.targetEnd - Date.now()) / 1000));
      if (!isCountUp && remaining <= 0) { clearTimer(); return; } // expired
      setMode(restoredMode);
      setCustomMinutesState(Math.min(restoredMode === 'CUSTOM_BREAK' ? MAX_REST_DURATION_MINUTES : MAX_WORK_DURATION_MINUTES, Math.max(1, Number(saved.customMinutes) || (restoredMode === 'CUSTOM_BREAK' ? 5 : 25))));
      setSeconds(saved.phase === 'paused' ? saved.seconds : remaining);
      setSelectedTaskState(saved.taskId || null);
      selectedTaskRef.current = saved.taskId || null;
      setNotesState(saved.notes || '');
      notesRef.current = saved.notes || '';
      startTimeRef.current = saved.startTime ? new Date(saved.startTime) : null;
      setStartTime(saved.startTime ? new Date(saved.startTime) : null);
      elapsedRef.current = saved.elapsed || 0;
      targetEndRef.current = saved.targetEnd || 0;
      countUpRunStartedAtRef.current = isCountUp && saved.phase !== 'paused' ? Date.now() : null;
      needsCompleteRef.current = false;
      if (saved.phase === 'paused') {
        setPhase('paused');
      } else {
        setEndTimeState(isCountUp ? null : new Date(saved.targetEnd));
        setPhase('running');
      }
    } catch {}
  }, []);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalSeconds = mode === 'WORK' ? WORK_TIME : mode === 'CUSTOM' ? customMinutes * 60 : mode === 'CUSTOM_BREAK' ? Math.min(customMinutes, MAX_REST_DURATION_MINUTES) * 60 : mode === 'COUNT_UP' ? MAX_WORK_DURATION_MINUTES * 60 : mode === 'COUNT_UP_BREAK' ? MAX_REST_DURATION_MINUTES * 60 : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK;

  // Load tasks
  const refreshTasks = useCallback(async () => {
    try {
      const inProgress = await fetchTasks({ status: 'IN_PROGRESS' });
      const arr = Array.isArray(inProgress) ? inProgress : [];
      setTasks(arr.slice(0, 10));
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
      if (mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK') {
        const runStartedAt = countUpRunStartedAtRef.current || Date.now();
        const elapsed = Math.min(totalSeconds, elapsedRef.current + Math.floor((Date.now() - runStartedAt) / 1000));
        if (elapsed >= totalSeconds) {
          clearInterval(id);
          clearTimer();
          elapsedRef.current = elapsed;
          needsCompleteRef.current = true;
          setPhase('idle');
          setSeconds(elapsed);
        } else {
          setSeconds(elapsed);
        }
        return;
      }
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
          saveTimer({ mode, phase: 'running', targetEnd: targetEndRef.current, startTime: startTimeRef.current?.getTime() || 0, elapsed: elapsedRef.current, taskId: selectedTaskRef.current, notes: notesRef.current, seconds: remaining, customMinutes });
        }
      }
    }, 1000);

    intervalRef.current = id;
    return () => {
      clearInterval(id);
      intervalRef.current = null;
    };
  }, [phase, mode, totalSeconds, customMinutes]);

  // ── Completion handler (stored in ref to avoid stale closures) ──
  const handleComplete = useCallback(async () => {
    const startedAt = startTimeRef.current;
    const now = new Date();
    const minutes = Math.max(0, Math.floor(elapsedRef.current / 60));
    const pomodoroCount = calculatePomodoroCount(minutes);

    if (mode === 'WORK' || mode === 'CUSTOM' || mode === 'COUNT_UP') {
      const taskId = selectedTaskRef.current;
      if (pomodoroCount === 0) {
        alert('本次专注未满 25 分钟，不计入番茄钟记录。');
      } else if (taskId && startedAt) {
        try {
          await createPomodoroSession({
            task_id: String(taskId),
            start_time: startedAt.toISOString(),
            end_time: now.toISOString(),
            duration_minutes: minutes,
            pomodoro_count: pomodoroCount,
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
      const breakType = mode === 'LONG_BREAK' ? 'LONG_BREAK' : 'SHORT_BREAK';
      if (minutes < 5) {
        alert('本次休息未满 5 分钟，不计入休息记录。');
      } else {
        try {
          if (startedAt) {
            await createPomodoroSession({
              task_id: selectedTaskRef.current || null,
              start_time: startedAt.toISOString(),
              end_time: now.toISOString(),
              duration_minutes: minutes,
              type: breakType,
              status: 'COMPLETED',
              notes: notesRef.current || '',
            });
          }
          await addTokenRecord(20, '休息', true, true).catch(() => {});
        } catch (e) { console.error('[handleComplete] break error:', e); }
        alert(breakType === 'SHORT_BREAK' ? '短休息结束！准备开始工作吧~' : '长休息结束！精力充沛地继续吧~');
      }
    }
  }, [mode, activeQuest, completeQuest]);

  const handleCompleteRef = useRef<(() => void) | null>(null);
  handleCompleteRef.current = handleComplete;

  // ── User actions (no interval creation here!) ──
  const toggleTimer = useCallback(() => {
    if (phase === 'idle') {
      if (['WORK', 'CUSTOM', 'COUNT_UP'].includes(mode) && !selectedTask) { alert('请先选择一个任务'); return; }
      const now = new Date();
      const isCountUp = mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK';
      setStartTime(now);
      startTimeRef.current = now;
      setEndTimeState(isCountUp ? null : new Date(now.getTime() + totalSeconds * 1000));
      targetEndRef.current = isCountUp ? 0 : Date.now() + totalSeconds * 1000;
      elapsedRef.current = 0;
      countUpRunStartedAtRef.current = isCountUp ? Date.now() : null;
      needsCompleteRef.current = false;
      saveTimer({ mode, phase: 'running', targetEnd: targetEndRef.current, startTime: now.getTime(), elapsed: 0, taskId: selectedTask, notes, seconds: isCountUp ? 0 : totalSeconds, customMinutes });
      setPhase('running');
      // 新手教程：开启一个番茄钟即算完成该步骤（不需要等 25 分钟跑完）
      if (mode === 'WORK' && activeQuest?.id === 'do-pomodoro') completeQuest('do-pomodoro');
    } else if (phase === 'running') {
      setEndTimeState(null);
      if ((mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK') && countUpRunStartedAtRef.current) {
        elapsedRef.current = Math.min(totalSeconds, elapsedRef.current + Math.floor((Date.now() - countUpRunStartedAtRef.current) / 1000));
        countUpRunStartedAtRef.current = null;
        setSeconds(elapsedRef.current);
      }
      saveTimer({ mode, phase: 'paused', targetEnd: targetEndRef.current, startTime: startTimeRef.current?.getTime() || 0, elapsed: elapsedRef.current, taskId: selectedTask, notes, seconds: (mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK') ? elapsedRef.current : seconds, customMinutes });
      setPhase('paused');
    } else {
      const remainingSeconds = seconds;
      if (mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK') {
        countUpRunStartedAtRef.current = Date.now();
        setEndTimeState(null);
      } else {
        setEndTimeState(new Date(new Date().getTime() + remainingSeconds * 1000));
        targetEndRef.current = Date.now() + remainingSeconds * 1000;
      }
      saveTimer({ mode, phase: 'running', targetEnd: targetEndRef.current, startTime: startTimeRef.current?.getTime() || 0, elapsed: elapsedRef.current, taskId: selectedTask, notes, seconds: remainingSeconds, customMinutes });
      setPhase('running');
    }
  }, [phase, mode, selectedTask, totalSeconds, seconds, customMinutes, activeQuest, completeQuest]);

  const finishTimer = useCallback(() => {
    if (phase === 'idle') return;
    if ((mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK') && countUpRunStartedAtRef.current) {
      elapsedRef.current = Math.min(totalSeconds, elapsedRef.current + Math.floor((Date.now() - countUpRunStartedAtRef.current) / 1000));
      countUpRunStartedAtRef.current = null;
      setSeconds(elapsedRef.current);
    } else if (mode !== 'COUNT_UP' && mode !== 'COUNT_UP_BREAK') {
      elapsedRef.current = Math.max(elapsedRef.current, totalSeconds - seconds);
    }
    clearTimer();
    setEndTimeState(new Date());
    needsCompleteRef.current = true;
    setPhase('idle');
  }, [phase, mode, totalSeconds, seconds]);

  const resetTimer = useCallback(() => {
    if (phase !== 'idle') {
      const elapsed = mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK' ? elapsedRef.current : Math.max(elapsedRef.current, totalSeconds - seconds);
    }
    clearTimer();
    setPhase('idle');
    setSeconds(mode === 'WORK' ? WORK_TIME : mode === 'CUSTOM' || mode === 'CUSTOM_BREAK' ? customMinutes * 60 : mode === 'COUNT_UP' || mode === 'COUNT_UP_BREAK' ? 0 : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTimeState(null);
    elapsedRef.current = 0;
    countUpRunStartedAtRef.current = null;
  }, [phase, mode, customMinutes, totalSeconds, seconds]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer();
    setPhase('idle');
    setMode(newMode);
    const nextCustomMinutes = newMode === 'CUSTOM_BREAK' ? Math.min(customMinutes, MAX_REST_DURATION_MINUTES) : customMinutes;
    if (newMode === 'CUSTOM_BREAK') setCustomMinutesState(nextCustomMinutes);
    setSeconds(newMode === 'WORK' ? WORK_TIME : newMode === 'CUSTOM' || newMode === 'CUSTOM_BREAK' ? nextCustomMinutes * 60 : newMode === 'COUNT_UP' || newMode === 'COUNT_UP_BREAK' ? 0 : newMode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTimeState(null);
    elapsedRef.current = 0;
    countUpRunStartedAtRef.current = null;
  }, [customMinutes]);

  const setCustomMinutes = useCallback((minutes: number) => {
    const maxMinutes = mode === 'CUSTOM_BREAK' ? MAX_REST_DURATION_MINUTES : MAX_WORK_DURATION_MINUTES;
    const next = Math.min(maxMinutes, Math.max(1, Math.round(minutes) || 1));
    setCustomMinutesState(next);
    if (phase === 'idle' && mode === 'CUSTOM') setSeconds(next * 60);
  }, [phase, mode]);

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
      toggleTimer, finishTimer, resetTimer, switchMode,
      setCustomMinutes, customMinutes, setSelectedTask, setNotes, refreshTasks,
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
