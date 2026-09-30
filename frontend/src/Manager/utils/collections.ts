export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

export function indexBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T> {
  return new Map(items.map((item) => [key(item), item]));
}

export function sumBy<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((sum, item) => sum + value(item), 0);
}

/** Next id for a table, as GENERATED ... AS IDENTITY would hand out. */
export function nextId<T>(rows: readonly T[], id: (row: T) => number): number {
  return rows.reduce((max, row) => Math.max(max, id(row)), 0) + 1;
}
