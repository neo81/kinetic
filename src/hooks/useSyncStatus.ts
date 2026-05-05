import { useEffect, useState } from 'react';
import { syncStatusManager, type SyncStatus } from '../services/syncQueue/SyncStatusManager';
import { syncProcessor } from '../services/syncQueue';

/**
 * Hook to subscribe to sync status changes and trigger manual sync
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => syncStatusManager.getStatus());

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = syncStatusManager.subscribe(setStatus);

    return unsubscribe;
  }, []);

  /**
   * Manually trigger a sync (for manual retry)
   */
  const triggerManualSync = async () => {
    console.log('[useSyncStatus] Manual sync triggered by user');
    try {
      await syncProcessor.triggerManualSync();
      syncStatusManager.recordSyncSuccess();
    } catch (error) {
      console.error('[useSyncStatus] Manual sync error:', error);
      syncStatusManager.recordSyncError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    status,
    triggerManualSync,
    isPending: status.totalPending > 0,
    isSyncing: status.status === 'syncing',
    hasError: status.status === 'error',
  };
}
