import { supabase } from '../../lib/supabase/client';
import type { Json } from '../../lib/supabase/database.types';
import { validateSessionPayload } from './validateSessionPayload';

type InvokeEndSessionInput = {
  sessionId: string;
  endedAt: string;
  sessionData: Json;
};

/**
 * Invoke the end-session Edge Function with retry logic
 * Optimized for iOS PWA which may have slower/intermittent connections
 */
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
  const payloadSizeKB = (payloadSize / 1024).toFixed(2);
  console.log(`[invokeEndSession] Session ${input.sessionId} payload size: ${payloadSizeKB}KB`);

  // Retry configuration for iOS (3 attempts with increasing delays)
  const maxRetries = 3;
  const retryDelays = [1000, 3000, 5000]; // ms between retries

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Longer timeout for iOS PWA (60s, server has 300s)
      const timeoutMs = 65000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(
        `[invokeEndSession] Attempt ${attempt + 1}/${maxRetries + 1} - invoking end-session (${payloadSizeKB}KB)`
      );

      const { error, data } = await supabase.functions.invoke('end-session', {
        body: input,
      });

      clearTimeout(timeoutId);

      if (error) {
        const errorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
        console.error(`[invokeEndSession] Function error (attempt ${attempt + 1}):`, errorMsg);

        // Check if error is retryable
        const isRetryable = 
          errorMsg.includes('Failed to send') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('503') ||
          errorMsg.includes('429');

        if (isRetryable && attempt < maxRetries) {
          const delay = retryDelays[attempt];
          console.log(`[invokeEndSession] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }

        throw error;
      }

      console.log(`[invokeEndSession] ✓ Successfully ended session ${input.sessionId} on attempt ${attempt + 1}`, data);
      return; // Success!
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error(
          `[invokeEndSession] Timeout (${65000}ms) on attempt ${attempt + 1}/${maxRetries + 1}`
        );
        
        if (attempt < maxRetries) {
          const delay = retryDelays[attempt];
          console.log(`[invokeEndSession] Retrying after timeout in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error('Session end request timed out after all retries - will be queued');
      }

      // For other errors, only retry if it looks transient
      const errMsg = err instanceof Error ? err.message : String(err);
      const isTransient = 
        errMsg.includes('Failed to send') ||
        errMsg.includes('Network') ||
        errMsg.includes('503') ||
        errMsg.includes('429');

      if (isTransient && attempt < maxRetries) {
        const delay = retryDelays[attempt];
        console.log(`[invokeEndSession] Transient error, retrying in ${delay}ms...`, errMsg);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Final attempt failed
      if (attempt === maxRetries) {
        console.error(`[invokeEndSession] All ${maxRetries + 1} attempts failed:`, errMsg);
        throw new Error(`Failed to invoke end-session after ${maxRetries + 1} attempts: ${errMsg}`);
      }

      throw err;
    }
  }
}
