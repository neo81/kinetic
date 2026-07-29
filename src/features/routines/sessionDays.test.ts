import { describe, expect, it } from 'vitest';
import { buildSessionDayIds } from './sessionDays';

describe('buildSessionDayIds', () => {
  it('starts on the selected weekday and leaves CORE available', () => {
    expect(buildSessionDayIds('weekday-2', 'core')).toEqual(['weekday-2', 'core']);
  });

  it('starts with only the weekday when the routine has no CORE day', () => {
    expect(buildSessionDayIds('weekday-2')).toEqual(['weekday-2']);
  });
});
