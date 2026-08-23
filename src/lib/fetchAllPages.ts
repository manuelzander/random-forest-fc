const PAGE_SIZE = 1000;

/**
 * Fetch every row of a Supabase query, paging past the 1000-row default cap.
 * Without this, large tables silently return only the first 1000 rows, which
 * quietly hides the most recent records.
 */
export async function fetchAllPages<T = any>(
  build: (from: number, to: number) => any,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...((data || []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}
