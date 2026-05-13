import { syncQueue } from './SyncQueue';
import { syncProcessor } from './syncProcessor';
import type { SyncQueueItem } from './SyncQueue';

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'pending' | 'error';
  totalPending: number;
  readyToSync: number;
  lastSyncAt: number | null;
  lastError: string | null;
  lastErrorAt: number | null;
  byType: Record<string, number>;
  stats: ReturnType<typeof syncProcessor.getStats>;
}

export class SyncStatusManager {
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private lastErrorAt: number | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    const stats = syncProcessor.getStats();
    
    return {
      status: this.getStatusString(stats),
      totalPending: stats.totalPending,
      readyToSync: stats.readyToProcess,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt,
      byType: stats.byType,
      stats,
    };
  }

  /**
   * Record a successful sync
   */
  recordSyncSuccess(): void {
    this.lastSyncAt = Date.now();
    this.lastError = null;
    this.lastErrorAt = null;
    this.persistToStorage();
    this.notifyListeners();
  }

  /**
   * Record a sync error
   */
  recordSyncError(error: Error | string): void {
    this.lastError = typeof error === 'string' ? error : error.message;
    this.lastErrorAt = Date.now();
    this.persistToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current status
    listener(this.getStatus());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (err) {
        console.error('[SyncStatusManager] Error in listener:', err);
      }
    });
  }

  /**
   * Determine status string based on stats
   */
  private getStatusString(stats: ReturnType<typeof syncProcessor.getStats>): 'idle' | 'syncing' | 'pending' | 'error' {
    if (this.lastError && (!this.lastSyncAt || Date.now() - this.lastErrorAt! < 60000)) {
      return 'error';
    }
    
    if (stats.totalPending === 0) {
      return 'idle';
    }
    
    if (stats.readyToProcess > 0) {
      return 'syncing';
    }
    
    return 'pending';
  }

  /**
   * Persist status to localStorage
   */
  private persistToStorage(): void {
    try {
      const data = {
        lastSyncAt: this.lastSyncAt,
        lastError: this.lastError,
        lastErrorAt: this.lastErrorAt,
      };
      localStorage.setItem('kinetic:sync-status:v1', JSON.stringify(data));
    } catch (err) {
      console.error('[SyncStatusManager] Error persisting status:', err);
    }
  }

  /**
   * Load status from localStorage
   */
  private loadFromStorage(): void {
    try {
      // Intenta la versión actual primero
      let stored = localStorage.getItem('kinetic:sync-status:v1');
      
      // Fallback a versión anterior (para migración)
      if (!stored) {
        stored = localStorage.getItem('kinetic:sync-status');
        if (stored) {
          // Migrar a versión nueva
          localStorage.removeItem('kinetic:sync-status');
          localStorage.setItem('kinetic:sync-status:v1', stored);
        }
      }
      
      if (!stored) return;

      const data = JSON.parse(stored);
      this.lastSyncAt = data.lastSyncAt ?? null;
      this.lastError = data.lastError ?? null;
      this.lastErrorAt = data.lastErrorAt ?? null;
    } catch (err) {
      console.error('[SyncStatusManager] Error loading status:', err);
      // Limpiar datos corruptos
      localStorage.removeItem('kinetic:sync-status:v1');
      localStorage.removeItem('kinetic:sync-status');
    }
  }
}

// Singleton instance
export const syncStatusManager = new SyncStatusManager();
