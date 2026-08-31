import assert from 'node:assert/strict'
import test from 'node:test'
import { assertValidGachaCount } from './gachaRules.ts'

test('accepts only single or ten-pull counts', () => {
  assert.equal(assertValidGachaCount(1), 1)
  assert.equal(assertValidGachaCount(10), 10)
  assert.throws(() => assertValidGachaCount(2), /1 或 10/)
})
