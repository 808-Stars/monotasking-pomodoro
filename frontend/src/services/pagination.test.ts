import assert from 'node:assert/strict';
import test from 'node:test';
import { collectReportPages } from './pagination.ts';

test('collects every page instead of silently truncating report data', async () => {
  const rows = [1, 2, 3, 4, 5];
  const requestedOffsets: number[] = [];
  const result = await collectReportPages(async (from, to) => {
    requestedOffsets.push(from);
    return rows.slice(from, to + 1);
  }, 2);

  assert.deepEqual(result, rows);
  assert.deepEqual(requestedOffsets, [0, 2, 4]);
});
