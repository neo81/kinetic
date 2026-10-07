import { describe, expect, it } from 'vitest';
import type { Routine } from '../types';
import { buildRoutineExportPayload, type RoutineExportExercise } from './routineExport';
import { resolveImportedExerciseNote } from './routineImport';

const exportExercise = (overrides: Partial<RoutineExportExercise> = {}): RoutineExportExercise => ({
  _exportId: 'exercise-1',
  position: 1,
  restSeconds: null,
  notes: null,
  measureUnit: 'kg',
  loadType: 'external',
  exerciseRef: {
    globalId: 'catalog-1',
    name: 'Remo',
    muscleGroupCode: 'dorsales',
    isCustom: false,
  },
  sets: [],
  ...overrides,
});

describe('routine exercise notes', () => {
  it('prefers the canonical exercise note over legacy set notes', () => {
    const note = resolveImportedExerciseNote(exportExercise({
      notes: 'Polea nivel 6',
      sets: [{
        setNumber: 1,
        reps: 12,
        weight: 20,
        durationMinutes: null,
        durationSeconds: null,
        notes: 'Nota antigua',
        targetType: 'fixed_reps',
      }],
    }));

    expect(note).toBe('Polea nivel 6');
  });

  it('recovers the first non-empty note from an old export', () => {
    const note = resolveImportedExerciseNote(exportExercise({
      sets: [
        {
          setNumber: 1,
          reps: 12,
          weight: 20,
          durationMinutes: null,
          durationSeconds: null,
          notes: '  ',
          targetType: 'fixed_reps',
        },
        {
          setNumber: 2,
          reps: 12,
          weight: 20,
          durationMinutes: null,
          durationSeconds: null,
          notes: 'Ajustar banco',
          targetType: 'fixed_reps',
        },
      ],
    }));

    expect(note).toBe('Ajustar banco');
  });

  it('exports the note once at exercise level', () => {
    const routine: Routine = {
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
          id: 'instance-1',
          exerciseId: 'catalog-1',
          position: 1,
          notes: 'Polea nivel 6',
          exercise: {
            id: 'catalog-1',
            name: 'Remo',
            muscleGroup: 'Dorsales',
            sets: [{ reps: 12, weight: 20 }],
          },
        }],
      }],
    };

    const exercise = buildRoutineExportPayload(routine).routine.days[0].exercises[0];

    expect(exercise.notes).toBe('Polea nivel 6');
    expect(exercise.sets[0]).not.toHaveProperty('notes');
  });
});
