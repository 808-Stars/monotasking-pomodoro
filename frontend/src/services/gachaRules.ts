export type GachaPullCount = 1 | 10

export function assertValidGachaCount(count: number): GachaPullCount {
  if (count !== 1 && count !== 10) {
    throw new Error('抽取次数只能是 1 或 10')
  }
  return count
}
