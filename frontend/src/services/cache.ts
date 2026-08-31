type CacheEntry = {
  data: unknown;
  ts: number;
}

type PendingEntry = Promise<unknown>

/** 用户隔离、可合并进行中请求的轻量内存缓存。 */
export class RequestCache {
  private readonly data = new Map<string, CacheEntry>()
  private readonly pending = new Map<string, PendingEntry>()
  private generation = 0

  private makeKey(key: string, scope: string) {
    return `${scope}::${key}`
  }

  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number, scope: string): Promise<T> {
    const fullKey = this.makeKey(key, scope)
    const entry = this.data.get(fullKey)
    if (entry && Date.now() - entry.ts < ttl) return entry.data as T
    if (entry) this.data.delete(fullKey)

    const running = this.pending.get(fullKey)
    if (running) return running as Promise<T>

    const requestGeneration = this.generation
    let request: Promise<T>
    request = Promise.resolve()
      .then(fetcher)
      .then(result => {
        if (requestGeneration === this.generation) {
          this.data.set(fullKey, { data: result, ts: Date.now() })
        }
        return result
      })
      .finally(() => {
        if (this.pending.get(fullKey) === request) {
          this.pending.delete(fullKey)
        }
      })

    this.pending.set(fullKey, request)
    return request
  }

  invalidate(...keys: string[]) {
    if (keys.length === 0) {
      this.generation += 1
      this.data.clear()
      this.pending.clear()
      return
    }

    this.generation += 1
    for (const fullKey of [...this.data.keys(), ...this.pending.keys()]) {
      const separator = fullKey.indexOf('::')
      const logicalKey = separator >= 0 ? fullKey.slice(separator + 2) : fullKey
      if (keys.some(key => logicalKey === key
        || logicalKey.startsWith(`${key}:`)
        || logicalKey.startsWith(`${key}-`))) {
        this.data.delete(fullKey)
        this.pending.delete(fullKey)
      }
    }
  }

  clear() {
    this.generation += 1
    this.data.clear()
    this.pending.clear()
  }
}
