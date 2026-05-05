import { syncProcessor } from './syncProcessor';
import { syncStatusManager } from './SyncStatusManager';
import { routinesRepository } from '../../features/routines/repository';
import type { SyncQueueItem } from './SyncQueue';
import type { Json } from '../../lib/supabase/database.types';
import { invokeEndSession } from '../sessionCompletion/invokeEndSession';

/**
 * Register all sync handlers with the sync processor
 * Should be called once when the app initializes
 */
export function setupSyncHandlers() {
  console.log('[setupSyncHandlers] Registering sync handlers...');

  // Handler for routine save operations
  syncProcessor.registerHandler('routine_save', async (item: SyncQueueItem) => {
    if (!item.payload || typeof item.payload !== 'object') {
      throw new Error('Invalid routine save payload');
    }

    const payload = item.payload as any;
    await routinesRepository.handleRoutineSaveSync(payload);
  });

  // Handler for session end operations via secured Edge Function
  syncProcessor.registerHandler('session_end', async (item: SyncQueueItem) => {
    if (!item.payload || typeof item.payload !== 'object') {
      throw new Error('Invalid session end payload');
    }

    const payload = item.payload as any;
    const { sessionId, endedAt, sessionData } = payload;

    if (!sessionId || !endedAt || !sessionData) {
      throw new Error('Invalid session end payload structure');
    }

    await invokeEndSession({
      sessionId,
      endedAt,
      sessionData: sessionData as unknown as Json,
    });

    console.log('[setupSyncHandlers] Session end completed via Edge Function:', sessionId);
  });

  // Handler for goals update operations
  syncProcessor.registerHandler('goals_update', async (item: SyncQueueItem) => {
    if (!item.payload || typeof item.payload !== 'object') {
      throw new Error('Invalid goals update payload');
    }

    const payload = item.payload as any;
    await routinesRepository.handleGoalsUpdateSync(payload);
  });

  // Handler for profile update operations
  syncProcessor.registerHandler('profile_update', async (item: SyncQueueItem) => {
    if (!item.payload || typeof item.payload !== 'object') {
      throw new Error('Invalid profile update payload');
    }

    const payload = item.payload as any;
    await routinesRepository.handleProfileUpdateSync(payload);
  });

  console.log('[setupSyncHandlers] Sync handlers registered successfully');
}
