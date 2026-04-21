import { syncProcessor } from './syncProcessor';
import { routinesRepository } from '../../features/routines/repository';
import type { SyncQueueItem } from './SyncQueue';
import { supabase } from '../../lib/supabase/client';
import type { Json } from '../../lib/supabase/database.types';

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

  // Handler for session end operations (using RPC transaction)
  syncProcessor.registerHandler('session_end', async (item: SyncQueueItem) => {
    if (!item.payload || typeof item.payload !== 'object') {
      throw new Error('Invalid session end payload');
    }

    if (!supabase) {
      throw new Error('Supabase not available');
    }

    const payload = item.payload as any;
    const { sessionId, endedAt, sessionData } = payload;

    if (!sessionId || !endedAt || !sessionData) {
      throw new Error('Invalid session end payload structure');
    }

    // Call the atomic RPC transaction
    const { error: rpcError } = await supabase.rpc('end_session_transaction', {
      p_session_id: sessionId,
      p_ended_at: endedAt,
      p_session_data: sessionData as unknown as Json,
    });

    if (rpcError) {
      throw rpcError;
    }

    console.log('[setupSyncHandlers] Session end completed via RPC:', sessionId);
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
