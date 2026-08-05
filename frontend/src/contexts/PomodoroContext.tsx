import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createPomodoroSession, fetchTasks, addTokenRecord } from '../services/api';
import { supabase } from '../services/supabase';
import type { Task } from '../types';

const WORK_TIME = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

type TimerPhase = 'idle' | 'running' | 'paused';
type TimerMode = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

interface PomodoroContextType {
  phase: TimerPhase;
  mode: TimerMode;
  seconds: number;
  selectedTask: number | null;
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
  setSelectedTask: (id: number | null) => void;
  setNotes: (notes: string) => void;
  refreshTasks: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [mode, setMode] = useState<TimerMode>('WORK');
  const [seconds, setSeconds] = useState(WORK_TIME);
  const [selectedTask, setSelectedTaskState] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotesState] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTimeState] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedTaskRef = useRef(selectedTask);
  const startTimeRef = useRef<Date | null>(null);
  const notesRef = useRef(notes);
  // 累计真实计时秒数（仅 running 状态下递增），用于排除暂停时长
  const elapsedRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { selectedTaskRef.current = selectedTask; }, [selectedTask]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalSeconds = mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK;

  // 结束时间由 toggleTimer 在 start / pause / resume 时显式设置：
  // - start：now + totalSeconds
  // - pause：null（清空显示）
  // - resume：now + 剩余秒数
  // 起始时间 startTime 仅在 idle → running 时设置一次，后续暂停/继续不动它。

  // Load tasks — expose refreshTasks so that child components (e.g. PomodoroTimer)
  // can reload the task list after creating/completing a task elsewhere.
  const refreshTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      const active = (Array.isArray(data) ? data : []).filter(
        (t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS'
      ).slice(0, 10);
      setTasks(active);
    } catch { /* */}
    try {
      const inProgress = await fetchTasks({ status: 'IN_PROGRESS' });
      const arr = Array.isArray(inProgress) ? inProgress : [];
      if (arr.length > 0) {
        setSelectedTaskState(prev => prev || arr[0].id);
      }
    } catch { /* */}
  }, []);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  // 跨组件刷新：Tasks 页保存/完成/删除任务时广播事件，这里订阅并刷新
  useEffect(() => {
    const handler = () => { refreshTasks(); };
    window.addEventListener('oto:tasks-changed', handler);
    return () => window.removeEventListener('oto:tasks-changed', handler);
  }, [refreshTasks]);

  const handleComplete = useCallback(async () => {
    if (mode === 'WORK') {
      const taskId = selectedTaskRef.current;
      const startedAt = startTimeRef.current;
      if (taskId && startedAt) {
        const now = new Date();
        // 用累计计时秒数换算时长，排除暂停期间的墙上时间
        const minutes = Math.max(1, Math.round(elapsedRef.current / 60));
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
          // 奖励代币
          addTokenRecord(60, '首次番茄钟', true, true).catch(() => {});
          // Get today's tomato count for tier calculation
          const todayStr = new Date().toISOString().slice(0, 10);
          const { count } = await supabase.from('token_records').select('*', { count: 'exact', head: true })
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id).eq('source', '番茄钟').gte('created_at', todayStr);
          const done = (count ?? 0) + 1;
          const tierAmount = done <= 4 ? 40 : done <= 8 ? 50 : 60;
          addTokenRecord(tierAmount, '番茄钟').catch(() => {});
        } catch { /* proceed */ }
      }
      alert('番茄钟完成！休息一下吧~');
    } else {
      // 休息完成 → 奖励代币
      addTokenRecord(20, '休息', true, true).catch(() => {});
    }
  }, [mode]);

  const toggleTimer = useCallback(() => {
    const tick = () => {
      // 在 updater 外累加：StrictMode 下 updater 会被重复调用，放里面会重复计数
      elapsedRef.current += 1;
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); setPhase('idle'); handleComplete(); return 0; }
        return prev - 1;
      });
    };
    if (phase === 'idle') {
      if (mode === 'WORK' && !selectedTask) { alert('请先选择一个任务'); return; }
      const now = new Date();
      setStartTime(now);
      startTimeRef.current = now;
      setEndTimeState(new Date(now.getTime() + totalSeconds * 1000));
      elapsedRef.current = 0;
      setPhase('running');
      intervalRef.current = setInterval(tick, 1000);
    } else if (phase === 'running') {
      clearInterval(intervalRef.current!);
      // 暂停时清空结束时间显示
      setEndTimeState(null);
      setPhase('paused');
    } else {
      // paused → running：起始时间 startTime 保持不变；
      // 结束时间重新计算为 now + 剩余秒数
      const remainingSeconds = seconds;
      setEndTimeState(new Date(new Date().getTime() + remainingSeconds * 1000));
      setPhase('running');
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [phase, mode, selectedTask, handleComplete]);

  const handleSkip = useCallback(() => {
    clearInterval(intervalRef.current!);
    const targetSeconds = mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK;
    // 快进：视为完整时长，避免写入 1 分钟的假记录
    elapsedRef.current = targetSeconds;
    setSeconds(targetSeconds);
    setPhase('idle');
    handleComplete();
  }, [mode, handleComplete]);

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current!);
    setPhase('idle');
    setSeconds(mode === 'WORK' ? WORK_TIME : mode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTimeState(null);
    elapsedRef.current = 0;
  }, [mode]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearInterval(intervalRef.current!);
    setPhase('idle');
    setMode(newMode);
    setSeconds(newMode === 'WORK' ? WORK_TIME : newMode === 'SHORT_BREAK' ? SHORT_BREAK : LONG_BREAK);
    setStartTime(null);
    startTimeRef.current = null;
    setEndTimeState(null);
    elapsedRef.current = 0;
  }, []);

  const setSelectedTask = useCallback((id: number | null) => {
    setSelectedTaskState(id);
  }, []);

  const setNotes = useCallback((text: string) => {
    setNotesState(text);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
