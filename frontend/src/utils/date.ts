/** 逻辑日日期：凌晨4点视为新一天（UTC+4 等效） */
export function localDate(d = new Date()): string {
  const t = new Date(d.getTime() - 4 * 3600_000)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** 逻辑月：同上，凌晨4点前算上月 */
export function localMonth(d = new Date()): string {
  const t = new Date(d.getTime() - 4 * 3600_000)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
}
