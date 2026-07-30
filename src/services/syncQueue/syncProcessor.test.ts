import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncQueue } from './SyncQueue';
import { syncProcessor } from './syncProcessor';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});


describe('SyncProcessor - Basic Operations', () => {
  beforeEach(() => {
    localStorage.clear();
    syncQueue.clear();
    syncProcessor.stop();
  });

  afterEach(() => {
    syncProcessor.stop();
  });

  it('should register handlers without errors', () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    expect(() => {
      syncProcessor.registerHandler('routine_save', handler);
    }).not.toThrow();
  });

  it('should process queue and execute registered handlers', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    syncProcessor.registerHandler('routine_save', handler);

    syncQueue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: { id: '123' },
      createdAt: Date.now(),
      attemptCount: 0,
    });

    await syncProcessor.processQueue();

    expect(handler).toHaveBeenCalled();
  });

  it('should return results from processQueue', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    syncProcessor.registerHandler('routine_save', handler);

    syncQueue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    const results = await syncProcessor.processQueue();

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should provide queue stats', () => {
    syncProcessor.registerHandler('routine_save', () => Promise.resolve());

    syncQueue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    const stats = syncProcessor.getStats();

    expect(stats.totalPending).toBe(1);
    expect(stats.byType.routine_save).toBe(1);
  });

  it('should handle empty queue gracefully', async () => {
    const results = await syncProcessor.processQueue();

    expect(results).toEqual([]);
  });

  it('should support manual sync trigger', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    syncProcessor.registerHandler('session_end', handler);

    syncQueue.add({
      type: 'session_end',
      priority: 'high',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    const results = await syncProcessor.triggerManualSync();

    expect(Array.isArray(results)).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should start and stop processor', () => {
    expect(() => {
      syncProcessor.start();
      syncProcessor.stop();
    }).not.toThrow();
  });

  it('should prevent overlapping queue runs without processing items twice', async () => {
    const handler = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    syncProcessor.registerHandler('routine_save', handler);

    for (let i = 0; i < 3; i++) {
      syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: { i },
        createdAt: Date.now(),
        attemptCount: 0,
      });
    }

    // Trigger processing multiple times concurrently
    const runs = await Promise.all([
      syncProcessor.processQueue(),
      syncProcessor.processQueue(),
      syncProcessor.processQueue(),
    ]);

    expect(handler).toHaveBeenCalledTimes(3);
    expect(runs.flat()).toHaveLength(3);
    expect(syncQueue.getCount()).toBe(0);
  });
});
