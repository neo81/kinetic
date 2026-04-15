import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncQueue, type SyncQueueItem } from './SyncQueue';

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

describe('SyncQueue - Persistence Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist items to localStorage when adding', () => {
    const queue = new SyncQueue();
    const item = queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: { routineId: '123' },
      createdAt: Date.now(),
      attemptCount: 0,
    });

    const stored = localStorage.getItem('kinetic:sync-queue');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe(1);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].id).toBe(item.id);
  });

  it('should load items from localStorage on initialization', () => {
    const queue1 = new SyncQueue();
    const item1 = queue1.add({
      type: 'session_end',
      priority: 'high',
      payload: { sessionId: '456' },
      createdAt: Date.now(),
      attemptCount: 0,
    });

    // Create new instance - should load from storage
    const queue2 = new SyncQueue();
    const allItems = queue2.getAll();

    expect(allItems).toHaveLength(1);
    expect(allItems[0].id).toBe(item1.id);
    expect(allItems[0].type).toBe('session_end');
  });

  it('should persist updates to existing items', () => {
    const queue = new SyncQueue();
    const item = queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: { routineId: '123' },
      createdAt: Date.now(),
      attemptCount: 0,
    });

    const updated = queue.update(item.id, {
      attemptCount: 1,
      lastAttemptAt: Date.now(),
      nextRetryAt: Date.now() + 5000,
      error: 'Network timeout',
    });

    const queue2 = new SyncQueue();
    const loaded = queue2.getById(item.id);

    expect(loaded).toBeDefined();
    expect(loaded!.attemptCount).toBe(1);
    expect(loaded!.error).toBe('Network timeout');
  });

  it('should clear localStorage when clearing queue', () => {
    const queue = new SyncQueue();
    queue.add({
      type: 'profile_update',
      priority: 'normal',
      payload: { userId: '789' },
      createdAt: Date.now(),
      attemptCount: 0,
    });

    queue.clear();

    const queue2 = new SyncQueue();
    expect(queue2.getAll()).toHaveLength(0);
  });

  it('should persist removal of items', () => {
    const queue = new SyncQueue();
    const item = queue.add({
      type: 'goals_update',
      priority: 'normal',
      payload: { goalId: '999' },
      createdAt: Date.now(),
      attemptCount: 0,
    });

    queue.remove(item.id);

    const queue2 = new SyncQueue();
    expect(queue2.getById(item.id)).toBeUndefined();
  });

  it('should handle version mismatch by clearing old data', () => {
    // Store old version data
    localStorage.setItem(
      'kinetic:sync-queue',
      JSON.stringify({
        version: 999, // Wrong version
        items: [
          {
            id: 'old-item',
            type: 'routine_save',
            priority: 'normal',
            payload: {},
            createdAt: Date.now(),
            attemptCount: 0,
          },
        ],
        lastPersistAt: Date.now(),
      })
    );

    const queue = new SyncQueue();
    expect(queue.getAll()).toHaveLength(0);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('kinetic:sync-queue', 'corrupted json {{{');

    expect(() => {
      new SyncQueue();
    }).not.toThrow();
  });

  it('should validate queue items on load', () => {
    localStorage.setItem(
      'kinetic:sync-queue',
      JSON.stringify({
        version: 1,
        items: [
          {
            id: 'valid-item',
            type: 'routine_save',
            priority: 'normal',
            payload: {},
            createdAt: Date.now(),
            attemptCount: 0,
          },
          {
            // Missing required fields
            id: 'invalid-item',
            type: 'routine_save',
            // Missing: priority, createdAt, attemptCount
          },
        ],
        lastPersistAt: Date.now(),
      })
    );

    const queue = new SyncQueue();
    expect(queue.getAll()).toHaveLength(1); // Only valid item loaded
    expect(queue.getAll()[0].id).toBe('valid-item');
  });
});

describe('SyncQueue - Core Operations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add items with auto-generated IDs', () => {
    const queue = new SyncQueue();
    const item = queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    expect(item.id).toBeTruthy();
    expect(typeof item.id).toBe('string');
    expect(item.id.length).toBeGreaterThan(0);
  });

  it('should get all items sorted by priority then createdAt', () => {
    const queue = new SyncQueue();
    const now = Date.now();

    // Add in mixed order
    const normal1 = queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: now + 100,
      attemptCount: 0,
    });

    const high1 = queue.add({
      type: 'session_end',
      priority: 'high',
      payload: {},
      createdAt: now + 200,
      attemptCount: 0,
    });

    const normal2 = queue.add({
      type: 'profile_update',
      priority: 'normal',
      payload: {},
      createdAt: now,
      attemptCount: 0,
    });

    const high2 = queue.add({
      type: 'goals_update',
      priority: 'high',
      payload: {},
      createdAt: now + 50,
      attemptCount: 0,
    });

    const sorted = queue.getAllSorted();

    // High priority first, then by createdAt
    expect(sorted[0].id).toBe(high2.id); // high, createdAt: now + 50
    expect(sorted[1].id).toBe(high1.id); // high, createdAt: now + 200
    expect(sorted[2].id).toBe(normal2.id); // normal, createdAt: now
    expect(sorted[3].id).toBe(normal1.id); // normal, createdAt: now + 100
  });

  it('should count items by type', () => {
    const queue = new SyncQueue();

    queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    queue.add({
      type: 'session_end',
      priority: 'high',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    expect(queue.getCountByType('routine_save')).toBe(2);
    expect(queue.getCountByType('session_end')).toBe(1);
    expect(queue.getCountByType('profile_update')).toBe(0);
  });

  it('should cleanup stale items older than 7 days', () => {
    const queue = new SyncQueue();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Add old item
    queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: now - sevenDaysMs - 1000, // 7 days + 1 second old
      attemptCount: 0,
    });

    // Add recent item
    queue.add({
      type: 'session_end',
      priority: 'high',
      payload: {},
      createdAt: now - 1000, // 1 second old
      attemptCount: 0,
    });

    const cleaned = queue.cleanupStaleItems();

    expect(cleaned).toBe(1); // One item removed
    expect(queue.getCount()).toBe(1);
    expect(queue.getAll()[0].type).toBe('session_end');
  });
});

describe('SyncQueue - Retry Logic Tests', () => {
  it('should update attemptCount and store retry info', () => {
    localStorage.clear();
    const queue = new SyncQueue();

    const item = queue.add({
      type: 'routine_save',
      priority: 'normal',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    const retryTime = Date.now() + 5000;
    const updated = queue.update(item.id, {
      attemptCount: 1,
      lastAttemptAt: Date.now(),
      nextRetryAt: retryTime,
      error: 'Network error',
    });

    expect(updated?.attemptCount).toBe(1);
    expect(updated?.nextRetryAt).toBe(retryTime);
    expect(updated?.error).toBe('Network error');

    // Verify persistence
    const queue2 = new SyncQueue();
    const loaded = queue2.getById(item.id);
    expect(loaded?.attemptCount).toBe(1);
    expect(loaded?.nextRetryAt).toBe(retryTime);
  });

  it('should handle max retry attempts', () => {
    localStorage.clear();
    const queue = new SyncQueue();
    const MAX_RETRIES = 5;

    const item = queue.add({
      type: 'session_end',
      priority: 'high',
      payload: {},
      createdAt: Date.now(),
      attemptCount: 0,
    });

    // Simulate multiple retry attempts
    let current = item;
    for (let i = 1; i <= MAX_RETRIES; i++) {
      current = queue.update(current.id, {
        attemptCount: i,
        lastAttemptAt: Date.now(),
        nextRetryAt: Date.now() + 1000,
        error: 'Still failing',
      })!;
    }

    expect(current.attemptCount).toBe(MAX_RETRIES);

    // Update with one more attempt (should exceed max)
    const exceeded = queue.update(current.id, {
      attemptCount: MAX_RETRIES + 1,
      error: 'Max retries exceeded',
    });

    expect(exceeded?.attemptCount).toBe(MAX_RETRIES + 1);
  });
});
