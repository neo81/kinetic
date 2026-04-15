export type SyncStatus = 'idle' | 'syncing' | 'pending' | 'error' | 'degraded';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt?: number;
  lastError?: {
    message: string;
    retryAt: number;
  };
}

/**
 * Simple event emitter for sync state changes
 */
class SimpleEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

export class SyncStateManager extends SimpleEventEmitter {
  private state: SyncState = {
    status: 'idle',
    pendingCount: 0,
  };

  constructor() {
    super();
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return { ...this.state };
  }

  /**
   * Update sync status
   */
  setStatus(status: SyncStatus): void {
    if (this.state.status === status) return;

    this.state.status = status;
    this.emit('change', { ...this.state });
  }

  /**
   * Set pending count
   */
  setPendingCount(count: number): void {
    if (this.state.pendingCount === count) return;

    this.state.pendingCount = count;
    this.emit('change', { ...this.state });
  }

  /**
   * Update pending count (increment/decrement)
   */
  updatePendingCount(delta: number): void {
    this.setPendingCount(Math.max(0, this.state.pendingCount + delta));
  }

  /**
   * Mark successful sync
   */
  markSyncSuccess(): void {
    this.state.lastSyncAt = Date.now();
    this.state.lastError = undefined;

    // Update status based on pending count
    const newStatus: SyncStatus = this.state.pendingCount > 0 ? 'pending' : 'idle';
    this.setStatus(newStatus);
  }

  /**
   * Mark sync error
   */
  markSyncError(error: Error, retryAtMs: number): void {
    this.state.lastError = {
      message: error.message,
      retryAt: retryAtMs,
    };

    const newStatus: SyncStatus =
      this.state.pendingCount > 0
        ? this.state.status === 'syncing'
          ? 'error'
          : 'pending'
        : 'error';

    this.setStatus(newStatus);
  }

  /**
   * Mark as syncing
   */
  markSyncing(count: number): void {
    this.setPendingCount(count);
    this.setStatus('syncing');
  }

  /**
   * Mark as degraded (partial success)
   */
  markDegraded(message: string): void {
    this.setStatus('degraded');
    console.warn('Sync degraded:', message);
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.state.lastError = undefined;
    const newStatus: SyncStatus = this.state.pendingCount > 0 ? 'pending' : 'idle';
    this.setStatus(newStatus);
  }

  /**
   * Listen for state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.on('change', callback);
    return () => this.off('change', callback);
  }

  /**
   * Reset to idle (e.g., on logout)
   */
  reset(): void {
    this.state = {
      status: 'idle',
      pendingCount: 0,
    };
    this.emit('change', { ...this.state });
  }
}

// Singleton instance
export const syncStateManager = new SyncStateManager();
