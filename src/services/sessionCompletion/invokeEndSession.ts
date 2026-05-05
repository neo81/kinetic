import { supabase } from '../../lib/supabase/client';
import type { Json } from '../../lib/supabase/database.types';
import { validateSessionPayload } from './validateSessionPayload';

type InvokeEndSessionInput = {
  sessionId: string;
  endedAt: string;
  sessionData: Json;
};

export async function invokeEndSession(input: InvokeEndSessionInput): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  // Validate input
  if (!input.sessionId || !input.endedAt || !input.sessionData) {
    throw new Error('Invalid session end input: missing required fields');
  }

  // Validate session payload structure and size
  if (input.sessionData && typeof input.sessionData === 'object') {
    const validation = validateSessionPayload(input.sessionData as any);
    if (!validation.valid) {
      console.error('[invokeEndSession] Validation errors:', validation.errors);
      throw new Error(`Invalid session data: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.warn('[invokeEndSession] Validation warnings:', validation.warnings);
    }
  }

  // Log session size for debugging large sessions
  const payloadSize = JSON.stringify(input).length;
  console.log(`[invokeEndSession] Session ${input.sessionId} payload size: ${(payloadSize / 1024).toFixed(2)}KB`);

  try {
    // Add explicit timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout (server has 60s)

    const { error, data } = await supabase.functions.invoke('end-session', {
      body: input,
    });

    clearTimeout(timeoutId);

    if (error) {
      console.error(`[invokeEndSession] Function error for session ${input.sessionId}:`, error);
      throw error;
    }

    console.log(`[invokeEndSession] Successfully ended session ${input.sessionId}`, data);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error(`[invokeEndSession] Timeout invoking end-session for session ${input.sessionId}`);
      throw new Error('Session end request timed out - will be retried');
    }
    throw err;
  }
}
