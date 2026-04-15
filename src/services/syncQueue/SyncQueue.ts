/**
 * Generate a UUID using the Web Crypto API
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

export type SyncQueueItemType = 'routine_save' | 'session_end' | 'profile_update' | 'goals_update';
export type SyncQueuePriority = 'high' | 'normal';

export interface SyncQueueItem {
  id: string;                    // UUID for deduplication
  type: SyncQueueItemType;
  priority: SyncQueuePriority;   // high = sessions, normal = routines/profile
  payload: unknown;              // Operation-specific data
  createdAt: number;             // Timestamp
  attemptCount: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;          // When to retry (exponential backoff)
  error?: string;                // Last error message
}

interface SyncQueueState {
  version: number;
  items: SyncQueueItem[];
  lastPersistAt: number;
}

export class SyncQueue {
  private items: Map<string, SyncQueueItem> = new Map();
  private readonly STORAGE_KEY = 'kinetic:sync-queue';
  private readonly VERSION = 1;
  private readonly MAX_QUEUE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add an item to the queue
   */
  add(item: Omit<SyncQueueItem, 'id'>): SyncQueueItem {
    const queueItem: SyncQueueItem = {
      ...item,
      id: generateUUID(),
    };

    this.items.set(queueItem.id, queueItem);
    this.persistToStorage();
    return queueItem;
  }

  /**
   * Get all items in the queue
   */
  getAll(): SyncQueueItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items sorted by priority (high first) then by createdAt
   */
  getAllSorted(): SyncQueueItem[] {
    return this.getAll().sort((a, b) => {
      // High priority first
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      // Then by creation time (oldest first)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Get a specific item by ID
   */
  getById(id: string): SyncQueueItem | undefined {
    return this.items.get(id);
  }

  /**
   * Update an item in the queue
   */
  update(id: string, updates: Partial<SyncQueueItem>): SyncQueueItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;

    const updated: SyncQueueItem = { ...item, ...updates };
    this.items.set(id, updated);
    this.persistToStorage();
    return updated;
  }

  /**
   * Remove an item from the queue
   */
  remove(id: string): boolean {
    const deleted = this.items.delete(id);
    if (deleted) {
      this.persistToStorage();
    }
    return deleted;
  }

  /**
   * Clear all items from the queue (e.g., on logout)
   */
  clear(): void {
    this.items.clear();
    this.persistToStorage();
  }

  /**
   * Clean up stale items (older than MAX_QUEUE_LIFETIME_MS)
   */
  cleanupStaleItems(): number {
    const now = Date.now();
    const staleIds: string[] = [];

    this.items.forEach((item, id) => {
      if (now - item.createdAt > this.MAX_QUEUE_LIFETIME_MS) {
        staleIds.push(id);
      }
    });

    staleIds.forEach(id => this.items.delete(id));

    if (staleIds.length > 0) {
      this.persistToStorage();
    }

    return staleIds.length;
  }

  /**
   * Get count of pending items
   */
  getCount(): number {
    return this.items.size;
  }

  /**
   * Get count by type
   */
  getCountByType(type: SyncQueueItemType): number {
    let count = 0;
    this.items.forEach(item => {
      if (item.type === type) count++;
    });
    return count;
  }

  /**
   * Persist queue to localStorage
   */
  private persistToStorage(): void {
    try {
      const state: SyncQueueState = {
        version: this.VERSION,
        items: Array.from(this.items.values()),
        lastPersistAt: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error persisting sync queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const state: SyncQueueState = JSON.parse(stored);

      // Validate version
      if (state.version !== this.VERSION) {
        console.warn('Sync queue version mismatch, clearing');
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // Validate items
      if (!Array.isArray(state.items)) {
        console.warn('Invalid sync queue format');
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // Restore items
      state.items.forEach(item => {
        if (this.isValidQueueItem(item)) {
          this.items.set(item.id, item);
        }
      });
    } catch (error) {
      console.error('Error loading sync queue:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Validate queue item structure
   */
  private isValidQueueItem(item: unknown): item is SyncQueueItem {
    if (typeof item !== 'object' || item === null) return false;

    const obj = item as Record<string, unknown>;

    return (
      typeof obj.id === 'string' &&
      typeof obj.type === 'string' &&
      typeof obj.priority === 'string' &&
      typeof obj.createdAt === 'number' &&
      typeof obj.attemptCount === 'number'
    );
  }
}

// Singleton instance
export const syncQueue = new SyncQueue();
