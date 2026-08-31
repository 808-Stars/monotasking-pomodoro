export async function collectReportPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>, pageSize = 1000) {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
