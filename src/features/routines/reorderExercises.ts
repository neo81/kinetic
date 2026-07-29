import type { Routine } from '../../types';

export const reorderRoutineDayExercises = (
  routine: Routine,
  dayId: string,
  orderedExerciseIds: string[],
): Routine => {
  const day = routine.dayEntries?.find((entry) => entry.id === dayId);
  if (!day) {
    throw new Error('Día de rutina no encontrado.');
  }

  const currentIds = day.exercises.map((exercise) => exercise.id);
  const hasSameIds =
    currentIds.length === orderedExerciseIds.length
    && new Set(orderedExerciseIds).size === orderedExerciseIds.length
    && currentIds.every((id) => orderedExerciseIds.includes(id));

  if (!hasSameIds) {
    throw new Error('El nuevo orden no contiene los mismos ejercicios del día.');
  }

  const exerciseById = new Map(day.exercises.map((exercise) => [exercise.id, exercise]));
  const reorderedExercises = orderedExerciseIds.map((id, index) => ({
    ...exerciseById.get(id)!,
    position: index + 1,
  }));

  return {
    ...routine,
    updatedAt: new Date().toISOString(),
    dayEntries: routine.dayEntries?.map((entry) => (
      entry.id === dayId
        ? { ...entry, exercises: reorderedExercises }
        : entry
    )),
  };
};
