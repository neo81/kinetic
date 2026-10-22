import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSessionHistoryCache, getCachedSessionHistory, peekLoadedSessionHistory, peekSessionHistory } from './sessionHistoryCache';
import type { CompletedSession } from '../../types';

beforeEach(() => clearSessionHistoryCache());
afterEach(() => vi.useRealTimers());

describe('history cache performance and isolation', () => {
  it('retains older pages after leaving and returning to history', async () => {
    const sessions = Array.from({ length: 26 }, (_, index) => ({ id: `session-${index}` })) as CompletedSession[];
    const first = vi.fn(async () => sessions.slice(0, 21));
    const older = vi.fn(async () => sessions.slice(20));
    await getCachedSessionHistory('a', first);
    await getCachedSessionHistory('a', older, 1);
    expect(peekLoadedSessionHistory('a')?.sessions.map(session => session.id)).toEqual(sessions.map(session => session.id));
    await getCachedSessionHistory('a', older, 1);
    expect(older).toHaveBeenCalledTimes(1);
    clearSessionHistoryCache();
    expect(peekLoadedSessionHistory('a')).toBeUndefined();
  });
  it('serves five repeat visits with one slow request, including concurrent consumers', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return [] as CompletedSession[];
    });
    const start = Date.now();
    const first = getCachedSessionHistory('user-a', fetcher);
    const dashboard = getCachedSessionHistory('user-a', fetcher);
    await vi.advanceTimersByTimeAsync(1500);
    await Promise.all([first, dashboard]);
    const cold = Date.now() - start;
    const warmStart = Date.now();
    for (let i = 0; i < 5; i++) await getCachedSessionHistory('user-a', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cold).toBe(1500);
    expect(Date.now() - warmStart).toBe(0);
  });

  it('keeps stale data available while refreshing after expiry', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => [] as CompletedSession[]);
    await getCachedSessionHistory('a', fetcher);
    await vi.advanceTimersByTimeAsync(60_001);
    expect(peekSessionHistory('a')).toEqual([]);
    await getCachedSessionHistory('a', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidates after completion or logout and does not cache failures', async () => {
    const fetcher = vi.fn(async () => [] as CompletedSession[]);
    await getCachedSessionHistory('a', fetcher);
    clearSessionHistoryCache();
    expect(peekSessionHistory('a')).toBeUndefined();
    await getCachedSessionHistory('a', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    clearSessionHistoryCache();
    await expect(getCachedSessionHistory('a', async () => { throw Error('offline'); })).rejects.toThrow('offline');
    expect(peekSessionHistory('a')).toBeUndefined();
  });

  it('does not expose another user or restore a request invalidated in flight', async () => {
    let resolve!: (data: CompletedSession[]) => void;
    const pending = getCachedSessionHistory('a', () => new Promise(done => { resolve = done; }));
    await getCachedSessionHistory('b', async () => []);
    resolve([]);
    await pending;
    expect(peekSessionHistory('a')).toBeUndefined();
    expect(peekSessionHistory('b')).toEqual([]);
  });
});
