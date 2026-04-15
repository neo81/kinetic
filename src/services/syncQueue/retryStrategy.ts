/**
 * Calculate the next retry time with exponential backoff + jitter
 * Retry schedule:
 * - Attempt 1: 500ms
 * - Attempt 2: 1s (2x)
 * - Attempt 3: 2s (2x)
 * - Attempt 4: 4s (2x)
 * - Attempt 5: 8s (2x)
 * - Attempt 6+: 2 min (capped)
 */
export function getNextRetryTime(attemptCount: number): number {
  const baseDelay = 500; // ms
  const maxDelay = 2 * 60 * 1000; // 2 minutes

  // Exponential delay with power of 2
  let delay = baseDelay * Math.pow(2, Math.max(0, attemptCount - 1));

  // Cap at max delay
  delay = Math.min(delay, maxDelay);

  // Add jitter (±10% of delay) to prevent thundering herd
  const jitter = (Math.random() - 0.5) * delay * 0.2;

  return Date.now() + delay + jitter;
}

/**
 * Check if an error is likely transient (retryable)
 * Transient errors: network, timeout, fetch failures
 * Permanent errors: auth, validation, not found
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Transient error patterns
    const transientPatterns = [
      'network',
      'fetch',
      'timeout',
      'offline',
      'econnrefused',
      'econnreset',
      'enotfound',
      'failed to fetch',
      'service unavailable',
      '503',
      '429', // rate limit
    ];

    return transientPatterns.some(pattern => message.includes(pattern));
  }

  return false;
}

/**
 * Check if an error is definitely permanent (non-retryable)
 */
export function isPermanentError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Permanent error patterns
    const permanentPatterns = [
      'unauthorized',
      'forbidden',
      'invalid',
      'validation error',
      'parse error',
      'syntax error',
      'not found',
      '401',
      '403',
      '404',
    ];

    return permanentPatterns.some(pattern => message.includes(pattern));
  }

  return false;
}

/**
 * Determine if an operation should be retried
 */
export function shouldRetry(
  attemptCount: number,
  error: unknown,
  maxRetries: number = 5
): boolean {
  // Max retries exceeded?
  if (attemptCount > maxRetries) {
    return false;
  }

  // Permanent error? Don't retry
  if (isPermanentError(error)) {
    return false;
  }

  // Transient error? Retry
  return isTransientError(error) || attemptCount <= maxRetries;
}

/**
 * Get a user-friendly retry message
 */
export function getRetryMessage(attemptCount: number, nextRetryAt: number): string {
  const now = Date.now();
  const delayMs = Math.max(0, nextRetryAt - now);
  const delaySec = Math.ceil(delayMs / 1000);

  if (delaySec <= 1) {
    return `Reintentando ahora...`;
  }

  if (delaySec < 60) {
    return `Reintentando en ${delaySec}s (intento ${attemptCount})`;
  }

  const delayMin = Math.ceil(delaySec / 60);
  return `Reintentando en ${delayMin}min (intento ${attemptCount})`;
}
