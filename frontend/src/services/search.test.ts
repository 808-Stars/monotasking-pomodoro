import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesSearch } from './search.ts';

test('empty search matches every record', () => {
  assert.equal(matchesSearch('  ', '任意内容'), true);
});

test('search matches any supplied field case-insensitively', () => {
  assert.equal(matchesSearch('report', '项目名称', 'Weekly Report'), true);
  assert.equal(matchesSearch('missing', '项目名称', '项目描述'), false);
});
