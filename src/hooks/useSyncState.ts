import { useEffect, useState } from 'react';
import { syncStateManager, type SyncState } from '../services/syncQueue/SyncStateManager';

/**
 * React hook to consume sync state changes from the SyncStateManager
 * Automatically subscribes to state changes and updates the component
 */
export function useSyncState(): SyncState {
  const [syncState, setSyncState] = useState<SyncState>(syncStateManager.getSyncState());

  useEffect(() => {
    // Set initial state
    setSyncState(syncStateManager.getSyncState());

    // Subscribe to state changes
    const unsubscribe = syncStateManager.onStateChange((newState: SyncState) => {
      setSyncState(newState);
    });

    return unsubscribe;
  }, []);

  return syncState;
}
