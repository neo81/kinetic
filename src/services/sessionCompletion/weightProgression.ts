import type { ActiveSession, Routine, SessionWeightProgression } from '../../types';

const allEqual = (values: number[]) => values.every((value) => value === values[0]);

/**
 * Detects conservative weight progressions from the session being completed.
 * Repetition targets may be missed, but every planned set must be recorded with
 * at least one repetition and the same higher external load.
 */
export function deriveSessionWeightProgressions(
  activeSession: ActiveSession,
  routine: Routine | null,
): SessionWeightProgression[] {
  if (!routine) return [];

  const progressions: SessionWeightProgression[] = [];

  for (const day of routine.dayEntries ?? []) {
    if (!activeSession.routineDayIds.includes(day.id)) continue;

    for (const dayExercise of day.exercises) {
      const exercise = dayExercise.exercise;
      if ((exercise.measureUnit ?? 'kg') !== 'kg' || (exercise.loadType ?? 'external') !== 'external') {
        continue;
      }

      const plannedSets = exercise.sets;
      if (plannedSets.length === 0) continue;

      const plannedWeights = plannedSets.map((set) => set.weight);
      if (
        plannedWeights.some((weight) => weight === null || !Number.isFinite(weight) || weight < 0)
        || !allEqual(plannedWeights as number[])
      ) {
        continue;
      }

      const performance = activeSession.performanceData[dayExercise.id] ?? {};
      const capturedSets = plannedSets.map((set, index) => {
        const setNumber = set.setNumber ?? index + 1;
        return performance[setNumber];
      });

      if (capturedSets.some((set) => !set?.captured)) continue;

      const actualWeights = capturedSets.map((set) => set.actualWeight);
      const hasValidRepetitions = capturedSets.every(
        (set) => set.actualReps !== null && Number.isFinite(set.actualReps) && set.actualReps > 0,
      );
      if (
        !hasValidRepetitions
        || actualWeights.some((weight) => weight === null || !Number.isFinite(weight) || weight <= 0)
        || !allEqual(actualWeights as number[])
      ) {
        continue;
      }

      const previousWeight = plannedWeights[0] as number;
      const newWeight = actualWeights[0] as number;
      if (newWeight <= previousWeight) continue;

      progressions.push({
        routineDayExerciseId: dayExercise.id,
        previousWeight,
        newWeight,
      });
    }
  }

  return progressions;
}

export function applyWeightProgressionsToRoutine(
  routine: Routine,
  progressions: SessionWeightProgression[],
): Routine {
  if (progressions.length === 0) return routine;

  const progressionByExercise = new Map(
    progressions.map((progression) => [progression.routineDayExerciseId, progression]),
  );
  let changed = false;

  const dayEntries = (routine.dayEntries ?? []).map((day) => ({
    ...day,
    exercises: day.exercises.map((dayExercise) => {
      const progression = progressionByExercise.get(dayExercise.id);
      if (!progression) return dayExercise;

      const canApply = dayExercise.exercise.sets.length > 0
        && dayExercise.exercise.sets.every((set) => set.weight === progression.previousWeight);
      if (!canApply) return dayExercise;

      changed = true;
      return {
        ...dayExercise,
        exercise: {
          ...dayExercise.exercise,
          sets: dayExercise.exercise.sets.map((set) => ({
            ...set,
            weight: progression.newWeight,
          })),
        },
      };
    }),
  }));

  if (!changed) return routine;

  return {
    ...routine,
    dayEntries,
    exercises: dayEntries.flatMap((day) => day.exercises.map((item) => item.exercise)),
    updatedAt: new Date().toISOString(),
  };
}
