export function matchesSearch(query: string, ...values: Array<string | null | undefined>) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return values.some(value => value?.toLocaleLowerCase().includes(normalizedQuery));
}
