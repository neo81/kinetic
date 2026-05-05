import type { SessionExportPayload } from '../../types';

/**
 * Validate and check the size of session payload before sending
 * This helps debug issues with large session data
 */
export function validateSessionPayload(payload: SessionExportPayload): {
  valid: boolean;
  sizeKB: number;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate structure
  if (!payload.days || !Array.isArray(payload.days)) {
    errors.push('Missing or invalid days array');
  }
  if (!payload.exercises || !Array.isArray(payload.exercises)) {
    errors.push('Missing or invalid exercises array');
  }
  if (!payload.sets || !Array.isArray(payload.sets)) {
    errors.push('Missing or invalid sets array');
  }

  // Check sizes
  const json = JSON.stringify(payload);
  const sizeKB = json.length / 1024;
  const sizeB = json.length;

  console.log(`[validateSessionPayload] Payload size: ${sizeB} bytes (${sizeKB.toFixed(2)}KB)`);

  // Warn if large
  if (sizeKB > 1024) {
    warnings.push(`Large payload: ${sizeKB.toFixed(2)}KB (> 1MB)`);
  } else if (sizeKB > 500) {
    warnings.push(`Medium-large payload: ${sizeKB.toFixed(2)}KB (> 500KB)`);
  }

  // Check item counts
  const dayCount = payload.days?.length ?? 0;
  const exerciseCount = payload.exercises?.length ?? 0;
  const setCount = payload.sets?.length ?? 0;

  console.log(
    `[validateSessionPayload] Items - Days: ${dayCount}, Exercises: ${exerciseCount}, Sets: ${setCount}`
  );

  if (setCount > 500) {
    warnings.push(`Very large session: ${setCount} sets recorded`);
  }

  return {
    valid: errors.length === 0,
    sizeKB,
    warnings,
    errors,
  };
}
