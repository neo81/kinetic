import { describe, it, expect, vi } from 'vitest';
import {
  getNextRetryTime,
  isTransientError,
  isPermanentError,
  shouldRetry,
  getRetryMessage,
} from './retryStrategy';

describe('Retry Strategy - Exponential Backoff', () => {
  it('should apply exponential backoff formula correctly', () => {
    // Test the formula directly with specific attemptCounts
    const baseDelay = 500;

    // Based on formula: delay = baseDelay * Math.pow(2, Math.max(0, attemptCount - 1))
    // attemptCount 1: 500 * 2^0 = 500ms
    // attemptCount 2: 500 * 2^1 = 1000ms
    // attemptCount 3: 500 * 2^2 = 2000ms
    // attemptCount 4: 500 * 2^3 = 4000ms
    //
    // The function delays should generally follow this pattern

    // Get retry times with some time between calls to avoid timing issues
    const beforeAttempt1 = Date.now();
    const time1 = getNextRetryTime(1); // First retry after failure
    const afterAttempt1 = Date.now();

    // Delay should be roughly 500ms from when we called it (±10% jitter)
    const delay1 = Math.min(time1 - beforeAttempt1, time1 - afterAttempt1);
    expect(delay1).toBeGreaterThanOrEqual(450);
    expect(delay1).toBeLessThanOrEqual(550);

    // Get second retry time
    const beforeAttempt2 = Date.now();
    const time2 = getNextRetryTime(2); // Second retry
    const afterAttempt2 = Date.now();

    const delay2 = Math.min(time2 - beforeAttempt2, time2 - afterAttempt2);
    expect(delay2).toBeGreaterThanOrEqual(900);
    expect(delay2).toBeLessThanOrEqual(1100);

    // Verify second delay is greater than first
    expect(time2 - beforeAttempt2).toBeGreaterThan(time1 - beforeAttempt1 - 100); // Allow small variance
  });

  it('should cap retry delay at 2 minutes', () => {
    const maxDelay = 2 * 60 * 1000; // 2 minutes

    // Need high attemptCount to hit the cap
    // delay = 500 * 2^(attemptCount - 1)
    // For delay > maxDelay: 500 * 2^(attemptCount - 1) > 120000
    // 2^(attemptCount - 1) > 240 → attemptCount > 8.9
    // So we need attemptCount >= 10 to hit the cap

    const beforeAttemptHigh = Date.now();
    const timeHigh = getNextRetryTime(10); // Should hit 2 min cap
    const afterAttemptHigh = Date.now();

    const delayHigh = Math.min(timeHigh - beforeAttemptHigh, timeHigh - afterAttemptHigh);

    // Should be capped at approximately 2 minutes (±10%)
    const minExpected = maxDelay * 0.9;
    const maxExpected = maxDelay * 1.1;

    expect(delayHigh).toBeGreaterThanOrEqual(minExpected);
    expect(delayHigh).toBeLessThanOrEqual(maxExpected);
  });

  it('should add jitter to prevent thundering herd', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      times.push(getNextRetryTime(2)); // Same attempt count
    }

    const uniqueTimes = new Set(times);
    expect(uniqueTimes.size).toBeGreaterThan(1); // Not all the same due to jitter
  });
});

describe('Retry Strategy - Error Classification', () => {
  describe('isTransientError', () => {
    it('should identify network errors as transient', () => {
      const errors = [
        new Error('Network error'),
        new Error('Failed to fetch'),
        new Error('Fetch failed'),
        new Error('ECONNREFUSED'),
        new Error('ECONNRESET'),
        new Error('ENOTFOUND'),
        new Error('timeout'),
        new Error('Service unavailable'),
        new Error('503 Service Unavailable'),
        new Error('429 Too Many Requests'),
      ];

      errors.forEach(err => {
        expect(isTransientError(err)).toBe(true);
      });
    });

    it('should not classify permanent errors as transient', () => {
      const errors = [
        new Error('Unauthorized'),
        new Error('Forbidden'),
        new Error('404 Not Found'),
        new Error('Invalid payload'),
        new Error('Validation error'),
      ];

      errors.forEach(err => {
        expect(isTransientError(err)).toBe(false);
      });
    });

    it('should be case insensitive', () => {
      expect(isTransientError(new Error('NETWORK ERROR'))).toBe(true);
      expect(isTransientError(new Error('Network Error'))).toBe(true);
    });
  });

  describe('isPermanentError', () => {
    it('should identify auth errors as permanent', () => {
      const errors = [
        new Error('Unauthorized'),
        new Error('Forbidden'),
        new Error('401 Unauthorized'),
        new Error('403 Forbidden'),
      ];

      errors.forEach(err => {
        expect(isPermanentError(err)).toBe(true);
      });
    });

    it('should identify validation errors as permanent', () => {
      const errors = [
        new Error('Validation error'),
        new Error('Invalid request'),
        new Error('Parse error'),
        new Error('Syntax error'),
        new Error('404 Not Found'),
      ];

      errors.forEach(err => {
        expect(isPermanentError(err)).toBe(true);
      });
    });

    it('should not classify transient errors as permanent', () => {
      const errors = [
        new Error('Network timeout'),
        new Error('Service unavailable'),
        new Error('Connection refused'),
      ];

      errors.forEach(err => {
        expect(isPermanentError(err)).toBe(false);
      });
    });
  });

  it('should handle non-Error objects', () => {
    expect(isTransientError('string error')).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
    expect(isPermanentError({})).toBe(false);
  });
});

describe('Retry Strategy - shouldRetry', () => {
  it('should retry transient errors up to max retries', () => {
    const transientErr = new Error('Network timeout');

    expect(shouldRetry(0, transientErr, 5)).toBe(true);
    expect(shouldRetry(3, transientErr, 5)).toBe(true);
    expect(shouldRetry(5, transientErr, 5)).toBe(true);
    expect(shouldRetry(6, transientErr, 5)).toBe(false); // Exceeded max
  });

  it('should not retry permanent errors', () => {
    const permanentErr = new Error('Unauthorized');

    expect(shouldRetry(0, permanentErr, 5)).toBe(false);
    expect(shouldRetry(2, permanentErr, 5)).toBe(false);
  });

  it('should respect max retries limit', () => {
    const transientErr = new Error('Service unavailable');

    expect(shouldRetry(4, transientErr, 5)).toBe(true);
    expect(shouldRetry(5, transientErr, 5)).toBe(true);
    expect(shouldRetry(6, transientErr, 5)).toBe(false);
    expect(shouldRetry(10, transientErr, 5)).toBe(false);
  });

  it('should use default maxRetries of 5 when not specified', () => {
    const transientErr = new Error('Timeout');

    expect(shouldRetry(5, transientErr)).toBe(true);
    expect(shouldRetry(6, transientErr)).toBe(false);
  });
});

describe('Retry Strategy - User Messages', () => {
  it('should show immediate retry message for small delays', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const now = Date.now();

    const msg = getRetryMessage(1, now + 500); // 500ms from now
    expect(msg).toContain('Reintentando');
  });

  it('should show seconds message for delays under 60 seconds', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const now = Date.now();

    const msg = getRetryMessage(2, now + 30000); // 30 seconds
    expect(msg).toContain('30s');
    expect(msg).toContain('intento 2');
  });

  it('should show minutes message for delays over 60 seconds', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const now = Date.now();

    const msg = getRetryMessage(3, now + 120000); // 2 minutes
    expect(msg).toContain('min');
    expect(msg).toContain('intento 3');
  });

  it('should handle past retry times', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const now = Date.now();

    const msg = getRetryMessage(1, now - 5000); // 5 seconds in the past
    expect(msg).toContain('Reintentando');
  });
});
