import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProgressCache, getCachedProgress, peekProgressCache, progressCacheKey } from './progressCache';

const range = {
  from: new Date('2026-11-01T03:00:00.000Z'),
  to: new Date('2026-12-01T03:00:00.000Z'),
  bucket: 'day',
};
const reportKey = progressCacheKey('report', range, 'America/Buenos_Aires');

beforeEach(() => clearProgressCache());
afterEach(() => vi.useRealTimers());

describe('progress cache', () => {
  it('reuses one request across repeated visits and concurrent consumers', async () => {
    const fetcher = vi.fn(async () => ({ sessions: 3 }));
    const [first, second] = await Promise.all([
      getCachedProgress('user-a', reportKey, fetcher),
      getCachedProgress('user-a', reportKey, fetcher),
    ]);
    expect(first).toEqual(second);
    await getCachedProgress('user-a', reportKey, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(peekProgressCache('user-a', reportKey)).toEqual({ sessions: 3 });
  });

  it('refreshes expired data but keeps it visible while loading', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => ({ sessions: fetcher.mock.calls.length }));
    await getCachedProgress('user-a', reportKey, fetcher);
    await vi.advanceTimersByTimeAsync(60_001);
    expect(peekProgressCache('user-a', reportKey)).toEqual({ sessions: 1 });
    expect(await getCachedProgress('user-a', reportKey, fetcher)).toEqual({ sessions: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('separates periods, exercise series and users', async () => {
    const exerciseKey = progressCacheKey('exercise', range, 'America/Buenos_Aires', 'exercise-1');
    const otherPeriodKey = progressCacheKey('report', { ...range, bucket: 'week' }, 'America/Buenos_Aires');
    await getCachedProgress('user-a', reportKey, async () => 'report');
    await getCachedProgress('user-a', exerciseKey, async () => 'exercise');
    expect(peekProgressCache('user-a', otherPeriodKey)).toBeUndefined();
    expect(peekProgressCache('user-b', reportKey)).toBeUndefined();
    await getCachedProgress('user-b', reportKey, async () => 'other user');
    expect(peekProgressCache('user-a', exerciseKey)).toBeUndefined();
  });

  it('does not restore requests invalidated by completion or logout, or cache errors', async () => {
    let resolve!: (value: string) => void;
    const inFlight = getCachedProgress('user-a', reportKey, () => new Promise<string>(done => { resolve = done; }));
    clearProgressCache();
    resolve('old');
    await inFlight;
    expect(peekProgressCache('user-a', reportKey)).toBeUndefined();
    await expect(getCachedProgress('user-a', reportKey, async () => { throw Error('offline'); })).rejects.toThrow('offline');
    expect(peekProgressCache('user-a', reportKey)).toBeUndefined();
    await getCachedProgress('user-a', reportKey, async () => 'new');
    clearProgressCache();
    expect(peekProgressCache('user-a', reportKey)).toBeUndefined();
  });
});
