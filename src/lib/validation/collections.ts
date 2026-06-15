export function getDuplicateValues<T extends string | number>(
  values: readonly T[],
): T[] {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort((left, right) => String(left).localeCompare(String(right)));
}
