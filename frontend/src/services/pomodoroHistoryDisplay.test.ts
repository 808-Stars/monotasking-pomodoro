import test from 'node:test';
import assert from 'node:assert/strict';
import { getPomodoroHistoryDisplay } from './pomodoroHistoryDisplay.ts';

test('work sessions retain task title and notes', () => {
  assert.deepEqual(
    getPomodoroHistoryDisplay({ type: 'WORK', tasks: { name: '整理需求' }, notes: '记录重点' }),
    { isWork: true, title: '整理需求', notes: '记录重点' },
  );
});

test('break sessions expose notes but not task title', () => {
  assert.deepEqual(
    getPomodoroHistoryDisplay({ type: 'SHORT_BREAK', tasks: { name: '此前任务' }, notes: '此前备注' }),
    { isWork: false, title: '', notes: '此前备注' },
  );
});
