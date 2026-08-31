export const POMODORO_UNIT_MINUTES = 25;
export const MAX_POMODOROS_PER_SESSION = 4;
export const MAX_WORK_DURATION_MINUTES = 95;
export const MAX_REST_DURATION_MINUTES = 45;

export function calculatePomodoroCount(durationMinutes: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes < POMODORO_UNIT_MINUTES) return 0;
  return Math.min(MAX_POMODOROS_PER_SESSION, Math.floor(durationMinutes / POMODORO_UNIT_MINUTES));
}

export function formatCustomDuration(minutes: number) {
  return `${String(minutes).padStart(2, '0')}:00`;
}
