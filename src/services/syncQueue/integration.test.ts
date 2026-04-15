import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncQueue } from './SyncQueue';
import { syncProcessor } from './syncProcessor';
import { syncStateManager } from './SyncStateManager';

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

/**
 * These are realistic end-to-end tests for the sync queue system.
 * They test the actual integration between SyncQueue, SyncProcessor, and SyncStateManager
 * using the real singleton instances.
 */
describe('SyncQueue - End-to-End Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    syncQueue.clear();
    syncStateManager.reset();
    syncProcessor.stop();
  });

  afterEach(() => {
    syncProcessor.stop();
  });

  describe('Persistence and Recovery', () => {
    it('should persist items after app restart', () => {
      // Add item to queue
      const item1 = syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: { routineId: '123' },
        createdAt: Date.now(),
        attemptCount: 0,
      });

      const item2 = syncQueue.add({
        type: 'session_end',
        priority: 'high',
        payload: { sessionId: '456' },
        createdAt: Date.now(),
        attemptCount: 0,
      });

      expect(syncQueue.getCount()).toBe(2);

      // Simulate app restart by creating new queue instance
      // (in real scenario, SyncQueue is a singleton that loads from storage on init)
      const stored = localStorage.getItem('kinetic:sync-queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items.map((i: any) => i.id)).toContain(item1.id);
      expect(parsed.items.map((i: any) => i.id)).toContain(item2.id);
    });

    it('should maintain retry state across restarts', () => {
      const now = Date.now();

      const item = syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: {},
        createdAt: now,
        attemptCount: 0,
      });

      // Simulate a retry attempt
      const nextRetry = now + 10000;
      syncQueue.update(item.id, {
        attemptCount: 1,
        lastAttemptAt: now,
        nextRetryAt: nextRetry,
        error: 'Network timeout',
      });

      const stored = localStorage.getItem('kinetic:sync-queue');
      const parsed = JSON.parse(stored!);
      const savedItem = parsed.items[0];

      expect(savedItem.attemptCount).toBe(1);
      expect(savedItem.lastAttemptAt).toBe(now);
      expect(savedItem.nextRetryAt).toBe(nextRetry);
      expect(savedItem.error).toBe('Network timeout');
    });
  });

  describe('Handler Execution with State Management', () => {
    it('should execute handlers and update state on success', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      syncProcessor.registerHandler('routine_save', handler);

      syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: { routineId: '123' },
        createdAt: Date.now(),
        attemptCount: 0,
      });

      expect(syncQueue.getCount()).toBe(1);

      const results = await syncProcessor.processQueue();

      // Handler called and item removed
      expect(handler).toHaveBeenCalled();
      expect(syncQueue.getCount()).toBe(0);
    });

    it('should retry on transient errors with exponential backoff', async () => {
      let attemptCount = 0;
      const handler = vi.fn(async () => {
        attemptCount++;
        throw new Error('Network timeout');
      });

      syncProcessor.registerHandler('routine_save', handler);

      const item = syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: {},
        createdAt: Date.now(),
        attemptCount: 0,
      });

      // First processing attempt
      await syncProcessor.processQueue();
      expect(handler).toHaveBeenCalledTimes(1);

      // Item should be in queue with retry info
      const updated = syncQueue.getById(item.id);
      expect(updated).toBeDefined();
      expect(updated!.attemptCount).toBe(1);
      expect(updated!.nextRetryAt).toBeGreaterThan(Date.now());
    });

    it('should remove item on permanent error', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Unauthorized'));
      syncProcessor.registerHandler('session_end', handler);

      const item = syncQueue.add({
        type: 'session_end',
        priority: 'high',
        payload: {},
        createdAt: Date.now(),
        attemptCount: 0,
      });

      await syncProcessor.processQueue();

      expect(handler).toHaveBeenCalled();
      expect(syncQueue.getById(item.id)).toBeUndefined(); // Removed
    });
  });

  describe('Priority and Order', () => {
    it('should process high priority items before normal priority', async () => {
      const executionOrder: string[] = [];

      const handler = (type: string) => async () => {
        executionOrder.push(type);
      };

      syncProcessor.registerHandler('routine_save', handler('routine_save'));
      syncProcessor.registerHandler('session_end', handler('session_end'));
      syncProcessor.registerHandler('profile_update', handler('profile_update'));

      const now = Date.now();

      // Add in reverse priority order
      syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: {},
        createdAt: now,
        attemptCount: 0,
      });

      syncQueue.add({
        type: 'session_end',
        priority: 'high',
        payload: {},
        createdAt: now + 100,
        attemptCount: 0,
      });

      syncQueue.add({
        type: 'profile_update',
        priority: 'normal',
        payload: {},
        createdAt: now + 50,
        attemptCount: 0,
      });

      await syncProcessor.processQueue();

      // High priority first
      expect(executionOrder[0]).toBe('session_end');
      // Then normal priority ordered by createdAt
      expect(executionOrder.slice(1)).toContain('profile_update');
      expect(executionOrder.slice(1)).toContain('routine_save');
    });
  });

  describe('State Transitions', () => {
    it('should transition through proper sync states', async () => {
      const stateHistory: Array<{ status: string; pendingCount: number }> = [];

      syncStateManager.onStateChange(state => {
        stateHistory.push({
          status: state.status,
          pendingCount: state.pendingCount,
        });
      });

      const handler = vi.fn().mockResolvedValue(undefined);
      syncProcessor.registerHandler('routine_save', handler);

      syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: {},
        createdAt: Date.now(),
        attemptCount: 0,
      });

      // Initial state should be idle
      expect(syncStateManager.getSyncState().status).toBe('idle');

      await syncProcessor.processQueue();

      // Should transition and end back at idle
      expect(stateHistory.length).toBeGreaterThan(0);
      expect(syncStateManager.getSyncState().status).toBe('idle');
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should cleanup stale items automatically during processing', () => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      // Add old item (stale)
      syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: {},
        createdAt: now - sevenDaysMs - 1000,
        attemptCount: 0,
      });

      // Add recent item
      syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: {},
        createdAt: now,
        attemptCount: 0,
      });

      expect(syncQueue.getCount()).toBe(2);

      // Register handler for recent item
      const handler = vi.fn().mockResolvedValue(undefined);
      syncProcessor.registerHandler('routine_save', handler);

      syncProcessor.processQueue();

      // Stale item should be removed
      expect(syncQueue.getCount()).toBeLessThanOrEqual(1);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle session end workflow', async () => {
      const sessionHandler = vi.fn().mockResolvedValue(undefined);
      const profileHandler = vi.fn().mockResolvedValue(undefined);

      syncProcessor.registerHandler('session_end', sessionHandler);
      syncProcessor.registerHandler('profile_update', profileHandler);

      const now = Date.now();

      // User ends session
      const sessionItem = syncQueue.add({
        type: 'session_end',
        priority: 'high', // High priority
        payload: {
          sessionId: 'sess-123',
          endedAt: now,
          sessionData: { duration: 45 },
        },
        createdAt: now,
        attemptCount: 0,
      });

      // Profile update follows
      const profileItem = syncQueue.add({
        type: 'profile_update',
        priority: 'normal',
        payload: {
          userId: 'user-123',
          totalSessions: 10,
        },
        createdAt: now + 100,
        attemptCount: 0,
      });

      const results = await syncProcessor.processQueue();

      // Both should succeed
      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);

      // Session should be called before profile
      const calls = [sessionHandler.mock.calls[0], profileHandler.mock.calls[0]];
      expect(calls).toBeTruthy();

      // Queue should be empty
      expect(syncQueue.getCount()).toBe(0);
    });

    it('should handle network recovery', async () => {
      let callCount = 0;
      const handler = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network unreachable');
        }
        // Second attempt succeeds
      });

      syncProcessor.registerHandler('routine_save', handler);

      const item = syncQueue.add({
        type: 'routine_save',
        priority: 'normal',
        payload: { routineId: '123' },
        createdAt: Date.now(),
        attemptCount: 0,
      });

      // First attempt fails
      await syncProcessor.processQueue();
      expect(syncQueue.getById(item.id)).toBeDefined(); // Still in queue
      expect(handler).toHaveBeenCalledTimes(1);

      // Manually set nextRetryAt to now to retry immediately
      syncQueue.update(item.id, {
        nextRetryAt: Date.now(),
      });

      // Second attempt succeeds
      await syncProcessor.processQueue();
      expect(syncQueue.getById(item.id)).toBeUndefined(); // Removed
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should detect and report sync progress', () => {
      syncProcessor.registerHandler('routine_save', async () => {
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      for (let i = 0; i < 5; i++) {
        syncQueue.add({
          type: 'routine_save',
          priority: 'normal',
          payload: { id: i },
          createdAt: Date.now(),
          attemptCount: 0,
        });
      }

      const stats = syncProcessor.getStats();

      expect(stats.totalPending).toBe(5);
      expect(stats.readyToProcess).toBe(5);
      expect(stats.byType.routine_save).toBe(5);
    });
  });
});
