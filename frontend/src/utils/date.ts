import { getLogicalDayKey, getLogicalMonthKey } from '../services/queryBounds'

/** 逻辑日日期：Asia/Shanghai 凌晨 4 点视为新一天。 */
export function localDate(d = new Date()): string {
  return getLogicalDayKey(d)
}

/** 逻辑月：Asia/Shanghai 每月 1 日凌晨 4 点切换。 */
export function localMonth(d = new Date()): string {
  return getLogicalMonthKey(d)
}
