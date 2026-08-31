import assert from 'node:assert/strict'
import test from 'node:test'
import { RequestCache } from './cache.ts'

test('merges concurrent requests for the same scoped key', async () => {
  const cache = new RequestCache()
  let calls = 0
  let resolveRequest!: (value: string) => void
  const request = new Promise<string>(resolve => { resolveRequest = resolve })
  const fetcher = async () => {
    calls += 1
    return request
  }

  const first = cache.get('dashboard', fetcher, 30_000, 'user-a')
  const second = cache.get('dashboard', fetcher, 30_000, 'user-a')
  resolveRequest('fresh')

  assert.equal(await first, 'fresh')
  assert.equal(await second, 'fresh')
  assert.equal(calls, 1)
})

test('does not share data between users', async () => {
  const cache = new RequestCache()
  let calls = 0
  const fetcher = async () => `value-${++calls}`

  assert.equal(await cache.get('balance', fetcher, 30_000, 'user-a'), 'value-1')
  assert.equal(await cache.get('balance', fetcher, 30_000, 'user-b'), 'value-2')
})

test('cleans failed pending requests so the next call can retry', async () => {
  const cache = new RequestCache()
  let calls = 0
  const fetcher = async () => {
    calls += 1
    if (calls === 1) throw new Error('temporary failure')
    return 'recovered'
  }

  await assert.rejects(cache.get('data', fetcher, 30_000, 'user-a'), /temporary failure/)
  assert.equal(await cache.get('data', fetcher, 30_000, 'user-a'), 'recovered')
  assert.equal(calls, 2)
})

test('clear removes completed and pending entries', async () => {
  const cache = new RequestCache()
  let resolveRequest!: (value: string) => void
  const pending = new Promise<string>(resolve => { resolveRequest = resolve })
  const first = cache.get('data', () => pending, 30_000, 'user-a')

  cache.clear()
  resolveRequest('old')
  assert.equal(await first, 'old')

  let calls = 0
  assert.equal(await cache.get('data', async () => `new-${++calls}`, 30_000, 'user-a'), 'new-1')
})

test('invalidates parameterized keys when given the collection prefix', async () => {
  const cache = new RequestCache()
  let calls = 0
  const fetcher = async () => `value-${++calls}`

  assert.equal(await cache.get('reviews:all:100', fetcher, 30_000, 'user-a'), 'value-1')
  cache.invalidate('reviews')
  assert.equal(await cache.get('reviews:all:100', fetcher, 30_000, 'user-a'), 'value-2')
})
