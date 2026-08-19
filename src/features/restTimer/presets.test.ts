import { describe, expect, it } from 'vitest';
import { formatRestTimerPreset, normalizeRestTimerPresets } from './presets';

describe('rest timer presets', () => {
  it('starts empty and filters invalid or duplicate values', () => {
    expect(normalizeRestTimerPresets(undefined)).toEqual([]);
    expect(normalizeRestTimerPresets([60, '150', 60, 0, 3600, 30.5])).toEqual([60, 150]);
  });

  it('keeps at most eight presets in their chosen order', () => {
    expect(normalizeRestTimerPresets([30, 60, 90, 120, 150, 180, 210, 240, 270])).toEqual([
      30, 60, 90, 120, 150, 180, 210, 240,
    ]);
  });

  it('formats durations for compact preset pills', () => {
    expect(formatRestTimerPreset(30)).toBe('0:30');
    expect(formatRestTimerPreset(150)).toBe('2:30');
  });
});
