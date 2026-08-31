import assert from 'node:assert/strict'
import test from 'node:test'
import { getLogicalDayKey, getLogicalDayStartIso, getLogicalMonthStartIso, getMonthBounds, getWeekStartKey, formatShanghaiDateTime } from './queryBounds.ts'

test('returns an inclusive month start and exclusive next-month bound', () => {
  assert.deepEqual(getMonthBounds('2026-02'), {
    start: '2026-02-01',
    end: '2026-03-01',
  })
})

test('handles December without leaking into the same year', () => {
  assert.deepEqual(getMonthBounds('2026-12'), {
    start: '2026-12-01',
    end: '2027-01-01',
  })
})

test('uses the previous Monday as the week start on Sunday', () => {
  assert.equal(getWeekStartKey('2026-08-23T12:00:00+08:00'), '2026-08-17')
})

test('switches logical day at 04:00 in Asia/Shanghai', () => {
  assert.equal(getLogicalDayKey('2026-08-23T03:59:59+08:00'), '2026-08-22')
  assert.equal(getLogicalDayKey('2026-08-23T04:00:00+08:00'), '2026-08-23')
})

test('returns ISO starts for the logical day and month', () => {
  assert.equal(getLogicalDayStartIso('2026-08-23T03:59:59+08:00'), '2026-08-21T20:00:00.000Z')
  assert.equal(getLogicalMonthStartIso('2026-08-01T03:59:59+08:00'), '2026-06-30T20:00:00.000Z')
})

test('formats snapshot time in Shanghai local time', () => {
  assert.equal(formatShanghaiDateTime('2026-08-27T06:30:00.000Z'), '2026-08-27 14:30')
})
