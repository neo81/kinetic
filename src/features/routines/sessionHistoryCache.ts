import type { CompletedSession } from '../../types';
import { HISTORY_PAGE_SIZE } from './historyWindow';

// Memory-only, single-user cache; never persist workout history on disk.
let cachedUserId: string | undefined;
const entries = new Map<number, { expires: number; data: CompletedSession[] }>();
const pending = new Map<number, Promise<CompletedSession[]>>();
let generation = 0;

export function peekSessionHistory(userId: string | undefined, page = 0) {
  return userId === cachedUserId ? entries.get(page)?.data : undefined;
}

export function peekLoadedSessionHistory(userId: string | undefined) {
  if (!peekSessionHistory(userId)) return undefined;
  const sessions: CompletedSession[] = [];
  const seen = new Set<string>();
  let page = 0;
  let hasMore = false;
  while (true) {
    const data = peekSessionHistory(userId, page);
    if (!data) break;
    for (const session of data.slice(0, HISTORY_PAGE_SIZE)) {
      if (!seen.has(session.id)) {
        sessions.push(session);
        seen.add(session.id);
      }
    }
    hasMore = data.length > HISTORY_PAGE_SIZE;
    if (!hasMore || !entries.has(page + 1)) break;
    page++;
  }
  return { sessions, page, hasMore };
}

export function clearSessionHistoryCache() {
  generation++;
  cachedUserId = undefined;
  entries.clear();
  pending.clear();
}

export function getCachedSessionHistory(userId: string, fetcher: () => Promise<CompletedSession[]>, page = 0) {
  if (cachedUserId && cachedUserId !== userId) clearSessionHistoryCache();
  cachedUserId = userId;
  const cached = entries.get(page);
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.data);
  const inFlight = pending.get(page);
  if (inFlight) return inFlight;
  const version = generation;
  const promise = fetcher().then(data => {
    if (generation === version) entries.set(page, { data, expires: Date.now() + 60_000 });
    return data;
  }).finally(() => {
    if (pending.get(page) === promise) pending.delete(page);
  });
  pending.set(page, promise);
  return promise;
}
