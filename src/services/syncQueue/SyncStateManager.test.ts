import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncStateManager, type SyncState } from './SyncStateManager';

describe('SyncStateManager - State Management', () => {
  let manager: SyncStateManager;

  beforeEach(() => {
    manager = new SyncStateManager();
  });

  it('should initialize with idle status', () => {
    const state = manager.getSyncState();
    expect(state.status).toBe('idle');
    expect(state.pendingCount).toBe(0);
  });

  it('should update status', () => {
    manager.setStatus('syncing');
    expect(manager.getSyncState().status).toBe('syncing');

    manager.setStatus('error');
    expect(manager.getSyncState().status).toBe('error');
  });

  it('should not emit change event if status is unchanged', () => {
    const listener = vi.fn();
    manager.onStateChange(listener);

    manager.setStatus('idle'); // Same as initial
    expect(listener).not.toHaveBeenCalled();

    manager.setStatus('syncing'); // Different
    expect(listener).toHaveBeenCalled();
  });

  it('should update pending count', () => {
    manager.setPendingCount(5);
    expect(manager.getSyncState().pendingCount).toBe(5);

    manager.setPendingCount(3);
    expect(manager.getSyncState().pendingCount).toBe(3);
  });

  it('should increment/decrement pending count', () => {
    manager.setPendingCount(10);

    manager.updatePendingCount(-3);
    expect(manager.getSyncState().pendingCount).toBe(7);

    manager.updatePendingCount(5);
    expect(manager.getSyncState().pendingCount).toBe(12);
  });

  it('should not allow negative pending count', () => {
    manager.setPendingCount(5);

    manager.updatePendingCount(-10);
    expect(manager.getSyncState().pendingCount).toBe(0); // Clamped to 0
  });
});

describe('SyncStateManager - Sync Success/Error', () => {
  let manager: SyncStateManager;

  beforeEach(() => {
    manager = new SyncStateManager();
  });

  it('should mark successful sync', () => {
    manager.setPendingCount(3);
    manager.setStatus('syncing');

    manager.markSyncSuccess();

    const state = manager.getSyncState();
    expect(state.lastSyncAt).toBeDefined();
    expect(state.lastError).toBeUndefined();
  });

  it('should set idle status after success with no pending items', () => {
    manager.setStatus('syncing');
    manager.setPendingCount(0);

    manager.markSyncSuccess();

    expect(manager.getSyncState().status).toBe('idle');
  });

  it('should set pending status after success with pending items', () => {
    manager.setStatus('syncing');
    manager.setPendingCount(5);

    manager.markSyncSuccess();

    expect(manager.getSyncState().status).toBe('pending');
  });

  it('should record sync error', () => {
    const error = new Error('Network timeout');
    const retryAt = Date.now() + 5000;

    manager.markSyncError(error, retryAt);

    const state = manager.getSyncState();
    expect(state.lastError).toBeDefined();
    expect(state.lastError?.message).toBe('Network timeout');
    expect(state.lastError?.retryAt).toBe(retryAt);
  });

  it('should set error status when marking sync error', () => {
    manager.setStatus('syncing');

    manager.markSyncError(new Error('Failed'), Date.now() + 1000);

    expect(manager.getSyncState().status).toBe('error');
  });

  it('should clear error', () => {
    manager.markSyncError(new Error('Test error'), Date.now() + 1000);
    expect(manager.getSyncState().lastError).toBeDefined();

    manager.clearError();
    expect(manager.getSyncState().lastError).toBeUndefined();
  });

  it('should set idle status after clearing error with no pending items', () => {
    manager.markSyncError(new Error('Test'), Date.now() + 1000);
    manager.setPendingCount(0);

    manager.clearError();

    expect(manager.getSyncState().status).toBe('idle');
  });

  it('should set pending status after clearing error with pending items', () => {
    manager.markSyncError(new Error('Test'), Date.now() + 1000);
    manager.setPendingCount(5);

    manager.clearError();

    expect(manager.getSyncState().status).toBe('pending');
  });
});

describe('SyncStateManager - Syncing Status', () => {
  let manager: SyncStateManager;

  beforeEach(() => {
    manager = new SyncStateManager();
  });

  it('should mark as syncing', () => {
    manager.markSyncing(10);

    const state = manager.getSyncState();
    expect(state.status).toBe('syncing');
    expect(state.pendingCount).toBe(10);
  });

  it('should mark as degraded', () => {
    manager.markDegraded('Partial sync completed');

    const state = manager.getSyncState();
    expect(state.status).toBe('degraded');
  });
});

describe('SyncStateManager - Event Listeners', () => {
  let manager: SyncStateManager;

  beforeEach(() => {
    manager = new SyncStateManager();
  });

  it('should notify listeners on state change', () => {
    const listener = vi.fn();
    manager.onStateChange(listener);

    manager.setStatus('syncing');

    expect(listener).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'syncing' }));
  });

  it('should allow multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    manager.onStateChange(listener1);
    manager.onStateChange(listener2);

    manager.setStatus('pending');

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should remove listener', () => {
    const listener = vi.fn();

    const unsubscribe = manager.onStateChange(listener);
    manager.setStatus('syncing');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    manager.setStatus('error');
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });

  it('should handle listener exceptions gracefully', () => {
    const goodListener = vi.fn();
    const badListener = vi.fn(() => {
      throw new Error('Listener error');
    });

    manager.onStateChange(badListener);
    manager.onStateChange(goodListener);

    // Should not throw
    expect(() => {
      manager.setStatus('syncing');
    }).not.toThrow();

    // Good listener should still be called
    expect(goodListener).toHaveBeenCalled();
  });
});

describe('SyncStateManager - Reset', () => {
  let manager: SyncStateManager;

  beforeEach(() => {
    manager = new SyncStateManager();
  });

  it('should reset to idle state', () => {
    manager.markSyncing(10);
    manager.markSyncError(new Error('Test'), Date.now() + 1000);

    manager.reset();

    const state = manager.getSyncState();
    expect(state.status).toBe('idle');
    expect(state.pendingCount).toBe(0);
    expect(state.lastError).toBeUndefined();
  });

  it('should notify listeners on reset', () => {
    const listener = vi.fn();
    manager.onStateChange(listener);

    manager.markSyncing(5);

    manager.reset();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'idle', pendingCount: 0 }));
  });
});

describe('SyncStateManager - Complex Scenarios', () => {
  let manager: SyncStateManager;

  beforeEach(() => {
    manager = new SyncStateManager();
  });

  it('should handle typical sync flow', () => {
    const stateHistory: SyncState[] = [];
    manager.onStateChange(state => stateHistory.push({ ...state }));

    // Start syncing with pending items
    manager.markSyncing(5);
    expect(stateHistory[stateHistory.length - 1].status).toBe('syncing');

    // Item processed successfully
    manager.updatePendingCount(-1);

    // All items processed
    manager.setPendingCount(0);
    manager.markSyncSuccess();
    expect(stateHistory[stateHistory.length - 1].status).toBe('idle');

    // Should have had state transitions
    expect(stateHistory.length).toBeGreaterThan(0);
  });

  it('should handle error recovery flow', () => {
    manager.markSyncing(3);
    manager.setPendingCount(2);
    manager.markSyncError(new Error('Failed'), Date.now() + 5000);

    expect(manager.getSyncState().status).toBe('error');
    expect(manager.getSyncState().lastError).toBeDefined();

    // User manually retries
    manager.clearError();
    expect(manager.getSyncState().status).toBe('pending');
    expect(manager.getSyncState().lastError).toBeUndefined();

    // Retry succeeds
    manager.setPendingCount(0);
    manager.markSyncSuccess();
    expect(manager.getSyncState().status).toBe('idle');
  });

  it('should maintain state consistency across operations', () => {
    const listener = vi.fn();
    manager.onStateChange(listener);

    // Chain operations
    manager.markSyncing(10);
    manager.updatePendingCount(-3);
    manager.updatePendingCount(-2);
    manager.updatePendingCount(-5);

    const finalState = manager.getSyncState();
    expect(finalState.pendingCount).toBe(0);
    expect(finalState.status).toBe('syncing'); // Still syncing last we know

    manager.markSyncSuccess();
    const afterSuccess = manager.getSyncState();
    expect(afterSuccess.status).toBe('idle');
  });
});
