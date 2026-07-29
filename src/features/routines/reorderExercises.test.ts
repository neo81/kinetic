import { describe, expect, it } from 'vitest';
import type { Routine, RoutineDayExercise } from '../../types';
import { reorderRoutineDayExercises } from './reorderExercises';

const exercise = (id: string, position: number): RoutineDayExercise => ({
  id,
  exerciseId: `definition-${id}`,
  position,
  exercise: {
    id: `definition-${id}`,
    name: id,
    muscleGroup: 'core',
    sets: [],
  },
});

const routine: Routine = {
  id: 'routine',
  name: 'Rutina',
  frequency: '1 vez / semana',
  days: [1],
  focus: 'Core',
  exercises: [],
  dayEntries: [{
    id: 'day-1',
    dayType: 'weekday',
    dayNumber: 1,
    title: 'Día 1',
    position: 1,
    exercises: [exercise('a', 1), exercise('b', 2), exercise('c', 3)],
  }],
};

describe('reorderRoutineDayExercises', () => {
  it('reorders one day and normalizes its positions', () => {
    const reordered = reorderRoutineDayExercises(routine, 'day-1', ['c', 'a', 'b']);

    expect(reordered.dayEntries?.[0].exercises.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
      { id: 'b', position: 3 },
    ]);
  });

  it('rejects incomplete or duplicated orders', () => {
    expect(() => reorderRoutineDayExercises(routine, 'day-1', ['a', 'a', 'c'])).toThrow(
      /mismos ejercicios/i,
    );
  });
});
