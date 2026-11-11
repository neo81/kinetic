import { describe, expect, it } from 'vitest';
import type { ActiveSession, Routine, RoutineDayExercise } from '../../types';
import { findSessionReturnTarget } from './sessionReturnTarget';

const exercise = (id: string, setCount = 2): RoutineDayExercise => ({
  id,
  exerciseId: id,
  position: 1,
  exercise: {
    id,
    name: id,
    muscleGroup: 'Pectorales',
    sets: Array.from({ length: setCount }, (_, index) => ({ setNumber: index + 1, reps: 10, weight: 20 })),
  },
});

const routine: Routine = {
  id: 'routine',
  name: 'Rutina',
  frequency: '',
  days: [1, 2],
  focus: '',
  exercises: [],
  dayEntries: [
    { id: 'day-1', dayType: 'weekday', dayNumber: 1, title: 'Dia 1', position: 1, exercises: [exercise('a'), exercise('b'), exercise('c')] },
    { id: 'day-2', dayType: 'weekday', dayNumber: 2, title: 'Dia 2', position: 2, exercises: [exercise('d'), exercise('e')] },
  ],
};

const capturedSet = { captured: true, actualReps: 10, actualWeight: 20, actualDurationMinutes: null, actualDurationSeconds: null };
const session = (overrides: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 'session',
  routineId: routine.id,
  routineName: routine.name,
  routineDayIds: ['day-1', 'day-2'],
  activeRoutineDayId: 'day-1',
  startTimeMs: 0,
  completedExercises: [],
  skippedExercises: [],
  completedDayIds: [],
  performanceData: {},
  ...overrides,
});

describe('session return target', () => {
  it('opens the first pending exercise in the active day', () => {
    expect(findSessionReturnTarget(routine, session())).toEqual({ dayId: 'day-1', exerciseId: 'a' });
  });

  it('prefers an exercise already in progress over an untouched one', () => {
    expect(findSessionReturnTarget(routine, session({ performanceData: { b: { 1: capturedSet } } })))
      .toEqual({ dayId: 'day-1', exerciseId: 'b' });
  });

  it('ignores skipped and fully captured exercises, even with stale completion flags', () => {
    expect(findSessionReturnTarget(routine, session({
      skippedExercises: ['a'],
      completedExercises: ['c'],
      performanceData: { b: { 1: capturedSet, 2: capturedSet } },
    }))).toEqual({ dayId: 'day-1', exerciseId: 'c' });
  });

  it('moves to another selected day when the active day has no work left', () => {
    expect(findSessionReturnTarget(routine, session({
      skippedExercises: ['a', 'c'],
      performanceData: { b: { 1: capturedSet, 2: capturedSet } },
    }))).toEqual({ dayId: 'day-2', exerciseId: 'd' });
  });

  it('wraps through selected days and never jumps to a day outside the session', () => {
    expect(findSessionReturnTarget(routine, session({
      activeRoutineDayId: 'day-2',
      skippedExercises: ['d', 'e'],
    }))).toEqual({ dayId: 'day-1', exerciseId: 'a' });
    expect(findSessionReturnTarget(routine, session({ routineDayIds: ['day-2'] })))
      .toEqual({ dayId: 'day-2', exerciseId: 'd' });
  });

  it('returns no exercise when all selected work is done or the routine does not match', () => {
    expect(findSessionReturnTarget(routine, session({ skippedExercises: ['a', 'b', 'c', 'd', 'e'] }))).toBeNull();
    expect(findSessionReturnTarget(routine, session({ routineId: 'another' }))).toBeNull();
  });
});
