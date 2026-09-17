import { describe, expect, it } from 'vitest';
import type { ActiveSession, Routine } from '../../types';
import { exportSessionDataForRPC } from './exportSessionData';
import { applyWeightProgressionsToRoutine, deriveSessionWeightProgressions } from './weightProgression';

const buildRoutine = (): Routine => ({
  id: 'routine-1',
  name: 'Rutina',
  frequency: '1 vez / semana',
  days: [1],
  focus: 'Día 1',
  exercises: [],
  dayEntries: [{
    id: 'day-1',
    dayType: 'weekday',
    dayNumber: 1,
    title: 'Día 1',
    position: 1,
    exercises: [{
      id: 'routine-exercise-1',
      exerciseId: 'exercise-1',
      position: 1,
      exercise: {
        id: 'exercise-1',
        name: 'Press',
        muscleGroup: 'Pectorales',
        measureUnit: 'kg',
        loadType: 'external',
        sets: [1, 2, 3].map((setNumber) => ({ setNumber, reps: 12, weight: 15 })),
      },
    }],
  }],
});

const buildSession = (values: Array<[number, number]>): ActiveSession => ({
  id: 'session-1',
  routineId: 'routine-1',
  routineName: 'Rutina',
  routineDayIds: ['day-1'],
  activeRoutineDayId: 'day-1',
  startTimeMs: 0,
  completedExercises: ['routine-exercise-1'],
  completedDayIds: [],
  performanceData: {
    'routine-exercise-1': Object.fromEntries(values.map(([reps, weight], index) => [
      index + 1,
      {
        actualReps: reps,
        actualWeight: weight,
        actualDurationMinutes: null,
        actualDurationSeconds: null,
        captured: true,
      },
    ])),
  },
});

describe('session weight progression', () => {
  it('exports the routine exercise instance needed by the atomic database update', () => {
    const payload = exportSessionDataForRPC(
      buildSession([[12, 20], [11, 20], [8, 20]]),
      buildRoutine(),
    );

    expect(payload.exercises[0].routine_day_exercise_id).toBe('routine-exercise-1');
    expect(payload.sets).toHaveLength(3);
    expect(payload.sets.every(
      (set) => set.routine_day_exercise_id === 'routine-exercise-1',
    )).toBe(true);
  });

  it('raises the planned weight even when repetitions fall across completed sets', () => {
    const routine = buildRoutine();
    const progressions = deriveSessionWeightProgressions(
      buildSession([[12, 20], [11, 20], [8, 20]]),
      routine,
    );

    expect(progressions).toEqual([{
      routineDayExerciseId: 'routine-exercise-1',
      previousWeight: 15,
      newWeight: 20,
    }]);
    expect(
      applyWeightProgressionsToRoutine(routine, progressions)
        .dayEntries?.[0].exercises[0].exercise.sets.map((set) => set.weight),
    ).toEqual([20, 20, 20]);
  });

  it('does not progress an exercise when a planned set was not recorded', () => {
    expect(deriveSessionWeightProgressions(buildSession([[12, 20], [11, 20]]), buildRoutine())).toEqual([]);
  });

  it('does not progress an exercise when recorded weights are mixed', () => {
    expect(
      deriveSessionWeightProgressions(buildSession([[12, 20], [11, 20], [8, 17.5]]), buildRoutine()),
    ).toEqual([]);
  });

  it('progresses an exercise whose initial planned weight was zero', () => {
    const routine = buildRoutine();
    routine.dayEntries![0].exercises[0].exercise.sets.forEach((set) => {
      set.weight = 0;
    });

    expect(
      deriveSessionWeightProgressions(buildSession([[12, 10], [11, 10], [8, 10]]), routine),
    ).toEqual([{
      routineDayExerciseId: 'routine-exercise-1',
      previousWeight: 0,
      newWeight: 10,
    }]);
  });

  it('does not progress bodyweight exercises', () => {
    const routine = buildRoutine();
    routine.dayEntries![0].exercises[0].exercise.loadType = 'bodyweight';

    expect(
      deriveSessionWeightProgressions(buildSession([[12, 80], [11, 80], [8, 80]]), routine),
    ).toEqual([]);
  });

  it('does not overwrite a routine that changed after the progression was detected', () => {
    const routine = buildRoutine();
    const progressions = deriveSessionWeightProgressions(
      buildSession([[12, 20], [11, 20], [8, 20]]),
      routine,
    );
    routine.dayEntries![0].exercises[0].exercise.sets[0].weight = 17.5;

    expect(applyWeightProgressionsToRoutine(routine, progressions)).toBe(routine);
  });
});
