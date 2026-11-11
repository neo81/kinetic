// Short-lived, memory-only reports. A user switch or session completion clears all entries.
let cachedUserId: string | undefined;
let generation = 0;
const entries = new Map<string, { data: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 40;

export function clearProgressCache() {
  generation++;
  cachedUserId = undefined;
  entries.clear();
  pending.clear();
}

export function progressCacheKey(
  kind: 'report' | 'exercise' | 'sets',
  range: { from: Date; to: Date; bucket: string },
  timezone: string,
  exerciseId?: string,
) {
  return JSON.stringify([kind, range.from.toISOString(), range.to.toISOString(), range.bucket, timezone, exerciseId]);
}

export function peekProgressCache<T>(userId: string | undefined, key: string): T | undefined {
  return userId && userId === cachedUserId ? entries.get(key)?.data as T | undefined : undefined;
}

export function getCachedProgress<T>(userId: string | undefined, key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!userId) return fetcher();
  if (cachedUserId && cachedUserId !== userId) clearProgressCache();
  cachedUserId = userId;
  const cached = entries.get(key);
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.data as T);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const version = generation;
  const promise = fetcher().then(data => {
    if (version === generation && cachedUserId === userId) {
      entries.delete(key);
      entries.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    }
    return data;
  }).finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}
