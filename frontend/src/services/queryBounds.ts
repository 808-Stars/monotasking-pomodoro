export interface DateBounds {
  start: string
  end: string
}

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'

function getShanghaiParts(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${input}`)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour) }
}

/** Return the Asia/Shanghai logical date, switching at 04:00. */
export function getLogicalDayKey(input: string | Date = new Date()): string {
  const { year, month, day, hour } = getShanghaiParts(input)
  const logicalDate = new Date(Date.UTC(year, month - 1, day - (hour < 4 ? 1 : 0), 12))
  return logicalDate.toISOString().slice(0, 10)
}

/** Return the Asia/Shanghai logical month, switching at 04:00 on the first day. */
export function getLogicalMonthKey(input: string | Date = new Date()): string {
  return getLogicalDayKey(input).slice(0, 7)
}

export function getLogicalDayStartIso(input: string | Date = new Date()): string {
  return new Date(`${getLogicalDayKey(input)}T04:00:00+08:00`).toISOString()
}

export function getLogicalMonthStartIso(input: string | Date = new Date()): string {
  return new Date(`${getLogicalMonthKey(input)}-01T04:00:00+08:00`).toISOString()
}

/** Return the 04:00 Asia/Shanghai start N logical days before a YYYY-MM-DD key. */
export function getLogicalLookbackStartIso(startKey: string, days = 28): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey)) throw new Error(`Invalid logical date: ${startKey}`)
  const anchor = new Date(`${startKey}T12:00:00Z`)
  if (Number.isNaN(anchor.getTime())) throw new Error(`Invalid logical date: ${startKey}`)
  anchor.setUTCDate(anchor.getUTCDate() - Math.max(1, Math.floor(days)))
  return new Date(`${anchor.toISOString().slice(0, 10)}T04:00:00+08:00`).toISOString()
}

/** Format an ISO timestamp as a compact Asia/Shanghai local date and time. */
export function formatShanghaiDateTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${input}`)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`
}

/** Return the Monday of the current logical week. */
export function getWeekStartKey(input: string | Date = new Date()): string {
  const logicalDate = new Date(`${getLogicalDayKey(input)}T12:00:00Z`)
  const daysSinceMonday = (logicalDate.getUTCDay() + 6) % 7
  logicalDate.setUTCDate(logicalDate.getUTCDate() - daysSinceMonday)
  return logicalDate.toISOString().slice(0, 10)
}

/** Return [start, end) bounds for a calendar month. */
export function getMonthBounds(month: string): DateBounds {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) throw new Error(`Invalid month: ${month}`)

  const year = Number(match[1])
  const monthIndex = Number(match[2])
  if (monthIndex < 1 || monthIndex > 12) throw new Error(`Invalid month: ${month}`)

  const nextYear = monthIndex === 12 ? year + 1 : year
  const nextMonth = monthIndex === 12 ? 1 : monthIndex + 1
  return {
    start: `${year}-${String(monthIndex).padStart(2, '0')}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}
