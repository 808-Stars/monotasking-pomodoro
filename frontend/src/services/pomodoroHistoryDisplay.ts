type HistorySession = {
  type: 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';
  tasks?: { name?: string } | null;
  notes?: string | null;
};

export function getPomodoroHistoryDisplay(session: HistorySession) {
  const isWork = session.type === 'WORK';

  return {
    isWork,
    title: isWork ? session.tasks?.name || '未关联任务' : '',
    notes: session.notes || '',
  };
}
