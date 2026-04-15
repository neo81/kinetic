import type { ActiveSession, Routine } from '../../types';

/**
 * Export session data in format required by end_session_transaction RPC
 * This prepares the JSONB payload with all session metadata and performance data
 */
export function exportSessionDataForRPC(
  activeSession: ActiveSession,
  routine: Routine | null
): Record<string, any> {
  if (!routine) {
    return {
      days: [],
      exercises: [],
      sets: []
    };
  }

  const days: any[] = [];
  const exercises: any[] = [];
  const sets: any[] = [];

  // Process each day in the session
  for (const dayId of activeSession.routineDayIds) {
    const day = routine.dayEntries?.find(d => d.id === dayId);
    if (!day) continue;

    // Find exercises completed in this day
    const completedInDay = activeSession.completedExercises.filter(exId =>
      day.exercises.some(e => e.id === exId)
    );

    // Only add day if exercises were completed
    if (completedInDay.length > 0) {
      days.push({
        routine_day_id: dayId
      });

      // Process each completed exercise in this day
      for (const exerciseInstanceId of completedInDay) {
        const exDef = day.exercises.find(e => e.id === exerciseInstanceId);
        if (!exDef) continue;

        exercises.push({
          exercise_id: exDef.exerciseId,
          day_log_id: dayId  // Link to day
        });

        // Process sets for this exercise
        if (exDef.exercise.sets && Array.isArray(exDef.exercise.sets)) {
          exDef.exercise.sets.forEach((plannedSet, index) => {
            const setNumber = plannedSet.setNumber || index + 1;
            const performanceForSet = activeSession.performanceData[exDef.id]?.[setNumber];

            // Use captured performance data if available, otherwise fallback to planned
            const actualReps = performanceForSet?.captured ? performanceForSet.actualReps : null;
            const actualWeight = performanceForSet?.captured ? performanceForSet.actualWeight : null;
            const actualDurationMinutes = performanceForSet?.captured ? performanceForSet.actualDurationMinutes : null;
            const actualDurationSeconds = performanceForSet?.captured ? performanceForSet.actualDurationSeconds : null;

            sets.push({
              set_number: setNumber,
              planned_reps: plannedSet.reps || 0,
              planned_weight: plannedSet.weight || 0,
              planned_duration_minutes: plannedSet.durationMinutes || 0,
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
