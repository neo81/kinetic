import type { CompletedSession } from '../../types';

// Memory-only, single-user cache; never persist workout history on disk.
let entry: { userId: string; expires: number; data: CompletedSession[] } | undefined;
let pending: { userId: string; promise: Promise<CompletedSession[]> } | undefined;
let generation = 0;

export function peekSessionHistory(userId: string | undefined) {
  return userId && entry?.userId === userId ? entry.data : undefined;
}

export function clearSessionHistoryCache() {
  generation++;
  entry = undefined;
  pending = undefined;
}

export function getCachedSessionHistory(userId: string, fetcher: () => Promise<CompletedSession[]>) {
  if (entry?.userId === userId && entry.expires > Date.now()) return Promise.resolve(entry.data);
  if (pending?.userId === userId) return pending.promise;
  if ((entry && entry.userId !== userId) || (pending && pending.userId !== userId)) clearSessionHistoryCache();
  const version = generation;
  const promise = fetcher().then(data => {
    if (generation === version) entry = { userId, data, expires: Date.now() + 60_000 };
    return data;
  }).finally(() => {
    if (pending?.promise === promise) pending = undefined;
  });
  pending = { userId, promise };
  return promise;
}
