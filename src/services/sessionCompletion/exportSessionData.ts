import type { ActiveSession, Routine, SessionExportPayload } from '../../types';

/**
 * Export session data in format required by end_session_transaction RPC
 * This prepares the JSONB payload with all session metadata and performance data
 */
export function exportSessionDataForRPC(
  activeSession: ActiveSession,
  routine: Routine | null
): SessionExportPayload {
  if (!routine) {
    return {
      days: [],
      exercises: [],
      sets: []
    };
  }

  const days: SessionExportPayload['days'] = [];
  const exercises: SessionExportPayload['exercises'] = [];
  const sets: SessionExportPayload['sets'] = [];

  // Process each day in the session
  for (const dayId of activeSession.routineDayIds) {
    const day = routine.dayEntries?.find(d => d.id === dayId);
    if (!day) continue;

    const capturedInDay = day.exercises.filter((exercise) => {
      const exercisePerformance = activeSession.performanceData[exercise.id];
      return !!exercisePerformance && Object.values(exercisePerformance).some((set) => set?.captured);
    });

    // Only add day if at least one set was captured in this day
    if (capturedInDay.length > 0) {
      days.push({
        routine_day_id: dayId
      });

      // Process each exercise with captured progress in this day
      for (const exDef of capturedInDay) {
        const exercisePerformance = activeSession.performanceData[exDef.id] || {};

        exercises.push({
          exercise_id: exDef.exerciseId,
          routine_day_id: dayId,
          position: exDef.position,
          notes: exDef.notes ?? exDef.exercise.notes ?? null,
        });

        // Process sets for this exercise
        if (exDef.exercise.sets && Array.isArray(exDef.exercise.sets)) {
          exDef.exercise.sets.forEach((plannedSet, index) => {
            const setNumber = plannedSet.setNumber || index + 1;
            const performanceForSet = exercisePerformance[setNumber];
            if (!performanceForSet?.captured) {
              return;
            }

            const actualReps = performanceForSet.actualReps;
            const actualWeight = performanceForSet.actualWeight;
            const actualDurationMinutes = performanceForSet.actualDurationMinutes;
            const actualDurationSeconds = performanceForSet.actualDurationSeconds;

            sets.push({
              exercise_id: exDef.exerciseId,
              exercise_position: exDef.position,
              routine_day_id: dayId,
              set_number: setNumber,
              planned_reps: plannedSet.reps ?? null,
              planned_weight: plannedSet.weight ?? null,
              planned_duration_minutes: plannedSet.durationMinutes ?? null,
              actual_reps: actualReps,
              actual_weight: actualWeight,
              actual_duration_minutes: actualDurationMinutes,
              actual_duration_seconds: actualDurationSeconds
            });
          });
        }
      }
    }
  }

  return {
    days,
    exercises,
    sets
  };
}
