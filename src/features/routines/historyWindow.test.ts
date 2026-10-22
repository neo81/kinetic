import { describe, expect, it } from 'vitest';
import { dashboardHistoryStart } from './historyWindow';

describe('dashboard history window', () => {
  it('includes the previous Sunday and excludes older sessions', () => {
    const start = dashboardHistoryStart(new Date(2026, 9, 22, 15));
    expect(start).toEqual(new Date(2026, 9, 11));
  });

  it('keeps the same Sunday boundary as the existing weekly calculation', () => {
    expect(dashboardHistoryStart(new Date(2026, 9, 18, 9))).toEqual(new Date(2026, 9, 11));
    expect(dashboardHistoryStart(new Date(2026, 9, 17, 23))).toEqual(new Date(2026, 9, 4));
  });
});
