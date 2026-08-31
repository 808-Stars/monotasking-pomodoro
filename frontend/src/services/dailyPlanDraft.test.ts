import assert from 'node:assert/strict';
import test from 'node:test';
import { getChangedDailyPlanTextFields } from './dailyPlanDraft.ts';

test('returns only changed daily plan text fields', () => {
  assert.deepEqual(
    getChangedDailyPlanTextFields(
      { morning_reflection: '原规划', evening_review: '', notes: null },
      { morning_reflection: '新规划', evening_review: '', notes: '新备注' },
    ),
    { morning_reflection: '新规划', notes: '新备注' },
  );
});

test('does not save drafts that match the current plan', () => {
  assert.deepEqual(
    getChangedDailyPlanTextFields({ morning_reflection: '相同内容' }, { morning_reflection: '相同内容' }),
    {},
  );
});
