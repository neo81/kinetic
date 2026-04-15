import { syncQueue, SyncQueueItem } from './SyncQueue';
import { syncStateManager } from './SyncStateManager';
import { getNextRetryTime, isTransientError, shouldRetry } from './retryStrategy';

export interface SyncResult {
  itemId: string;
  success: boolean;
  error?: Error;
}

export type SyncHandler = (item: SyncQueueItem) => Promise<void>;

export class SyncProcessor {
  private isProcessing = false;
  private processingLoop: NodeJS.Timeout | null = null;
  private handlers: Map<string, SyncHandler> = new Map();
  private readonly PROCESS_INTERVAL_MS = 30 * 1000; // 30 seconds
  private readonly MAX_RETRIES = 5;

  constructor() {}

  /**
   * Register a handler for a specific queue item type
   */
  registerHandler(type: string, handler: SyncHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Start the sync processor
   */
  start(): void {
    if (this.processingLoop) return;

    console.log('[SyncProcessor] Starting sync processor');

    // Process immediately on start
    this.processQueue().catch(err => console.error('Error in initial sync:', err));

    // Then set up interval
    this.processingLoop = setInterval(() => {
      this.processQueue().catch(err => console.error('Error in sync loop:', err));
    }, this.PROCESS_INTERVAL_MS);
  }

  /**
   * Stop the sync processor
   */
  stop(): void {
    if (!this.processingLoop) return;

    console.log('[SyncProcessor] Stopping sync processor');
    clearInterval(this.processingLoop);
    this.processingLoop = null;
  }

  /**
   * Process all items in the queue
   */
  async processQueue(): Promise<SyncResult[]> {
    if (this.isProcessing) return [];

    this.isProcessing = true;

    try {
      // Clean up stale items first
      const staleCount = syncQueue.cleanupStaleItems();
      if (staleCount > 0) {
        console.log(`[SyncProcessor] Cleaned ${staleCount} stale items`);
      }

      // Get all items sorted by priority
      const allItems = syncQueue.getAllSorted();

      if (allItems.length === 0) {
        syncStateManager.setStatus('idle');
        return [];
      }

      // Find items that are ready to retry (nextRetryAt <= now)
      const readyItems = allItems.filter(item => {
        if (!item.nextRetryAt) return true; // First attempt
        return item.nextRetryAt <= Date.now();
      });

      if (readyItems.length === 0) {
        syncStateManager.setPendingCount(allItems.length);
        syncStateManager.setStatus('pending');
        return [];
      }

      // Process ready items
      syncStateManager.markSyncing(allItems.length);

      const results: SyncResult[] = [];

      for (const item of readyItems) {
        const result = await this.processSingleItem(item);
        results.push(result);
      }

      // Update state based on results
      const updatedItems = syncQueue.getAllSorted();
      syncStateManager.setPendingCount(updatedItems.length);

      if (updatedItems.length > 0) {
        syncStateManager.setStatus('pending');
      } else {
        syncStateManager.markSyncSuccess();
      }

      return results;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single item
   */
  async processSingleItem(item: SyncQueueItem): Promise<SyncResult> {
    console.log(
      `[SyncProcessor] Processing ${item.type} (attempt ${item.attemptCount}/${this.MAX_RETRIES})`,
      item.id
    );

    // Get handler for this item type
    const handler = this.handlers.get(item.type);
    if (!handler) {
      console.error(`[SyncProcessor] No handler registered for type: ${item.type}`);
      syncQueue.remove(item.id);
      return {
        itemId: item.id,
        success: false,
        error: new Error(`No handler for type: ${item.type}`),
      };
    }

    try {
      // Call the handler
      await handler(item);

      // Success - remove from queue
      console.log(`[SyncProcessor] Successfully synced ${item.type}`, item.id);
      syncQueue.remove(item.id);
      syncStateManager.markSyncSuccess();

      return { itemId: item.id, success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[SyncProcessor] Failed to sync ${item.type}:`,
        err.message,
        item.id
      );

      // Decide if we should retry
      const shouldRetryOp = shouldRetry(item.attemptCount, err, this.MAX_RETRIES);

      if (shouldRetryOp) {
        // Calculate next retry time
        const nextRetryAt = getNextRetryTime(item.attemptCount);

        // Update item with retry info
        syncQueue.update(item.id, {
          attemptCount: item.attemptCount + 1,
          lastAttemptAt: Date.now(),
          nextRetryAt,
          error: err.message,
        });

        syncStateManager.markSyncError(err, nextRetryAt);
      } else {
        // Permanent failure or max retries exceeded
        console.error(`[SyncProcessor] Giving up on ${item.type} after ${item.attemptCount} attempts`);

        syncQueue.update(item.id, {
          error: `Failed after ${item.attemptCount} attempts: ${err.message}`,
        });

        // Remove if permanent error, keep if max retries (user can see it)
        if (item.attemptCount >= this.MAX_RETRIES && isTransientError(err)) {
          // Keep it in queue so user sees it and can manually retry
        } else {
          syncQueue.remove(item.id);
        }

        syncStateManager.markSyncError(err, Date.now());
      }

      return { itemId: item.id, success: false, error: err };
    }
  }

  /**
   * Manually trigger a sync (e.g., when user regains focus)
   */
  async triggerManualSync(): Promise<SyncResult[]> {
    console.log('[SyncProcessor] Manual sync triggered');
    return this.processQueue();
  }

  /**
   * Get current stats
   */
  getStats() {
    const allItems = syncQueue.getAll();
    return {
      totalPending: allItems.length,
      readyToProcess: allItems.filter(
        item => !item.nextRetryAt || item.nextRetryAt <= Date.now()
      ).length,
      byPriority: {
        high: allItems.filter(item => item.priority === 'high').length,
        normal: allItems.filter(item => item.priority === 'normal').length,
      },
      byType: {
        routine_save: syncQueue.getCountByType('routine_save'),
        session_end: syncQueue.getCountByType('session_end'),
        profile_update: syncQueue.getCountByType('profile_update'),
        goals_update: syncQueue.getCountByType('goals_update'),
      },
    };
  }
}

// Singleton instance
export const syncProcessor = new SyncProcessor();
