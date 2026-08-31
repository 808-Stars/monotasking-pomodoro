import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePomodoroCount, formatCustomDuration, MAX_REST_DURATION_MINUTES, MAX_WORK_DURATION_MINUTES } from './pomodoroCount.ts';

test('counts one pomodoro only at 25 minutes', () => {
  assert.equal(calculatePomodoroCount(24), 0);
  assert.equal(calculatePomodoroCount(25), 1);
  assert.equal(calculatePomodoroCount(49), 1);
});

test('counts additional complete 25-minute units and caps at four', () => {
  assert.equal(calculatePomodoroCount(50), 2);
  assert.equal(calculatePomodoroCount(99), 3);
  assert.equal(calculatePomodoroCount(100), 4);
  assert.equal(calculatePomodoroCount(95), 3);
  assert.equal(calculatePomodoroCount(180), 4);
});

test('uses the requested timer duration limits', () => {
  assert.equal(MAX_WORK_DURATION_MINUTES, 95);
  assert.equal(MAX_REST_DURATION_MINUTES, 45);
});

test('formats custom duration with a fixed zero-second suffix', () => {
  assert.equal(formatCustomDuration(5), '05:00');
  assert.equal(formatCustomDuration(25), '25:00');
  assert.equal(formatCustomDuration(95), '95:00');
});
