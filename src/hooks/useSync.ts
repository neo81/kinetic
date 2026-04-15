import { useEffect } from 'react';
import { syncProcessor } from '../services/syncQueue';
import { setupSyncHandlers } from '../services/syncQueue/setupSyncHandlers';

/**
 * Hook to start and manage the sync processor
 * Should be called once in AppRoot or a top-level component
 */
export function useSync() {
  useEffect(() => {
    // Setup handlers first (only done once)
    setupSyncHandlers();

    // Start sync processor on mount
    syncProcessor.start();

    // Handle app regain focus: trigger sync attempt
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[useSync] App regained focus, triggering sync');
        syncProcessor.triggerManualSync().catch(err =>
          console.error('[useSync] Error in focus sync:', err)
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[useSync] Network online, triggering sync');
      syncProcessor.triggerManualSync().catch(err =>
        console.error('[useSync] Error in online sync:', err)
      );
    };

    window.addEventListener('online', handleOnline);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      syncProcessor.stop();
    };
  }, []);
}
