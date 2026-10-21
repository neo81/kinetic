import { describe, expect, it } from 'vitest';
import type { ActiveSession } from '../types';
import { reconcileActiveSession } from './reconcileActiveSession';

const session = (): ActiveSession => ({
  id: 'session-1', routineId: 'routine-1', routineName: 'Routine',
  routineDayIds: ['day-1'], activeRoutineDayId: 'day-1', startTimeMs: 0,
  completedExercises: [], completedDayIds: [], performanceData: {},
});
const remote = { routine_id: 'routine-1', status: 'in_progress' };

describe('active session reconciliation after a delayed status response', () => {
  it('preserves a set captured while the request was pending', async () => {
    const before = session();
    let resolve!: (value: typeof remote) => void;
    const request = new Promise<typeof remote>(done => { resolve = done; });
    const current = session();
    current.performanceData.exercise = { 1: {
      captured: true, actualReps: 8, actualWeight: 15,
      actualDurationMinutes: null, actualDurationSeconds: null,
    } };
    current.completedExercises = ['exercise'];
    resolve(remote);
    const result = reconcileActiveSession(current, before, before.id, await request, false);
    expect(result).toBe(current);
    expect(result?.performanceData.exercise[1].captured).toBe(true);
    expect(result?.completedExercises).toEqual(['exercise']);
  });

  it('does not resurrect a deliberately cleared set from an old snapshot', () => {
    const current = session();
    const stored = session();
    stored.completedExercises = ['exercise'];
    expect(reconcileActiveSession(current, stored, current.id, remote, false)).toBe(current);
  });

  it('restores the latest stored session on startup', () => {
    const stored = session();
    expect(reconcileActiveSession(null, stored, stored.id, remote, false)).toBe(stored);
  });

  it('does not resurrect a finished or cancelled local session', () => {
    expect(reconcileActiveSession(null, null, 'session-1', remote, false)).toBeNull();
  });

  it('ignores a response belonging to a previous session', () => {
    const current = { ...session(), id: 'session-2' };
    expect(reconcileActiveSession(current, current, 'session-1', null, false)).toBe(current);
    expect(reconcileActiveSession(current, session(), 'session-1', null, false)).toBe(current);
  });

  it('preserves local progress on network errors', () => {
    const current = session();
    expect(reconcileActiveSession(current, current, current.id, null, true)).toBe(current);
  });

  it.each(['completed', 'cancelled'])('clears a session confirmed as %s remotely', status => {
    const current = session();
    expect(reconcileActiveSession(current, current, current.id, { ...remote, status }, false)).toBeNull();
  });
});
